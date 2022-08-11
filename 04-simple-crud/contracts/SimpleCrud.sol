// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

/**
 * @title SimpleCrud
 * @dev Create, read, update and destroy users
 */
contract SimpleCrud {
    struct User {
        uint id;
        string name;
    }
    User[] public users;
    /**
     * @dev Id must begin at 1 due to Solidity setting the struct to default
     * values when destroying
     */
    uint private _nextId = 1;

    /**
     * @dev Add a new user
     * @param _name string value to add as a new user
     */
    function create(string memory _name) public {
        users.push(User(_nextId, _name));
        _nextId++;
    }

    /**
     * @dev Find and return a user with the specified Id
     * @param _id user Id value to search on the array
     * @return the Id and Name of the user found
     */
    function read(uint _id) public view returns (uint, string memory) {
        uint index = _findById(_id);
        return (users[index].id, users[index].name);
    }

    /**
     * @dev Update the name of a user with the specified Id
     * @param _id user Id value to search on the array
     * @param _name user name value to update
     */
    function update(uint _id, string memory _name) public {
        uint index = _findById(_id);
        users[index].name = _name;
    }

    /**
     * @dev Delete a user with the specified Id
     * @param _id user Id value to search on the array
     */
    function destroy(uint _id) public {
        uint index = _findById(_id);
        delete users[index];
    }

    /**
     * @dev Find the index position of a user
     * @param _id user Id value to search its position on the array
     * @return the index position of the user on the array
     */
    function _findById(uint _id) internal view returns (uint) {
        for (uint i = 0; i < users.length; i++) {
            if (users[i].id == _id) {
                return i;
            }
        }
        revert("User not found");
    }
}
