// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

/**
 * @title AdvancedStorage
 * @dev Store & retrieve uint values to and from an array
 */
contract AdvancedStorage {
    uint[] private ids;

    /**
     * @dev Add a uint value to the array storage variable
     * @param id value to add
     */
    function add(uint id) public {
        ids.push(id);
    }

    /**
     * @dev Return the uint value at the index position from the array storage variable
     * @return value of 'id' at the index position
     */
    function get(uint position) public view returns (uint) {
        return ids[position];
    }

    /**
     * @dev Return the whole array storage variable
     * @return all the values of 'ids' array 
     */
    function getAll() public view returns (uint[] memory) {
        return ids;
    }

    /**
     * @dev Return the length of the array storage variable
     * @return value of the length of 'ids' array 
     */
    function length() public view returns (uint) {
        return ids.length;
    }
}
