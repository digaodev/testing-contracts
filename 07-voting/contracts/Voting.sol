// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

// Uncomment this line to use console.log
// import "hardhat/console.sol";

/**
 * @title Voting
 * @dev Contract capable of creating ballots and choices and allow voting
 */
contract Voting {
    address public immutable admin;
    uint private _nextBallotId = 1;

    struct ChoiceWithoutVotes {
        uint id;
        string name;
    }

    struct Choice {
        uint id;
        string name;
        uint votes;
    }

    struct Ballot {
        uint id;
        string name;
        Choice[] choices;
        uint endTime;
    }

    // allowed voters
    mapping(address => bool) public voters;

    // ballotId => Ballot struct
    mapping(uint => Ballot) public ballots;

    // voter => ballot => bool (voter already cast a vote on a ballot)
    mapping(address => mapping(uint => bool)) public voted;

    /**
     * @dev Event for when one or more voters are added
     * @param admin address of the admin
     * @param voters array of voter addresses to enable voting
     */

    event AddVoters(address indexed admin, address[] voters);

    /**
     * @dev Event for when a new ballot is created
     * @param sender address of the ballot creator (sender)
     * @param ballotId newly created ballot id
     * @param ballotName newly created ballot name
     */
    event CreateBallot(
        address indexed sender,
        uint indexed ballotId,
        string indexed ballotName
    );

    /**
     * @dev Event for when a new vote is cast
     * @param voter address of the voter (sender)
     * @param ballotId id for the ballot
     * @param choiceId id for the choice
     */
    event Vote(address voter, uint indexed ballotId, uint indexed choiceId);

    constructor() payable {
        admin = msg.sender;
    }

    modifier onlyAdmin() {
        require(admin == msg.sender, "Only admin is allowed");

        _;
    }

    modifier ballotExists(uint ballotId) {
        require(ballots[ballotId].id == ballotId, "Ballot ID does not exist");

        _;
    }

    modifier choiceExists(uint ballotId, uint choiceId) {
        require(choiceId < ballots[ballotId].choices.length, "Choice ID does not exist");

        _;
    }

    /**
     * @dev Add one or more voters to allow voting
     * @param _voters array of voter addresses to enable voting
     */
    function addVoters(address[] calldata _voters) external onlyAdmin {
        for (uint i = 0; i < _voters.length; i++) {
            voters[_voters[i]] = true;
        }

        emit AddVoters(msg.sender, _voters);
    }

    /**
     * @dev Create a new ballot
     * @param name name of the ballot
     * @param choices array of strings representing each choice for this ballot
     * @param endTimeOffset number in seconds for time period to allow voting
     */
    function createBallot(
        string calldata name,
        string[] calldata choices,
        uint endTimeOffset
    ) external onlyAdmin {
        ballots[_nextBallotId].id = _nextBallotId;
        ballots[_nextBallotId].name = name;
        ballots[_nextBallotId].endTime = block.timestamp + endTimeOffset;

        for (uint i = 0; i < choices.length; i++) {
            ballots[_nextBallotId].choices.push(Choice(i, choices[i], 0));
        }

        emit CreateBallot(msg.sender, _nextBallotId, name);

        _nextBallotId++;
    }

    /**
     * @dev Cast a new vote
     * @param ballotId number id for the ballot
     * @param choiceId number id for the choice
     */
    function vote(uint ballotId, uint choiceId)
        external
        ballotExists(ballotId)
        choiceExists(ballotId, choiceId)
    {
        require(voters[msg.sender], "Only voter is allowed");
        require(!voted[msg.sender][ballotId], "Already voted for this ballot");
        require(
            block.timestamp < ballots[ballotId].endTime,
            "Voting already ended for this ballot"
        );

        Choice storage choice = ballots[ballotId].choices[choiceId];
        choice.votes++;

        voted[msg.sender][ballotId] = true;

        emit Vote(msg.sender, ballotId, choiceId);
    }

    /**
     * @dev Returns the results of a specific ballot (when it has ended)
     * @param ballotId number id for the ballot
     * @return array of all the choices for this ballot with its votes
     */
    function results(uint ballotId)
        external
        view
        ballotExists(ballotId)
        returns (Choice[] memory)
    {
        require(
            block.timestamp > ballots[ballotId].endTime,
            "Voting is still in progress for this ballot"
        );

        Choice[] memory choices = ballots[ballotId].choices;

        return choices;
    }

    /**
     * @dev Returns the choices for a specific ballot (without the votes)
     * @param ballotId number id for the ballot
     * @return array of all the choices for this ballot without its votes
     */
    function getBallotChoices(uint ballotId)
        external
        view
        ballotExists(ballotId)
        returns (ChoiceWithoutVotes[] memory)
    {
        Choice[] memory choicesWithVotes = ballots[ballotId].choices;

        uint choicesWithVotesLen = choicesWithVotes.length;

        ChoiceWithoutVotes[] memory choices = new ChoiceWithoutVotes[](
            choicesWithVotesLen
        );

        for (uint256 i = 0; i < choicesWithVotesLen; i++) {
            choices[i].id = choicesWithVotes[i].id;
            choices[i].name = choicesWithVotes[i].name;
        }

        return choices;
    }
}
