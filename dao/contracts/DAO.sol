// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

/**
 * @title DAO
 * @dev Collect investor"s funds (ether);
 *      Keep track of investor's contributions via shares;
 *      Allow investors to transfer shares;
 *      Allow investment proposals to be created and voted; and
 *      Execute successful investment proposals (i.e send funds)
 */
contract DAO {
    struct Proposal {
        uint id;
        string name;
        uint amount;
        address payable recipient;
        uint votes;
        uint end;
        bool executed;
    }

    mapping(address => bool) public investors;
    mapping(address => uint) public shares;
    mapping(uint => Proposal) public proposals;
    mapping(address => mapping(uint => bool)) public votes;

    uint public totalShares;
    uint public availableFunds;
    uint public nextProposalId = 1;
    uint public immutable contributionEnd;
    uint public immutable voteTime;
    uint public immutable quorum;
    address public immutable admin;

    constructor(
        uint contributionTime,
        uint _voteTime,
        uint _quorum
    ) {
        require(
            _quorum > 0 && _quorum < 1000,
            "Quorum must be greater than 0 and less than 100"
        );

        contributionEnd = block.timestamp + contributionTime;
        voteTime = _voteTime;
        quorum = _quorum;
        admin = msg.sender;
    }

    /**
     * @dev Check if sender is an investor, revert otherwise
     */
    modifier onlyInvestors() {
        require(
            investors[msg.sender] == true,
            "Only investors can perform this activity"
        );
        _;
    }

    /**
     * @dev Check if sender is an admin, revert otherwise
     */
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this activity");
        _;
    }

    /**
     * @dev Contribute ether to this DAO within the allowed period.
     *      Receive ether, add sender as investor and update contract's shares
     *      and funds
     */
    function contribute() external payable {
        require(
            block.timestamp < contributionEnd,
            "Contribution period to this DAO has ended"
        );

        investors[msg.sender] = true;
        shares[msg.sender] += msg.value;
        totalShares += msg.value;
        availableFunds += msg.value;
    }

    /**
     * @dev Withdraw ether and update contract shares and funds
     * @param amount number value in ether to be redeemed
     */
    function redeem(uint amount) external {
        require(shares[msg.sender] >= amount, "Insufficient shares available");
        require(
            availableFunds >= amount,
            "Insufficient funds available for transfer"
        );

        shares[msg.sender] -= amount;
        totalShares -= amount;
        availableFunds -= amount;

        (bool sent, bytes memory data) = payable(msg.sender).call{
            value: amount
        }("");

        require(sent, "Failed to send Ether");
    }

    /**
     * @dev Transfer shares to another address, add recipient to investors and
     *      update both shares
     * @param amount number value in ether to be transferred
     * @param to Recipient that will receive the shares
     */
    function transfer(uint amount, address to) external {
        require(shares[msg.sender] >= amount, "Insufficient shares available");

        shares[msg.sender] -= amount;
        shares[to] += amount;
        investors[to] = true;
    }

    /**
     * @dev Create a new proposal and update the contracts's funds
     * @param name string value that represents the proposal
     * @param amount number value needed in ether to achieve the proposal's goal
     * @param recipient Recipient that will receive the funds
     */
    function createProposal(
        string calldata name,
        uint amount,
        address payable recipient
    ) external onlyInvestors {
        require(availableFunds >= amount, "Not enough funds");

        proposals[nextProposalId] = Proposal({
            id: nextProposalId,
            name: name,
            amount: amount,
            recipient: recipient,
            votes: 0,
            end: block.timestamp + voteTime,
            executed: false
        });

        nextProposalId++;
    }

    /**
     * @dev Vote for a proposal. Use sender's shares to vote on a proposal
     * @param proposalId number value for the proposal's identifier
     */
    function vote(uint proposalId) external onlyInvestors {
        require(
            votes[msg.sender][proposalId] == false,
            "Already voted for this proposal"
        );

        Proposal storage proposal = proposals[proposalId];

        require(
            block.timestamp < proposal.end,
            "Voting period has ended for this proposal"
        );

        proposal.votes += shares[msg.sender];
        votes[msg.sender][proposalId] = true;
    }

    /**
     * @dev Transfer ether from the contract to the recipient address
     * @param amount number value for ether to be transferred
     * @param to address value for the recipient
     */
    function _transferEther(uint amount, address payable to) internal {
        require(amount <= availableFunds, "Not enough funds");

        availableFunds -= amount;

        (bool sent, bytes memory data) = to.call{value: amount}("");

        require(sent, "Failed to send Ether");
    }

    /**
     * @dev Transfer the funds to the proposal's recipient (if admin and if it 
     *      has enough votes) within the execution period
     * @param proposalId number value for the proposal's identifier
     */
    function executeProposal(uint proposalId) external onlyAdmin {
        Proposal memory proposal = proposals[proposalId];

        require(block.timestamp < proposal.end, "Execution period has ended");
        require(proposal.executed == false, "Proposal already executed");
        require(
            (proposal.votes / totalShares) * 100 >= quorum,
            "Not enough votes to execute the proposal"
        );

        _transferEther(proposal.amount, proposal.recipient);
    }

    /**
     * @dev Withdraw ether from the contract to the recipient address (if admin)
     * @param amount number value for ether to be transferred
     * @param to address value for the recipient
     */
    function withdraw(uint amount, address payable to) external onlyAdmin {
        _transferEther(amount, to);
    }

    /**
     * @dev For ether returns of proposal investments
     */
    receive() external payable {
        availableFunds += msg.value;
    }
}
