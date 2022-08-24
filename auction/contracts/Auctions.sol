// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

// Import this file to use console.log
import "hardhat/console.sol";

/**
 * @title Auction
 * @dev Allow auctions to be created and receive offers;
 *      Allow potential buyers to make offers;
 *      Allow potential buyers to outbid their own offers by only sending the remaining ether;
 *      Allow an auction to be canceled and refund the bidders; and
 *      Execute the trade and transfer the funds after the end of the auction.
 */
contract Auctions {
    struct Auction {
        uint id;
        uint auctionEnd;
        uint bestOfferId;
        uint minimumOfferPrice;
        uint[] offerIds;
        string name;
        string description;
        address seller;
        bool isCanceled;
    }
    struct Offer {
        uint id;
        uint auctionId;
        uint offerPrice;
        address buyer;
    }

    uint private nextAuctionId = 1;
    uint private nextOfferId = 1;

    mapping(uint => Auction) public auctions;
    mapping(uint => Offer) public offers;
    mapping(address => uint[]) public sellerAuctions;
    mapping(address => uint[]) public buyerOffers;

    event CreateAuction(
        uint indexed auctionId,
        string indexed auctionName,
        address indexed seller
    );
    event CancelAuction(uint indexed auctionId, address indexed seller);
    event CreateOffer(
        uint indexed offerId,
        uint indexed auctionId,
        uint bidAmount,
        uint totalBidAmount,
        address indexed buyer
    );
    event Trade(uint indexed auctionId, uint indexed bestOfferId);
    event Transfer(address indexed recipient, uint amount);

    /**
     * @dev Check if an auction exists, revert otherwise
     * @param auctionId number value for the auction identifier
     */
    modifier auctionExists(uint auctionId) {
        require(auctions[auctionId].id == auctionId, "Auction not found");
        _;
    }

    /**
     * @dev Check if an auction has not been canceled, revert otherwise
     * @param auctionId number value for the auction identifier
     */
    modifier auctionIsNotCancelled(uint auctionId) {
        require(
            auctions[auctionId].isCanceled == false,
            "Auction is already canceled"
        );
        _;
    }

    /**
     * @dev Create a new auction
     * @param name string value for the name of the auction
     * @param description string value for detailed information about this auction
     * @param minimumOfferPrice number value for the minimum bid accepted by this auction
     * @param duration number value for how many days this auction will accept bids (1-30 days)
     */
    function createAuction(
        string calldata name,
        string calldata description,
        uint minimumOfferPrice,
        uint duration
    ) external {
        require(
            duration >= 1 days && duration <= 30 days,
            "Duration should be between 1 to 30 days"
        );

        // arrays need to be initialized when empty
        uint[] memory offerIds = new uint[](0);

        auctions[nextAuctionId] = Auction({
            id: nextAuctionId,
            auctionEnd: block.timestamp + duration,
            bestOfferId: 0,
            minimumOfferPrice: minimumOfferPrice,
            offerIds: offerIds,
            name: name,
            description: description,
            seller: msg.sender,
            isCanceled: false
        });

        sellerAuctions[msg.sender].push(nextAuctionId);

        emit CreateAuction(nextAuctionId, name, msg.sender);

        nextAuctionId++;
    }

    /**
     * @dev Cancel an existing auction and refund any offers already made
     * @param auctionId number value for the auction identifier
     */
    function cancelAuction(uint auctionId)
        external
        auctionIsNotCancelled(auctionId)
    {
        require(
            auctions[auctionId].seller == msg.sender,
            "Only the seller can cancel an auction"
        );

        Auction storage auction = auctions[auctionId];

        // Check if auction is active
        require(
            block.timestamp < auction.auctionEnd,
            "Auction has already ended"
        );

        // Loop through all the offers
        for (uint i = 0; i < auction.offerIds.length; i++) {
            uint currentOfferId = auction.offerIds[i];

            // Refund bid for each offer
            (bool sentOfferPrice, bytes memory dataOfferPrice) = payable(
                offers[currentOfferId].buyer
            ).call{value: offers[currentOfferId].offerPrice}("");

            require(sentOfferPrice, "Failed to send Ether");
            emit Transfer(
                offers[currentOfferId].buyer,
                offers[currentOfferId].offerPrice
            );
        }

        auction.isCanceled = true;
        emit CancelAuction(auctionId, msg.sender);
    }

    /**
     * @dev Create a new offer for an existing auction (send bid value via msg.value)
     * @param auctionId number value for the auction identifier
     */
    function createOffer(uint auctionId)
        external
        payable
        auctionExists(auctionId)
        auctionIsNotCancelled(auctionId)
    {
        Auction storage auction = auctions[auctionId];

        require(
            msg.value >= auction.minimumOfferPrice,
            "Bid should be greater than the minimum offer price"
        );

        require(block.timestamp < auction.auctionEnd, "Auction has expired");

        // Retrieve the best offer
        Offer memory bestOffer = offers[auction.bestOfferId];

        // Take into account previous bids from this buyer so they can add up
        // to the new (higher) bid
        Offer[] memory auctionOffers = getAllAuctionOffers(auctionId);
        uint offerPrice = msg.value;

        for (uint i = 0; i < auctionOffers.length; i++) {
            if (auctionOffers[i].buyer == msg.sender) {
                offerPrice += auctionOffers[i].offerPrice;
            }
        }

        require(
            offerPrice > bestOffer.offerPrice,
            "Bid should be greater than the current best offer"
        );

        offers[nextOfferId] = Offer({
            id: nextOfferId,
            auctionId: auctionId,
            offerPrice: offerPrice,
            buyer: msg.sender
        });

        // Update auction with the new best offer
        auction.bestOfferId = nextOfferId;

        auction.offerIds.push(nextOfferId);

        buyerOffers[msg.sender].push(nextOfferId);

        emit CreateOffer(nextOfferId, auctionId, msg.value, offerPrice, msg.sender);

        nextOfferId++;
    }

    /**
     * @dev Execute the trade after the auction has ended, transfer the best bid
     *      to the seller and refund the other bidders
     * @param auctionId number value for the auction identifier
     */
    function trade(uint auctionId)
        external
        auctionExists(auctionId)
        auctionIsNotCancelled(auctionId)
    {
        Auction storage auction = auctions[auctionId];

        // Check if auction is active
        require(
            block.timestamp > auction.auctionEnd,
            "Auction is still active"
        );

        // Retrieve the best offer
        Offer memory bestOffer = offers[auction.bestOfferId];

        // Loop through all the offers
        for (uint i = 0; i < auction.offerIds.length; i++) {
            uint currentOfferId = auction.offerIds[i];

            Offer memory currentOffer = offers[currentOfferId];

            // Refund bid for each offer except the winning offer
            if (currentOfferId != bestOffer.id) {
                (bool sentOfferPrice, bytes memory dataOfferPrice) = payable(
                    currentOffer.buyer
                ).call{value: currentOffer.offerPrice}("");

                require(sentOfferPrice, "Failed to send Ether");
                emit Transfer(currentOffer.buyer, currentOffer.offerPrice);
            }
        }

        // Send winning offer to the seller
        (bool sent, bytes memory data) = payable(auction.seller).call{
            value: bestOffer.offerPrice
        }("");

        require(sent, "Failed to send Ether");

        emit Transfer(auction.seller, bestOffer.offerPrice);
        emit Trade(auctionId, bestOffer.id);
    }

    /**
     * @dev Retrieve all auctions
     */
    function getAllAuctions() external view returns (Auction[] memory) {
        uint auctionArrayLength = nextAuctionId - 1;

        // create an in-memory fixed-sized array to hold the auctions
        Auction[] memory _auctions = new Auction[](auctionArrayLength);

        for (uint i = 0; i < auctionArrayLength; i++) {
            _auctions[i] = auctions[i + 1];
        }

        return _auctions;
    }

    /**
     * @dev Retrieve all offers for an auction
     * @param auctionId number value for the auction identifier
     */
    function getAllAuctionOffers(uint auctionId)
        public
        view
        auctionExists(auctionId)
        returns (Offer[] memory)
    {
        // Retrieve the auction by id
        Auction memory auction = auctions[auctionId];

        // Retrieve all the offer ids for this auction
        uint[] memory auctionOfferIds = auction.offerIds;

        // create an in-memory fixed-sized array to hold the offers
        Offer[] memory _offers = new Offer[](auctionOfferIds.length);

        for (uint i = 0; i < auctionOfferIds.length; i++) {
            _offers[i] = offers[auctionOfferIds[i]];
        }

        return _offers;
    }
}
