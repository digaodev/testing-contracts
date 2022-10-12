import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("Voting", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployWithCleanFixture() {
    const ONE_DAY_IN_SECS = 24 * 60 * 60;

    const endTime = (await time.latest()) + ONE_DAY_IN_SECS;

    // Contracts are deployed using the first signer/account by default
    const [admin, voter1, voter2, voter3] = await ethers.getSigners();

    const Voting = await ethers.getContractFactory("Voting");
    const voting = await Voting.deploy();

    return { voting, admin, voter1, voter2, voter3, endTime };
  }

  async function deployWithVotersAndBallotFixture() {
    const ONE_DAY_IN_SECS = 24 * 60 * 60;

    const endTime = (await time.latest()) + ONE_DAY_IN_SECS;

    // Contracts are deployed using the first signer/account by default
    const [admin, voter1, voter2, voter3] = await ethers.getSigners();

    const Voting = await ethers.getContractFactory("Voting");
    const voting = await Voting.deploy();

    const tx = await voting.addVoters([
      voter1.address,
      voter2.address,
      voter3.address
    ]);
    await tx.wait();

    const newBallot = {
      id: 1,
      name: 'My Ballot',
      choices: ['Choice 1', 'Choice 2', 'Choice 3'],
      endTime
    }

    const tx2 = await voting.createBallot(newBallot.name, newBallot.choices, newBallot.endTime);
    await tx2.wait();

    const latestTimestamp = await time.latest();
    const ballotEndTime = latestTimestamp + endTime;

    return { voting, admin, voter1, voter2, voter3, endTime, ballotEndTime };
  }

  describe("Deployment", function () {
    it("Should set the right admin", async function () {
      const { voting, admin } = await loadFixture(deployWithCleanFixture);

      expect(await voting.admin()).to.equal(admin.address);
    });
  });

  describe("Voters", function () {
    describe("Validations", function () {
      it("Should revert when trying to add voters if not admin", async function () {
        const { voting, voter1, voter2, voter3 } = await loadFixture(deployWithCleanFixture);

        await expect(voting.connect(voter1)
          .addVoters([voter2.address, voter3.address])).to.be.revertedWith(
            "Only admin is allowed"
          );
      });
    });

    describe("Events", function () {
      it("Should emit an event when adding voters", async function () {
        const { voting, admin, voter1, voter2 } = await loadFixture(
          deployWithCleanFixture
        );

        await expect(voting.addVoters([voter1.address, voter2.address]))
          .to.emit(voting, "AddVoters")
          .withArgs(admin.address, [voter1.address, voter2.address]);
      });
    });

    describe("Add Voters", function () {
      it("Should add voters if admin", async function () {
        const { voting, voter1, voter2, voter3 } = await loadFixture(
          deployWithCleanFixture
        );

        const tx = await voting.addVoters([
          voter1.address,
          voter2.address,
          voter3.address
        ]);
        await tx.wait();

        expect(await voting.voters(voter1.address)).to.be.true;
        expect(await voting.voters(voter2.address)).to.be.true;
        expect(await voting.voters(voter3.address)).to.be.true;
      });
    });
  });

  describe("Ballot", function () {
    describe("Validations", function () {
      it("Should revert when trying to create a ballot if not admin", async function () {
        const { voting, voter1, endTime } = await loadFixture(deployWithCleanFixture);

        const newBallot = {
          name: 'My Ballot',
          choices: ['Choice 1', 'Choice 2', 'Choice 3'],
          endTime
        }

        await expect(voting.connect(voter1)
          .createBallot(newBallot.name, newBallot.choices, newBallot.endTime)).to.be.revertedWith(
            "Only admin is allowed"
          );
      });
    });

    describe("Events", function () {
      it("Should emit an event when creating a new ballot", async function () {
        const { voting, admin, endTime } = await loadFixture(deployWithCleanFixture);

        const newBallot = {
          id: 1,
          name: 'My Ballot',
          choices: ['Choice 1', 'Choice 2', 'Choice 3'],
          endTime
        }

        await expect(voting.createBallot(newBallot.name, newBallot.choices, newBallot.endTime))
          .to.emit(voting, "CreateBallot")
          .withArgs(admin.address, newBallot.id, newBallot.name);
      });
    });

    describe("Create Ballot", function () {
      it("Should create a new ballot if admin", async function () {
        const { voting, endTime } = await loadFixture(deployWithCleanFixture);

        const newBallot = {
          id: 1,
          name: 'My Ballot',
          choices: ['Choice 1', 'Choice 2', 'Choice 3'],
          endTime
        }

        const tx = await voting.createBallot(newBallot.name, newBallot.choices, newBallot.endTime);
        await tx.wait();

        const createdBallot = await voting.ballots(newBallot.id);
        const createdBallotChoices = await voting.getBallotChoices(newBallot.id);
        const latestTimestamp = await time.latest();
        const ballotEndTime = latestTimestamp + endTime;

        expect(createdBallot.id).to.equal(newBallot.id);
        expect(createdBallot.name).to.equal(newBallot.name);
        expect(createdBallot.endTime).to.equal(ballotEndTime);
        expect(createdBallotChoices[0].id).to.equal(0);
        expect(createdBallotChoices[0].name).to.equal(newBallot.choices[0]);
        expect(createdBallotChoices[1].id).to.equal(1);
        expect(createdBallotChoices[1].name).to.equal(newBallot.choices[1]);
      });
    });
  });

  describe("Vote", function () {
    describe("Validations", function () {
      it("Should revert when trying to vote if not voter", async function () {
        const { voting } = await loadFixture(deployWithVotersAndBallotFixture);

        const newVote = {
          ballotId: 1,
          choiceId: 1,
        }

        await expect(voting.vote(newVote.ballotId, newVote.choiceId))
          .to.be.revertedWith(
            "Only voter is allowed"
          );
      });

      it("Should revert when trying to vote if ballot id does not exist", async function () {
        const { voting, voter1 } = await loadFixture(deployWithVotersAndBallotFixture);

        const newVote = {
          invalidBallotId: 1000,
          choiceId: 1,
        }

        await expect(voting.connect(voter1).vote(newVote.invalidBallotId, newVote.choiceId))
          .to.be.revertedWith(
            "Ballot ID does not exist"
          );
      });

      it("Should revert when trying to vote if choice id does not exist", async function () {
        const { voting, voter1 } = await loadFixture(deployWithVotersAndBallotFixture);

        const newVote = {
          ballotId: 1,
          invalidChoiceId: 10000,
        }

        await expect(voting.connect(voter1).vote(newVote.ballotId, newVote.invalidChoiceId))
          .to.be.revertedWith(
            "Choice ID does not exist"
          );
      });

      it("Should revert when trying to vote more than once for the same ballot", async function () {
        const { voting, voter1 } = await loadFixture(deployWithVotersAndBallotFixture);

        const newVote = {
          ballotId: 1,
          choiceId: 1,
        }

        const tx = await voting.connect(voter1).vote(newVote.ballotId, newVote.choiceId);
        await tx.wait();

        await expect(voting.connect(voter1).vote(newVote.ballotId, newVote.choiceId))
          .to.be.revertedWith(
            "Already voted for this ballot"
          );
      });

      it("Should revert when trying to vote after the end period", async function () {
        const { voting, voter1, ballotEndTime } = await loadFixture(deployWithVotersAndBallotFixture);

        const newVote = {
          ballotId: 1,
          choiceId: 1,
        }

        await time.increaseTo(ballotEndTime + 100);

        await expect(voting.connect(voter1).vote(newVote.ballotId, newVote.choiceId))
          .to.be.revertedWith(
            "Voting already ended for this ballot"
          );
      });
    });

    describe("Events", function () {
      it("Should emit an event when casting a new vote", async function () {
        const { voting, voter1 } = await loadFixture(deployWithVotersAndBallotFixture);

        const newVote = {
          ballotId: 1,
          choiceId: 1,
        }

        await expect(voting.connect(voter1).vote(newVote.ballotId, newVote.choiceId))
          .to.emit(voting, "Vote")
          .withArgs(voter1.address, newVote.ballotId, newVote.choiceId);
      });
    });

    describe("Cast Vote", function () {
      it("Should cast a new vote and get the results after the end period", async function () {
        const { voting, voter1, voter2, voter3, ballotEndTime } = await loadFixture(
          deployWithVotersAndBallotFixture
        );

        const newVote = {
          ballotId: 1
        }

        const tx = await voting.connect(voter1).vote(newVote.ballotId, 0);
        await tx.wait();
        const tx1 = await voting.connect(voter3).vote(newVote.ballotId, 0);
        await tx1.wait();
        const tx2 = await voting.connect(voter2).vote(newVote.ballotId, 1);
        await tx2.wait();

        await time.increaseTo(ballotEndTime + 100);

        const results = await voting.results(newVote.ballotId);

        await expect(results[0].votes).to.equal(2);
        await expect(results[1].votes).to.equal(1);
        await expect(results[2].votes).to.equal(0);
      });
    });
  });
});
