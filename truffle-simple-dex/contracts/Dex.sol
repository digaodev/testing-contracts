// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title Simple Descentralized Exchange (on-chain order book)
 * @dev Allow different ERC20 tokens to be added to the DEX listing by the admin;
 *      Allow user deposits of different ERC20 tokens;
 *      Allow user withdraw of different ERC20 tokens;
 *      Allow the creation of Limit Orders, which specify a max/min limit price
 *      for buy/sell order;
 *      Allow the creation of Market Orders, where you agree to whatever price
 *      is on the market;
 *      The orderbook is the core part of the DEX. It lists all limit orders,
 *      matches incoming market orders against existing limit orders and
 *      remove limit orders that were executed;
 *      Th orderbook follow a price-time algorithm. When an incoming market
 *      order arrives, the orderbook will try to match it with the market order
 *      that has the best price. If several limit orders have the same price,
 *      the one that was created first gets matched in priority.
 *      After a market and a limit order have been matched, complete the
 *      transaction by sending the assets to their new owners:
 *          Tokens need to be transferred from the seller to the buyer; and
 *          Ether needs to be transferred from the buyer to the seller
 */
contract Dex {
    enum Side {
        BUY,
        SELL
    }
    struct Token {
        bytes32 ticker;
        address tokenAddress;
    }
    struct Order {
        uint256 id;
        address trader;
        Side side;
        bytes32 ticker;
        uint256 amount;
        uint256 filled;
        uint256 price;
        uint256 date;
    }
    // Registered tokens
    mapping(bytes32 => Token) public tokens;
    mapping(address => mapping(bytes32 => uint256)) public traderBalances;
    // ticker => Side => Order[]
    mapping(bytes32 => mapping(uint256 => Order[])) public orderBook;
    bytes32[] public tokenList;
    address public admin;
    uint256 public nextOrderId = 1;
    uint256 public nextTradeId = 1;
    bytes32 constant DAI = bytes32("DAI"); // quote currency

    event AddToken(bytes32 indexed ticker, address indexed tokenAddress);
    event Transfer(address indexed _from, address indexed _to, uint256 _value);
    event CreateLimitOrder(
        bytes32 indexed ticker,
        uint256 amount,
        uint256 price,
        Side side
    );
    event NewTrade(
        uint256 tradeId,
        uint256 orderId,
        bytes32 indexed ticker,
        address indexed trader1,
        address indexed trader2,
        uint256 amount,
        uint256 price,
        uint256 date
    );

    constructor() {
        admin = msg.sender;
    }

    /**
     * @dev Check if sender is admin, revert otherwise
     */
    modifier onlyAdmin() {
        require(admin == msg.sender, "Only admin is allowed");
        _;
    }

    /**
     * @dev Check if the token exists, revert otherwise
     * @param ticker bytes32 value for the token ticker
     */
    modifier tokenExists(bytes32 ticker) {
        require(
            tokens[ticker].tokenAddress != address(0),
            "Token does not exist"
        );
        _;
    }

    /**
     * @dev Check if the token is not DAI, revert otherwise
     * @param ticker bytes32 value for the token ticker
     */
    modifier tokenIsNotDai(bytes32 ticker) {
        require(ticker != DAI, "Cannot trade DAI token");
        _;
    }

    /**
     * @dev Register a new token if admin
     * @param ticker bytes32 value for the token ticker
     * @param tokenAddress address for the ERC20 contract
     */
    function addToken(bytes32 ticker, address tokenAddress) external onlyAdmin {
        require(
            tokens[ticker].tokenAddress != tokenAddress,
            "Token already registered"
        );

        tokens[ticker] = Token(ticker, tokenAddress);
        tokenList.push(ticker);

        emit AddToken(ticker, tokenAddress);
    }

    /**
     * @dev Deposit the specified amount of a registered token
     * @param ticker bytes32 value for the token ticker
     * @param amount number value for the token amount to be deposited
     */
    function deposit(bytes32 ticker, uint256 amount)
        external
        tokenExists(ticker)
    {
        traderBalances[msg.sender][ticker] += amount;

        IERC20(tokens[ticker].tokenAddress).transferFrom(
            msg.sender,
            address(this),
            amount
        );

        emit Transfer(msg.sender, address(this), amount);
    }

    /**
     * @dev Withdraw the specified amount of a registered token
     * @param ticker bytes32 value for the token ticker
     * @param amount number value for the token amount to be deposited
     */
    function withdraw(bytes32 ticker, uint256 amount)
        external
        tokenExists(ticker)
    {
        require(
            traderBalances[msg.sender][ticker] >= amount,
            "Insufficient balance"
        );

        traderBalances[msg.sender][ticker] -= amount;

        IERC20(tokens[ticker].tokenAddress).transfer(msg.sender, amount);

        emit Transfer(address(this), msg.sender, amount);
    }

    /**
     * @dev Create a limit order (which specify a max/min limit price for buy/sell
     *      order) except for DAI tokens (due to being the quote currency)
     * @param ticker bytes32 value for the token ticker
     * @param amount number value for the token amount
     * @param price number value for the up to price the user is willing to order
     * @param side type of order [BUY | SELL]
     */
    function createLimitOrder(
        bytes32 ticker,
        uint256 amount,
        uint256 price,
        Side side
    ) external tokenExists(ticker) tokenIsNotDai(ticker) {
        if (side == Side.SELL) {
            require(
                traderBalances[msg.sender][ticker] >= amount,
                "Insufficient balance for this token"
            );
        } else {
            require(
                traderBalances[msg.sender][DAI] >= amount * price,
                "Insufficient balance for DAI"
            );
        }

        Order[] storage orders = orderBook[ticker][uint256(side)];
        orders.push(
            Order(
                nextOrderId,
                msg.sender,
                side,
                ticker,
                amount,
                0,
                price,
                block.timestamp
            )
        );

        // sort the order book using bubble sort in order to surface the highest
        // prices to the beginning of the array
        uint256 i = orders.length - 1;
        while (i > 0) {
            if (side == Side.BUY && orders[i - 1].price > orders[i].price) {
                break; // no need to swap
            }
            if (side == Side.BUY && orders[i - 1].price > orders[i].price) {
                break; // no need to swap
            }
            Order memory orderTemp = orders[i - 1];
            orders[i - 1] = orders[i]; // swap elements
            orders[i] = orderTemp;
            i--;
        }

        nextOrderId++;

        emit CreateLimitOrder(ticker, amount, price, side);
    }

    /**
     * @dev Create a market order (agree to whatever price is on the market)
     *      except for DAI tokens (due to being the quote currency)
     * @param ticker bytes32 value for the token ticker
     * @param amount number value for the token amount
     * @param side type of order [BUY | SELL]
     */
    function createMarketOrder(
        bytes32 ticker,
        uint256 amount,
        Side side
    ) external tokenExists(ticker) tokenIsNotDai(ticker) {
        if (side == Side.SELL) {
            require(
                traderBalances[msg.sender][ticker] >= amount,
                "Insufficient balance for this token"
            );
        }

        // Retrieve the orders from the other side of the market
        Side marketSide = side == Side.BUY ? Side.SELL : Side.BUY;
        Order[] storage orders = orderBook[ticker][uint256(marketSide)];

        uint256 i;
        uint256 remainingAmount = amount;
        // iterate thru the DEX order book and try to match the incoming order
        // amount requested by the user with each available order until it is
        // fulfilled, either by multiple orders or just one
        while (i < orders.length && remainingAmount > 0) {
            uint256 availableAmount = orders[i].amount - orders[i].filled;
            uint256 matchedAmount = (remainingAmount > availableAmount)
                ? availableAmount
                : remainingAmount;

            remainingAmount -= matchedAmount;
            orders[i].filled += matchedAmount;

            if (side == Side.SELL) {
                traderBalances[msg.sender][ticker] -= matchedAmount;
                traderBalances[msg.sender][DAI] +=
                    matchedAmount *
                    orders[i].price;

                traderBalances[orders[i].trader][ticker] += matchedAmount;
                traderBalances[orders[i].trader][DAI] -=
                    matchedAmount *
                    orders[i].price;
            }

            if (side == Side.BUY) {
                require(
                    traderBalances[msg.sender][DAI] >=
                        matchedAmount * orders[i].price,
                    "Insufficient balance for DAI token"
                );
                traderBalances[msg.sender][ticker] += matchedAmount;
                traderBalances[msg.sender][DAI] -=
                    matchedAmount *
                    orders[i].price;

                traderBalances[orders[i].trader][ticker] -= matchedAmount;
                traderBalances[orders[i].trader][DAI] +=
                    matchedAmount *
                    orders[i].price;
            }

            emit NewTrade(
                nextTradeId,
                orders[i].id,
                ticker,
                msg.sender,
                orders[i].trader,
                matchedAmount,
                orders[i].price,
                block.timestamp
            );

            nextTradeId++;
            i++;
        }

        i = 0;
        // iterate again thru the order book to clean up the fulfilled orders
        while (i < orders.length && orders[i].filled == orders[i].amount) {
            for (uint256 j = i; j < orders.length - 1; j++) {
                orders[j] = orders[j + 1];
            }
            orders.pop();
            i++;
        }
    }

    /**
     * @dev Retrieve the orders for a given ticker and market side
     * @param ticker bytes32 value for the token ticker
     * @param side type of order [BUY | SELL]
     */
    function getOrders(bytes32 ticker, Side side)
        external
        view
        returns (Order[] memory)
    {
        return orderBook[ticker][uint256(side)];
    }

    /**
     * @dev Retrieve a list of tokens that are registered and can be traded
     */
    function getTokens() external view returns (Token[] memory) {
        Token[] memory _tokens = new Token[](tokenList.length);

        for (uint256 i = 0; i < tokenList.length; i++) {
            _tokens[i] = Token(
                tokens[tokenList[i]].ticker,
                tokens[tokenList[i]].tokenAddress
            );
        }
        return _tokens;
    }
}
