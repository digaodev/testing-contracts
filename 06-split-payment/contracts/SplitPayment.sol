// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

// Uncomment this line to use console.log
// import "hardhat/console.sol";

/**
 * @title SplitPayment
 * @dev Contract capable of sending Ether to multiple recipients
 */
contract SplitPayment {
    address public immutable _owner;

    /**
     * @dev Event for when ether is sent from the owner to other addresses
     * @param from address of the sender
     * @param to array of addresses of the recipients
     * @param amount array of amounts of Ether that was sent
     */
    event Transfer(address indexed from, address payable[] to, uint[] amount);

    constructor() payable {
        _owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == _owner, "Only owner is allowed");

        _;
    }

    /**
        @param _to array of addresses of the recipients
        @param _amount array of amounts of Ether to be sent
    */
    function send(address payable[] calldata _to, uint[] calldata _amount)
        public
        payable
        onlyOwner
    {
        require(
            _to.length == _amount.length,
            "to and amount must match length"
        );

        for (uint i = 0; i < _to.length; i++) {
            // Call returns a boolean value indicating success or failure.
            // This is the current recommended method to use.
            (bool sent, bytes memory data) = _to[i].call{value: _amount[i]}("");
            require(sent, "Failed to send the amount");
        }

        emit Transfer(_owner, _to, _amount);
    }
}
