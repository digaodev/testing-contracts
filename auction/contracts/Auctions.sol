// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

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
        uint256 id;
        uint256 auctionEnd;
        uint256 bestOfferId;
        uint256 minimumOfferPrice;
        uint256[] offerIds;
        string name;
        string description;
        address seller;
        bool isCanceled;
    }
    struct Offer {
        uint256 id;
        uint256 auctionId;
        uint256 offerPrice;
        address buyer;
        bool isStale; // is true when superseded by a higher bid from same buyer
    }

    uint256 private nextAuctionId = 1;
    uint256 private nextOfferId = 1;

    mapping(uint256 => Auction) public auctions;
    mapping(uint256 => Offer) public offers;
    mapping(address => uint256[]) public sellerAuctions;
    mapping(address => uint256[]) public buyerOffers;

    event CreateAuction(
        uint256 indexed auctionId,
        string indexed auctionName,
        address indexed seller
    );
    event CancelAuction(uint256 indexed auctionId, address indexed seller);
    event CreateOffer(
        uint256 indexed offerId,
        uint256 indexed auctionId,
        uint256 bidAmount,
        uint256 totalBidAmount,
        address indexed buyer
    );
    event Trade(uint256 indexed auctionId, uint256 indexed bestOfferId);
    event Transfer(address indexed recipient, uint256 amount);
    event RefundWithdrawal(
        uint256 indexed auctionId,
        uint256 indexed offerId,
        address indexed recipient,
        uint256 amount
    );

    /**
     * @dev Check if an auction exists, revert otherwise
     * @param auctionId number value for the auction identifier
     */
    modifier auctionExists(uint256 auctionId) {
        require(auctions[auctionId].id == auctionId, "Auction not found");
        _;
    }

    /**
     * @dev Check if an auction has not been canceled, revert otherwise
     * @param auctionId number value for the auction identifier
     */
    modifier auctionIsNotCanceled(uint256 auctionId) {
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
        uint256 minimumOfferPrice,
        uint256 duration
    ) external {
        require(
            duration >= 1 days && duration <= 30 days,
            "Duration should be between 1 to 30 days"
        );

        // arrays need to be initialized when empty
        uint256[] memory offerIds = new uint256[](0);

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
    function cancelAuction(uint256 auctionId)
        external
        auctionIsNotCanceled(auctionId)
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

        auction.isCanceled = true;

        emit CancelAuction(auctionId, msg.sender);
    }

    /**
     * @dev Create a new offer for an existing auction (send bid value via msg.value)
     * @param auctionId number value for the auction identifier
     */
    function createOffer(uint256 auctionId)
        external
        payable
        auctionExists(auctionId)
        auctionIsNotCanceled(auctionId)
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
        // to the new (higher) bid and make previous bid stale to prevent
        // multiple withdrawals later
        Offer[] memory auctionOffers = getAllAuctionOffers(auctionId);
        uint256 offerPrice = msg.value;
        uint256 auctionOffersLength = auctionOffers.length;
        for (uint256 i = 0; i < auctionOffersLength; i++) {
            // check if offer is from this buyer
            if (auctionOffers[i].buyer == msg.sender) {
                Offer storage offer = offers[auctionOffers[i].id];
                // check if offer is not stale already, otherwise make it stale
                if (offer.isStale == false) {
                    offer.isStale = true;
                }
                // add uup the past offer price to compose the new higher bid
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
            buyer: msg.sender,
            isStale: false
        });

        // Update auction with the new best offer
        auction.bestOfferId = nextOfferId;

        auction.offerIds.push(nextOfferId);

        buyerOffers[msg.sender].push(nextOfferId);

        emit CreateOffer(
            nextOfferId,
            auctionId,
            msg.value,
            offerPrice,
            msg.sender
        );

        nextOfferId++;
    }

    /**
     * @dev Execute the trade after the auction has ended and transfer the best bid
     *      to the seller
     * @param auctionId number value for the auction identifier
     */
    function trade(uint256 auctionId)
        external
        auctionExists(auctionId)
        auctionIsNotCanceled(auctionId)
    {
        Auction storage auction = auctions[auctionId];

        // Check if auction is active
        require(
            block.timestamp > auction.auctionEnd,
            "Auction is still active"
        );

        // Retrieve the best offer
        Offer storage bestOffer = offers[auction.bestOfferId];

        // Mark it as stale to prevent later withdrawals
        bestOffer.isStale = true;

        // Send winning offer to the seller
        (bool sent, bytes memory data) = payable(auction.seller).call{
            value: bestOffer.offerPrice
        }("");

        require(sent, "Failed to send Ether");

        emit Transfer(auction.seller, bestOffer.offerPrice);
        emit Trade(auctionId, bestOffer.id);
    }

    /**
     * @dev Allow auction participants to withdraw their funds (pull-pattern)
     * @param auctionId number value for the auction identifier
     */
    function refundWithdrawal(uint256 auctionId)
        external
        auctionExists(auctionId)
    {
        Auction memory auction = auctions[auctionId];

        require(
            auction.isCanceled == true || block.timestamp > auction.auctionEnd,
            "Unable to withdraw from active auction"
        );

        // Retrieve all the offer ids for this auction
        uint256[] memory auctionOfferIds = auction.offerIds;

        // Search for the latest offer from this buyer (highest non-stale offer)
        uint256 auctionOfferIdsLength = auctionOfferIds.length;
        for (uint256 i = 0; i < auctionOfferIdsLength; i++) {
            Offer storage offer = offers[auctionOfferIds[i]];

            if (offer.isStale == false) {
                // Refund offer to the buyer
                (bool sent, bytes memory data) = payable(offer.buyer).call{
                    value: offer.offerPrice
                }("");

                require(sent, "Failed to send Ether");

                // Mark it as stale to prevent later withdrawals
                offer.isStale = true;

                emit Transfer(offer.buyer, offer.offerPrice);
            }
        }
    }

    /**
     * @dev Retrieve all auctions
     */
    function getAllAuctions() external view returns (Auction[] memory) {
        uint256 auctionArrayLength = nextAuctionId - 1;

        // create an in-memory fixed-sized array to hold the auctions
        Auction[] memory _auctions = new Auction[](auctionArrayLength);

        for (uint256 i = 0; i < auctionArrayLength; i++) {
            _auctions[i] = auctions[i + 1];
        }

        return _auctions;
    }

    /**
     * @dev Retrieve all offers for an auction
     * @param auctionId number value for the auction identifier
     */
    function getAllAuctionOffers(uint256 auctionId)
        public
        view
        auctionExists(auctionId)
        returns (Offer[] memory)
    {
        // Retrieve the auction by id
        Auction memory auction = auctions[auctionId];

        // Retrieve all the offer ids for this auction
        uint256[] memory auctionOfferIds = auction.offerIds;

        // create an in-memory fixed-sized array to hold the offers
        Offer[] memory _offers = new Offer[](auctionOfferIds.length);

        uint256 auctionOfferIdsLength = auctionOfferIds.length;
        for (uint256 i = 0; i < auctionOfferIdsLength; i++) {
            _offers[i] = offers[auctionOfferIds[i]];
        }

        return _offers;
    }
}
