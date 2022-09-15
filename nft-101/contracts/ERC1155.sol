// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

contract ERC721 {
    // tokenID => owner address => balance
    mapping(uint256 => mapping(address => uint256)) internal _balances;

    // owner => operator => isApproved
    mapping(address => mapping(address => bool)) private _operatorApprovals;

    /**
        @dev MUST emit when approval for a second party/operator address to 
        manage all tokens for an owner address is enabled or disabled (absence 
        of an event assumes disabled).        
    */
    event ApprovalForAll(
        address indexed _owner,
        address indexed _operator,
        bool _approved
    );

    /**
        @dev Either `TransferSingle` or `TransferBatch` MUST emit when tokens 
        are transferred, including zero value transfers as well as minting or 
        burning (see "Safe Transfer Rules" section of the standard).
        The `_operator` argument MUST be the address of an account/contract that 
        is approved to make the transfer (SHOULD be msg.sender).
        The `_from` argument MUST be the address of the holder whose balance is 
        decreased.
        The `_to` argument MUST be the address of the recipient whose balance is 
        increased.
        The `_id` argument MUST be the token type being transferred.
        The `_value` argument MUST be the number of tokens the holder balance is 
        decreased by and match what the recipient balance is increased by.
        When minting/creating tokens, the `_from` argument MUST be set to `0x0` 
        (i.e. zero address).
        When burning/destroying tokens, the `_to` argument MUST be set to `0x0` 
        (i.e. zero address).        
    */
    event TransferSingle(
        address indexed _operator,
        address indexed _from,
        address indexed _to,
        uint256 _id,
        uint256 _amount
    );

    /**
        @dev Either `TransferSingle` or `TransferBatch` MUST emit when tokens 
        are transferred, including zero value transfers as well as minting or 
        burning (see "Safe Transfer Rules" section of the standard).      
        The `_operator` argument MUST be the address of an account/contract that 
        is approved to make the transfer (SHOULD be msg.sender).
        The `_from` argument MUST be the address of the holder whose balance is 
        decreased.
        The `_to` argument MUST be the address of the recipient whose balance is 
        increased.
        The `_ids` argument MUST be the list of tokens being transferred.
        The `_amount` argument MUST be the list of number of tokens (matching 
        the list and order of tokens specified in _ids) the holder balance is 
        decreased by and match what the recipient balance is increased by.
        When minting/creating tokens, the `_from` argument MUST be set to `0x0` 
        (i.e. zero address).
        When burning/destroying tokens, the `_to` argument MUST be set to `0x0` 
        (i.e. zero address).                
    */
    event TransferBatch(
        address indexed _operator,
        address indexed _from,
        address indexed _to,
        uint256[] _ids,
        uint256[] _amount
    );

    /**
        @notice Get the balance of an account's tokens.
        @param _owner  The address of the token holder
        @param _id     ID of the token
        @return        The _owner's balance of the token type requested
     */
    function balanceOf(address _owner, uint256 _id)
        public
        view
        returns (uint256)
    {
        require(_owner != address(0), "Address is zero");

        return _balances[_id][_owner];
    }

    /**
        @notice Get the balance of multiple account/token pairs
        @param _owners The addresses of the token holders
        @param _ids    ID of the tokens
        @return        The _owner's balance of the token types requested 
        (i.e. balance for each (owner, id) pair)
     */
    function balanceOfBatch(address[] calldata _owners, uint256[] calldata _ids)
        public
        view
        returns (uint256[] memory)
    {
        require(
            _owners.length == _ids.length,
            "Input arrays are not the same length"
        );

        uint256[] memory batchBalances = new uint256[](_owners.length);

        for (uint256 i = 0; i < _owners.length; i++) {
            batchBalances[i] = balanceOf(_owners[i], _ids[i]);
        }

        return batchBalances;
    }

    /**
        @notice Enable or disable approval for a third party ("operator") to 
        manage all of the caller's tokens.
        @dev MUST emit the ApprovalForAll event on success.
        @param _operator  Address to add to the set of authorized operators
        @param _approved  True if the operator is approved, false to revoke approval
    */
    function setApprovalForAll(address _operator, bool _approved) public {
        _operatorApprovals[msg.sender][_operator] = _approved;

        emit ApprovalForAll(msg.sender, _operator, _approved);
    }

    /**
        @notice Queries the approval status of an operator for a given owner.
        @param _owner     The owner of the tokens
        @param _operator  Address of authorized operator
        @return           True if the operator is approved, false if not
    */
    function isApprovedForAll(address _owner, address _operator)
        public
        view
        returns (bool)
    {
        return _operatorApprovals[_owner][_operator];
    }

    function _transfer(
        address from,
        address to,
        uint256 id,
        uint256 amount
    ) private {
        uint256 fromBalance = _balances[id][from];

        require(fromBalance >= amount, "Insufficient balance");

        _balances[id][from] = fromBalance - amount;
        _balances[id][to] = fromBalance + amount;
    }

    // dummy function implementation
    function _checkOnERC1155Received(bytes calldata _data)
        private
        pure
        returns (bool)
    {
        return true;
    }

    /**
        @notice Transfers `_value` amount of an `_id` from the `_from` address 
        to the `_to` address specified (with safety call).
        @dev Caller must be approved to manage the tokens being transferred out 
        of the `_from` account (see "Approval" section of the standard).
        MUST revert if `_to` is the zero address.
        MUST revert if balance of holder for token `_id` is lower than the
         `_value` sent.
        MUST revert on any other error.
        MUST emit the `TransferSingle` event to reflect the balance change (see 
        "Safe Transfer Rules" section of the standard).
        After the above conditions are met, this function MUST check if `_to` is
         a smart contract (e.g. code size > 0). If so, it MUST call 
         `onERC1155Received` on `_to` and act appropriately (see "Safe Transfer 
         Rules" section of the standard).        
        @param _from    Source address
        @param _to      Target address
        @param _id      ID of the token type
        @param _amount   Transfer amount
        @param _data    Additional data with no specified format, MUST be sent 
        unaltered in call to `onERC1155Received` on `_to`
    */
    function safeTransferFrom(
        address _from,
        address _to,
        uint256 _id,
        uint256 _amount,
        bytes calldata _data
    ) public virtual {
        require(
            _from == msg.sender || isApprovedForAll(_from, msg.sender),
            "Sender is not the owner or an approved operator"
        );
        require(_to != address(0), "Address is zero");

        _transfer(_from, _to, _id, _amount);

        emit TransferSingle(msg.sender, _from, _to, _id, _amount);

        require(_checkOnERC1155Received(_data), "Receiver is not implemented");
    }

    // dummy function implementation
    function _checkOnBatchERC1155Received(bytes calldata _data)
        private
        pure
        returns (bool)
    {
        return true;
    }

    /**
        @notice Transfers `_amount` amount(s) of `_ids` from the `_from` address to the `_to` address specified (with safety call).
        @dev Caller must be approved to manage the tokens being transferred out of the `_from` account (see "Approval" section of the standard).
        MUST revert if `_to` is the zero address.
        MUST revert if length of `_ids` is not the same as length of `_amount`.
        MUST revert if any of the balance(s) of the holder(s) for token(s) in `_ids` is lower than the respective amount(s) in `_amount` sent to the recipient.
        MUST revert on any other error.        
        MUST emit `TransferSingle` or `TransferBatch` event(s) such that all the balance changes are reflected (see "Safe Transfer Rules" section of the standard).
        Balance changes and events MUST follow the ordering of the arrays (_ids[0]/_amount[0] before _ids[1]/_amount[1], etc).
        After the above conditions for the transfer(s) in the batch are met, this function MUST check if `_to` is a smart contract (e.g. code size > 0). If so, it MUST call the relevant `ERC1155TokenReceiver` hook(s) on `_to` and act appropriately (see "Safe Transfer Rules" section of the standard).                      
        @param _from    Source address
        @param _to      Target address
        @param _ids     IDs of each token type (order and length must match _amount array)
        @param _amounts  Transfer amounts per token type (order and length must match _ids array)
        @param _data    Additional data with no specified format, MUST be sent unaltered in call to the `ERC1155TokenReceiver` hook(s) on `_to`
    */
    function safeBatchTransferFrom(
        address _from,
        address _to,
        uint256[] calldata _ids,
        uint256[] calldata _amounts,
        bytes calldata _data
    ) external {
        require(
            _from == msg.sender || isApprovedForAll(_from, msg.sender),
            "Sender is not the owner or an approved operator"
        );
        require(_to != address(0), "Address is zero");
        require(
            _amounts.length == _ids.length,
            "Input arrays are not the same length"
        );

        for (uint i = 0; i < _ids.length; i++) {
            uint256 id = _ids[i];
            uint256 amount = _amounts[i];

            _transfer(_from, _to, id, amount);
        }

        emit TransferBatch(msg.sender, _from, _to, _ids, _amounts);

        require(
            _checkOnBatchERC1155Received(_data),
            "Receiver is not implemented"
        );
    }

    /// @notice Query if a contract implements an interface (ERC1155 in this case)
    /// @param interfaceID The interface identifier, as specified in ERC-165
    /// @dev Interface identification is specified in ERC-165. This function
    ///  uses less than 30,000 gas.
    /// @return `true` if the contract implements `interfaceID` and
    ///  `interfaceID` is not 0xffffffff, `false` otherwise
    function supportsInterface(bytes4 interfaceID)
        public
        pure
        virtual
        returns (bool)
    {
        return interfaceID == 0xd9b67a26;
    }
}
