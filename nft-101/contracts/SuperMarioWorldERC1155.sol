// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "./ERC1155.sol"; 

contract SuperMarioWorldERC1155 is ERC1155 {
    string public name;
    string public symbol;

    uint256 public tokenCount;

    // tokenId => tokenURI
    mapping(uint256 => string) private _tokenURIs;

    constructor(string memory _name, string memory _symbol) {
        name = _name;
        symbol = _symbol;
    }

    function uri(uint256 _tokenId) public view returns (string memory) {
        return _tokenURIs[_tokenId];
    }

    function mint(uint256 _amount, string memory _tokenURI) public {
        require(msg.sender != address(0), "Mint to address zero");

        tokenCount += 1;

        _balances[tokenCount][msg.sender] += _amount;

        _tokenURIs[tokenCount] = _tokenURI;

        emit TransferSingle(
            msg.sender,
            address(0),
            msg.sender,
            tokenCount,
            _amount
        );
    }

    function supportsInterface(bytes4 interfaceID)
        public
        pure
        override
        returns (bool)
    {
        return interfaceID == 0xd9b67a26 || interfaceID == 0x0e89341c;
    }
}
