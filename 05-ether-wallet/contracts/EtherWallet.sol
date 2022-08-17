// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

/**
 * @title EtherWallet
 * @dev Crypto wallet capable of storing and sending Ether
 */
contract EtherWallet {
    address public owner;

    /**
     * @dev Event for when ether is sent from this wallet to another address
     * @param to address of the recipient
     * @param amount amount of Ether that was sent
     */
    event Send(address to, uint amount);

    /**
     * @dev Set the owner of this wallet to the contract deployer
     * @param _owner owner's address for this wallet
     */
    constructor(address _owner) {
        owner = _owner;
    }

    /**
     * @dev Accept Ether and store it in this contract
     */
    function deposit() public payable {}

    /**
     * @dev Send Ether from this wallet to another address (if owner)
     * @param _to address of the recipient
     * @param _amount amount of Ether to send
     */
    function send(address _to, uint _amount) public {
        require(msg.sender == owner, "Only owner is allowed.");

        // Call returns a boolean value indicating success or failure.
        // This is the current recommended method to use.
        (bool sent, bytes memory data) = _to.call{value: _amount}("");
        require(sent, "Failed to send the amount");

        emit Send(_to, _amount);
    }

    /**
     * @dev Return the balance of Ether stored in this contract
     * @return balance of this contract in wei
     */
    function balanceOf() public view returns (uint) {
        return address(this).balance;
    }
}
