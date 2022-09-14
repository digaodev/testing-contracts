// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "./ERC721.sol";

contract SuperMarioWorld is ERC721 {
    string public name; // ERC721Metadata
    string public symbol; // ERC721Metadata

    uint256 public tokenCount; //tokenId accumulator

    mapping(uint256 => string) private _tokenURIs;

    constructor(string memory _name, string memory _symbol) {
        name = _name;
        symbol = _symbol;
    }

    // return a URL that points to the metadata // ERC721Metadata
    function tokenURI(uint256 tokenId) public view returns (string memory) {
        require(_owners[tokenId] != address(0), "Token ID does not exist");

        return _tokenURIs[tokenId];
    }

    // creates a new NFT inside our collection
    function mint(string calldata _tokenURI) public {
        tokenCount += 1; // new tokenId

        _balances[msg.sender] += 1;
        _owners[tokenCount] = msg.sender;

        _tokenURIs[tokenCount] = _tokenURI;

        emit Transfer(address(0), msg.sender, tokenCount);
    }

    // Query if a contract implements an interface (helps with 3rd party comms)
    function supportsInterface(bytes4 interfaceID)
        public
        pure
        override
        returns (bool)
    {
        return interfaceID == 0x80ac58cd || interfaceID == 0x5b5e139f;
    }
}
