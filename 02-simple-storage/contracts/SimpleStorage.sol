// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

/**
 * @title SimpleStorage
 * @dev Store & retrieve a string value in a variable
 */
contract SimpleStorage {
    string private data;

    /**
     * @dev Store a string value in a storage variable
     * @param _data value to store
     */
    function store(string calldata _data) public {
        data = _data;
    }

    /**
     * @dev Return string value from storage
     * @return value of 'data'
     */
    function retrieve() public view returns (string memory) {
        return data;
    }
}
