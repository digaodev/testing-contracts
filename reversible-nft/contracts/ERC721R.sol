// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

// Uncomment this line to use console.log
// import "hardhat/console.sol";

import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/IERC721Metadata.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

/**
 * @dev Implementation of https://eips.ethereum.org/EIPS/eip-721[ERC721] Non-Fungible Token Standard, including
 * the Metadata extension, but not including the Enumerable extension, which is available separately as
 * {ERC721Enumerable}.
 */
contract ERC721R is Context, ERC165, IERC721, IERC721Metadata {
    using Address for address;
    using Strings for uint256;
    // Token name
    string private _name;

    // Token symbol
    string private _symbol;

    //https://ycharts.com/indicators/ethereum_blocks_per_day#:~:text=Basic%20Info,11.50%25%20from%20one%20year%20ago.
    // 14296 blocks is roughly 2 days
    uint256 public NUM_REVERSIBLE_BLOCKS = 14296; 
    address private _governanceContract;

    // Mapping from token ID to owner address
    // OwningQueue: another contract at the end of this file
    mapping(uint256 => OwningQueue) public _owners;

    // Mapping owner address to token count
    mapping(address => uint256) private _balances;

    // Mapping from token ID to approved address
    mapping(uint256 => address) private _tokenApprovals;

    // Mapping from owner to operator approvals
    mapping(address => mapping(address => bool)) private _operatorApprovals;

    mapping(uint256 => bool) public _frozen;

    event FreezeSuccessful(
        address from,
        address to,
        uint256 tokenId,
        uint256 blockNumber,
        uint256 index
    );
    event ReverseSuccessful(uint256 tokenId, address from);
    event ReverseRejected(uint256 tokenId);

    /**
     * @dev Initializes the contract by setting a `name` and a `symbol` to the token collection.
     */
    constructor(
        string memory name_,
        string memory symbol_,
        uint256 reversiblePeriod_,
        uint256 totalSupply,
        address governanceContract_
    ) {
        _name = name_;
        _symbol = symbol_;
        NUM_REVERSIBLE_BLOCKS = reversiblePeriod_;
        _governanceContract = governanceContract_;
        for (uint256 i = 0; i < totalSupply; i++) {
            _owners[i] = new OwningQueue(); //initialize owningQueues
        }
    }

    modifier onlyGovernance() {
        require(
            msg.sender == _governanceContract,
            "ERC721R: Unauthorized call."
        );
        _;
    }

    /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC165, IERC165)
        returns (bool)
    {
        return
            interfaceId == type(IERC721).interfaceId ||
            interfaceId == type(IERC721Metadata).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    /**
     * @dev See {IERC721-balanceOf}.
     */
    function balanceOf(address owner)
        public
        view
        virtual
        override
        returns (uint256)
    {
        require(
            owner != address(0),
            "ERC721: address zero is not a valid owner"
        );
        return _balances[owner];
    }

    /**
     * @dev See {IERC721-ownerOf}.
     */
    function ownerOf(uint256 tokenId)
        public
        view
        virtual
        override
        returns (address)
    {
        unchecked {
            address owner = _owners[tokenId]
                .get(_owners[tokenId].getLast() - 1)
                .owner;
            require(
                owner != address(0),
                "ERC721: owner query for nonexistent token"
            );
            return owner;
        }
    }

    function ownerOfCheckExist(uint256 tokenId)
        public
        view
        virtual
        returns (address)
    {
        unchecked {
            address owner = _owners[tokenId]
                .get(_owners[tokenId].getLast() - 1)
                .owner;
            return owner;
        }
    }

    /**
     * @dev See {IERC721Metadata-name}.
     */
    function name() public view virtual override returns (string memory) {
        return _name;
    }

    /**
     * @dev See {IERC721Metadata-symbol}.
     */
    function symbol() public view virtual override returns (string memory) {
        return _symbol;
    }

    /**
     * @dev See {IERC721Metadata-tokenURI}.
     */
    function tokenURI(uint256 tokenId)
        public
        view
        virtual
        override
        returns (string memory)
    {
        require(
            _exists(tokenId),
            "ERC721Metadata: URI query for nonexistent token"
        );

        string memory baseURI = _baseURI();

        return
            bytes(baseURI).length > 0
                ? string(abi.encodePacked(baseURI, tokenId.toString()))
                : "";
    }

    /**
     * @dev Base URI for computing {tokenURI}. If set, the resulting URI for each
     * token will be the concatenation of the `baseURI` and the `tokenId`. Empty
     * by default, can be overridden in child contracts.
     */
    function _baseURI() internal view virtual returns (string memory) {
        return "";
    }

    /**
     * @dev freeze
     */
    function freeze(uint256 tokenId, uint256 index)
        public
        onlyGovernance
        returns (bool successful)
    {
        // verify that index is valid
        uint256 tokenOwningsFirst = _owners[tokenId].getFirst();
        uint256 tokenOwningsLength = _owners[tokenId].getLast();
        
        unchecked {
            require(
                index >= tokenOwningsFirst &&
                    index < tokenOwningsFirst + tokenOwningsLength - 1,
                "ERC721R: Verification of specified transaction failed."
            );
        }
        address from = _owners[tokenId].get(index).owner;
        address to = _owners[tokenId].get(index + 1).owner;
        uint256 blockNumber = _owners[tokenId].get(index + 1).startBlock;

        if (block.number > NUM_REVERSIBLE_BLOCKS) {
            require(
                blockNumber >= block.number - NUM_REVERSIBLE_BLOCKS,
                "ERC721R: specified transaction is no longer reversible."
            );
        }

        _frozen[tokenId] = true;
        emit FreezeSuccessful(from, to, tokenId, blockNumber, index);
        return true;
    }

// TODO: check the voting contract 
    function reverse(uint256 tokenId, uint256 index)
        external
        onlyGovernance
        returns (bool successful)
    {
        //transfer back to original owner/victim
        unchecked {
            address owner = _owners[tokenId]
                .get(_owners[tokenId].getLast() - 1)
                .owner;
            address original_owner = _owners[tokenId].get(index).owner;
            _frozen[tokenId] = false;
            _transfer(owner, original_owner, tokenId);
            emit ReverseSuccessful(tokenId, original_owner);
        }
        return true;
    }

    // TODO: check the voting contract 
    function rejectReverse(uint256 tokenId)
        external
        onlyGovernance
        returns (bool successful)
    {
        _frozen[tokenId] = false;
        emit ReverseRejected(tokenId);
        return true;
    }

    function clean(uint256[] calldata tokenIds) external {
        for (uint256 i = 0; i < tokenIds.length; i++) {
            require(
                _owners[tokenIds[i]].length() > 1,
                "Cannot delete record of current owner"
            );
            uint256 j = _owners[tokenIds[i]].getFirst();
            unchecked {
                while (_owners[tokenIds[i]].length() > 1) {
                    if (
                        _owners[tokenIds[i]].get(j + 1).startBlock <
                        block.number - NUM_REVERSIBLE_BLOCKS
                    ) {
                        _owners[tokenIds[i]].dequeue();
                        j++;
                    } else {
                        break;
                    }
                }
            }
        }
    }

    /**
     * @dev See {IERC721-approve}.
     */
    function approve(address to, uint256 tokenId) public virtual override {
        address owner = ownerOf(tokenId);
        require(to != owner, "ERC721: approval to current owner");

        require(
            _msgSender() == owner || isApprovedForAll(owner, _msgSender()),
            "ERC721: approve caller is not owner nor approved for all"
        );

        _approve(to, tokenId);
    }

    /**
     * @dev See {IERC721-getApproved}.
     */
    function getApproved(uint256 tokenId)
        public
        view
        virtual
        override
        returns (address)
    {
        require(
            _exists(tokenId),
            "ERC721: approved query for nonexistent token"
        );

        return _tokenApprovals[tokenId];
    }

    /**
     * @dev See {IERC721-setApprovalForAll}.
     */
    function setApprovalForAll(address operator, bool approved)
        public
        virtual
        override
    {
        _setApprovalForAll(_msgSender(), operator, approved);
    }

    /**
     * @dev See {IERC721-isApprovedForAll}.
     */
    function isApprovedForAll(address owner, address operator)
        public
        view
        virtual
        override
        returns (bool)
    {
        return _operatorApprovals[owner][operator];
    }

    /**
     * @dev See {IERC721-transferFrom}.
     */
    function transferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public virtual override {
        //solhint-disable-next-line max-line-length
        require(
            _isApprovedOrOwner(_msgSender(), tokenId),
            "ERC721R: transfer caller is not owner nor approved"
        );

        _transfer(from, to, tokenId);
    }

    /**
     * @dev See {IERC721-safeTransferFrom}.
     */
    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public virtual override {
        safeTransferFrom(from, to, tokenId, "");
    }

    /**
     * @dev See {IERC721-safeTransferFrom}.
     */
    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId,
        bytes memory data
    ) public virtual override {
        require(
            _isApprovedOrOwner(_msgSender(), tokenId),
            "ERC721: transfer caller is not owner nor approved"
        );
        _safeTransfer(from, to, tokenId, data);
    }

    /**
     * @dev Safely transfers `tokenId` token from `from` to `to`, checking first that contract recipients
     * are aware of the ERC721 protocol to prevent tokens from being forever locked.
     *
     * `data` is additional data, it has no specified format and it is sent in call to `to`.
     *
     * This internal function is equivalent to {safeTransferFrom}, and can be used to e.g.
     * implement alternative mechanisms to perform token transfer, such as signature-based.
     *
     * Requirements:
     *
     * - `from` cannot be the zero address.
     * - `to` cannot be the zero address.
     * - `tokenId` token must exist and be owned by `from`.
     * - If `to` refers to a smart contract, it must implement {IERC721Receiver-onERC721Received}, which is called upon a safe transfer.
     *
     * Emits a {Transfer} event.
     */
    function _safeTransfer(
        address from,
        address to,
        uint256 tokenId,
        bytes memory data
    ) internal virtual {
        _transfer(from, to, tokenId);
        require(
            _checkOnERC721Received(from, to, tokenId, data),
            "ERC721: transfer to non ERC721Receiver implementer"
        );
    }

    /**
     * @dev Returns whether `tokenId` exists.
     *
     * Tokens can be managed by their owner or approved accounts via {approve} or {setApprovalForAll}.
     *
     * Tokens start existing when they are minted (`_mint`),
     * and stop existing when they are burned (`_burn`).
     */
    function _exists(uint256 tokenId) internal view virtual returns (bool) {
        return ownerOfCheckExist(tokenId) != address(0);
    }

    /**
     * @dev Returns whether `spender` is allowed to manage `tokenId`.
     *
     * Requirements:
     *
     * - `tokenId` must exist.
     */
    function _isApprovedOrOwner(address spender, uint256 tokenId)
        internal
        view
        virtual
        returns (bool)
    {
        require(
            _exists(tokenId),
            "ERC721: operator query for nonexistent token"
        );
        address owner = ownerOf(tokenId);
        return (spender == owner ||
            isApprovedForAll(owner, spender) ||
            getApproved(tokenId) == spender);
    }

    /**
     * @dev Safely mints `tokenId` and transfers it to `to`.
     *
     * Requirements:
     *
     * - `tokenId` must not exist.
     * - If `to` refers to a smart contract, it must implement {IERC721Receiver-onERC721Received}, which is called upon a safe transfer.
     *
     * Emits a {Transfer} event.
     */
    function _safeMint(address to, uint256 tokenId) internal virtual {
        _safeMint(to, tokenId, "");
    }

    /**
     * @dev Same as {xref-ERC721-_safeMint-address-uint256-}[`_safeMint`], with an additional `data` parameter which is
     * forwarded in {IERC721Receiver-onERC721Received} to contract recipients.
     */
    function _safeMint(
        address to,
        uint256 tokenId,
        bytes memory data
    ) internal virtual {
        _mint(to, tokenId);
        require(
            _checkOnERC721Received(address(0), to, tokenId, data),
            "ERC721: transfer to non ERC721Receiver implementer"
        );
    }

    /**
     * @dev Mints `tokenId` and transfers it to `to`.
     *
     * WARNING: Usage of this method is discouraged, use {_safeMint} whenever possible
     *
     * Requirements:
     *
     * - `tokenId` must not exist.
     * - `to` cannot be the zero address.
     *
     * Emits a {Transfer} event.
     */
    function _mint(address to, uint256 tokenId) internal virtual {
        require(to != address(0), "ERC721: mint to the zero address");
        require(!_exists(tokenId), "ERC721: token already minted");

        _beforeTokenTransfer(address(0), to, tokenId);

        _balances[to] += 1;
        _owners[tokenId].enqueue(SharedStructs.Owning(to, block.number));

        emit Transfer(address(0), to, tokenId);

        _afterTokenTransfer(address(0), to, tokenId);
    }

    /**
     * @dev Destroys `tokenId`.
     * The approval is cleared when the token is burned.
     *
     * Requirements:
     *
     * - `tokenId` must exist.
     *
     * Emits a {Transfer} event.
     */
    function _burn(uint256 tokenId) internal virtual {
        address owner = ownerOf(tokenId);

        _beforeTokenTransfer(owner, address(0), tokenId);

        // Clear approvals
        _approve(address(0), tokenId);

        _balances[owner] -= 1;
        delete _owners[tokenId];

        emit Transfer(owner, address(0), tokenId);

        _afterTokenTransfer(owner, address(0), tokenId);
    }

    /**
     * @dev Transfers `tokenId` from `from` to `to`.
     *  As opposed to {transferFrom}, this imposes no restrictions on msg.sender.
     *
     * Requirements:
     *
     * - `to` cannot be the zero address.
     * - `tokenId` token must be owned by `from`.
     *
     * Emits a {Transfer} event.
     */
    function _transfer(
        address from,
        address to,
        uint256 tokenId
    ) internal virtual {
        require(
            ownerOf(tokenId) == from,
            "ERC721R: transfer from incorrect owner"
        );
        require(to != address(0), "ERC721R: transfer to the zero address");
        require(_frozen[tokenId] == false, "ERC721R: transfer frozen token");

        _beforeTokenTransfer(from, to, tokenId);

        // Clear approvals from the previous owner
        _approve(address(0), tokenId);

        _balances[from] -= 1;
        _balances[to] += 1;
        _owners[tokenId].enqueue(SharedStructs.Owning(to, block.number));

        emit Transfer(from, to, tokenId);

        _afterTokenTransfer(from, to, tokenId);
    }

    /**
     * @dev Approve `to` to operate on `tokenId`
     *
     * Emits an {Approval} event.
     */
    function _approve(address to, uint256 tokenId) internal virtual {
        _tokenApprovals[tokenId] = to;
        emit Approval(ownerOf(tokenId), to, tokenId);
    }

    /**
     * @dev Approve `operator` to operate on all of `owner` tokens
     *
     * Emits an {ApprovalForAll} event.
     */
    function _setApprovalForAll(
        address owner,
        address operator,
        bool approved
    ) internal virtual {
        require(owner != operator, "ERC721: approve to caller");
        _operatorApprovals[owner][operator] = approved;
        emit ApprovalForAll(owner, operator, approved);
    }

    /**
     * @dev Internal function to invoke {IERC721Receiver-onERC721Received} on a target address.
     * The call is not executed if the target address is not a contract.
     *
     * @param from address representing the previous owner of the given token ID
     * @param to target address that will receive the tokens
     * @param tokenId uint256 ID of the token to be transferred
     * @param data bytes optional data to send along with the call
     * @return bool whether the call correctly returned the expected magic value
     */
    function _checkOnERC721Received(
        address from,
        address to,
        uint256 tokenId,
        bytes memory data
    ) private returns (bool) {
        if (to.isContract()) {
            try
                IERC721Receiver(to).onERC721Received(
                    _msgSender(),
                    from,
                    tokenId,
                    data
                )
            returns (bytes4 retval) {
                return retval == IERC721Receiver.onERC721Received.selector;
            } catch (bytes memory reason) {
                if (reason.length == 0) {
                    revert(
                        "ERC721: transfer to non ERC721Receiver implementer"
                    );
                } else {
                    assembly {
                        revert(add(32, reason), mload(reason))
                    }
                }
            }
        } else {
            return true;
        }
    }

    /**
     * @dev Hook that is called before any token transfer. This includes minting
     * and burning.
     *
     * Calling conditions:
     *
     * - When `from` and `to` are both non-zero, ``from``'s `tokenId` will be
     * transferred to `to`.
     * - When `from` is zero, `tokenId` will be minted for `to`.
     * - When `to` is zero, ``from``'s `tokenId` will be burned.
     * - `from` and `to` are never both zero.
     *
     * To learn more about hooks, head to xref:ROOT:extending-contracts.adoc#using-hooks[Using Hooks].
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal virtual {}

    /**
     * @dev Hook that is called after any transfer of tokens. This includes
     * minting and burning.
     *
     * Calling conditions:
     *
     * - when `from` and `to` are both non-zero.
     * - `from` and `to` are never both zero.
     *
     * To learn more about hooks, head to xref:ROOT:extending-contracts.adoc#using-hooks[Using Hooks].
     */
    function _afterTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal virtual {}

    function getOwnings(uint256 tokenId)
        external
        view
        returns (SharedStructs.Owning[] memory)
    {
        return _owners[tokenId].getOwningQueueArr();
    }

    function owningGetFirst(uint256 tokenId) external view returns (uint256) {
        return _owners[tokenId].getFirst();
    }

    function owningGetLength(uint256 tokenId) external view returns (uint256) {
        return _owners[tokenId].length();
    }
}

library SharedStructs {
    struct Owning {
        address owner;
        uint256 startBlock;
    }
}

contract OwningQueue {
    mapping(uint256 => SharedStructs.Owning) public queue;
    uint256 first = 0;
    uint256 last = 0; // not inclusive
    uint256 MAX_INT =
        0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff;

    function enqueue(SharedStructs.Owning memory data) public {
        queue[last] = data;
        unchecked {
            last += 1;
        }
        require(
            first != last,
            "can only use 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff - 1 total slots."
        );
    }

    function dequeue() public {
        require(last != first, "Empty queue.");
        delete queue[first];
        unchecked {
            first += 1;
        }
    }

    function get(uint256 idx)
        external
        view
        returns (SharedStructs.Owning memory data)
    {
        return queue[idx];
    }

    function length() public view returns (uint256 len) {
        return last - first;
        //works with wrap arounds
    }

    function getFirst() public view returns (uint256) {
        return first;
    }

    function getLast() public view returns (uint256) {
        return last;
    }

    function getOwningQueueArr()
        external
        view
        returns (SharedStructs.Owning[] memory)
    {
        // should only be called by offchain find_index script
        SharedStructs.Owning[] memory owningArr = new SharedStructs.Owning[](
            this.length()
        );
        for (uint256 i = first; i < last; i++) {
            owningArr[i - first] = queue[i];
        }
        return owningArr;
    }
}
