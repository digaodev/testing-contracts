import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("DAO", function () {
  async function deployWithCleanFixture() {
    const CONTRIBUTION_END_TIME = 1000;
    const VOTE_TIME = 500;
    const QUORUM = 100;

    const [admin, investor1, investor2, recipient] = await ethers.getSigners();

    const DAO = await ethers.getContractFactory("DAO");
    const dao = await DAO.deploy(CONTRIBUTION_END_TIME, VOTE_TIME, QUORUM);

    const CONTRIBUTED_AMOUNT = 1000;
    const CONTRIBUTION_END = (await time.latest()) + CONTRIBUTION_END_TIME;

    return {
      dao,
      admin,
      investor1,
      investor2,
      recipient,
      VOTE_TIME,
      QUORUM,
      CONTRIBUTION_END,
      CONTRIBUTED_AMOUNT
    };
  }
  async function deployWithContributionFixture() {
    const CONTRIBUTION_END_TIME = 1000;
    const VOTE_TIME = 500;
    const QUORUM = 100;

    const [admin, investor1, investor2, recipient] = await ethers.getSigners();

    const DAO = await ethers.getContractFactory("DAO");
    const dao = await DAO.deploy(CONTRIBUTION_END_TIME, VOTE_TIME, QUORUM);

    const CONTRIBUTED_AMOUNT = 1000;
    const CONTRIBUTION_END = (await time.latest()) + CONTRIBUTION_END_TIME;

    const tx = await dao.connect(investor1).contribute({
      value: CONTRIBUTED_AMOUNT
    });
    await tx.wait();

    return {
      dao,
      admin,
      investor1,
      investor2,
      recipient,
      VOTE_TIME,
      QUORUM,
      CONTRIBUTION_END,
      CONTRIBUTED_AMOUNT
    };
  }
  async function deployWithProposalFixture() {
    const CONTRIBUTION_END_TIME = 1000;
    const VOTE_TIME = 500;
    const QUORUM = 100;

    const [admin, investor1, investor2, recipient] = await ethers.getSigners();

    const DAO = await ethers.getContractFactory("DAO");
    const dao = await DAO.deploy(CONTRIBUTION_END_TIME, VOTE_TIME, QUORUM);

    const CONTRIBUTED_AMOUNT = 600;
    const PROPOSAL_NAME = "Test Proposal";
    const PROPOSAL_AMOUNT = 500;
    const CONTRIBUTION_END = (await time.latest()) + CONTRIBUTION_END_TIME;


    const tx = await dao.connect(investor1).contribute({
      value: CONTRIBUTED_AMOUNT
    });
    await tx.wait();

    const tx2 = await dao.connect(investor2).contribute({
      value: CONTRIBUTED_AMOUNT
    });
    await tx2.wait();

    const tx3 = await dao.connect(investor1).createProposal(
      PROPOSAL_NAME,
      PROPOSAL_AMOUNT,
      recipient.address
    );
    await tx3.wait();

    return {
      dao,
      admin,
      investor1,
      investor2,
      recipient,
      VOTE_TIME,
      QUORUM,
      CONTRIBUTION_END,
      CONTRIBUTED_AMOUNT
    };
  }

  describe("Deployment", function () {
    it("Should set the right default values", async function () {
      const {
        dao,
        admin,
        CONTRIBUTION_END,
        VOTE_TIME,
        QUORUM
      } = await loadFixture(deployWithCleanFixture);

      expect(await dao.admin()).to.equal(admin.address);
      expect(await dao.contributionEnd()).to.equal(CONTRIBUTION_END);
      expect(await dao.voteTime()).to.equal(VOTE_TIME);
      expect(await dao.quorum()).to.equal(QUORUM);
    });
    it("Should revert if quorum is greater then 1000", async function () {
      const CONTRIBUTION_END_TIME = 1000;
      const VOTE_TIME = 500;
      const QUORUM = 2000;

      const DAO = await ethers.getContractFactory("DAO");

      await expect(
        DAO.deploy(CONTRIBUTION_END_TIME, VOTE_TIME, QUORUM)
      ).to.be.revertedWith("Quorum must be greater than 0 and less than 100");
    });
  });

  describe("DAO", function () {
    describe("Contribution", function () {
      it("Should accept a contribution within the allowed period", async function () {
        const { dao, investor1, CONTRIBUTED_AMOUNT } = await loadFixture(
          deployWithCleanFixture
        );

        const tx = await dao.connect(investor1).contribute({
          value: CONTRIBUTED_AMOUNT
        });
        await tx.wait();

        expect(await dao.investors(investor1.address)).to.be.true;
        expect(await dao.shares(investor1.address)).to.equal(CONTRIBUTED_AMOUNT);
        expect(await dao.totalShares()).to.equal(CONTRIBUTED_AMOUNT);
        expect(await dao.availableFunds()).to.equal(CONTRIBUTED_AMOUNT);
      });

      it("Should revert when trying to make a contribution after the allowed period", async function () {
        const { dao, investor1, CONTRIBUTED_AMOUNT, CONTRIBUTION_END } = await loadFixture(
          deployWithCleanFixture
        );

        await time.increaseTo(CONTRIBUTION_END);

        await expect(
          dao.connect(investor1).contribute({ value: CONTRIBUTED_AMOUNT })
        ).to.be.revertedWith("Contribution period to this DAO has ended");
      });
    });

    describe("Redeem", function () {
      it("Should redeem at least the amount contributed", async function () {
        const { dao, investor1, CONTRIBUTED_AMOUNT } = await loadFixture(
          deployWithContributionFixture
        );

        const REDEEMED_AMOUNT = 1000;

        await expect(dao.connect(investor1).redeem(REDEEMED_AMOUNT))
          .to.changeEtherBalances(
            [investor1, dao],
            [REDEEMED_AMOUNT, -REDEEMED_AMOUNT]
          );

        expect(await dao.shares(investor1.address)).to.equal(CONTRIBUTED_AMOUNT - REDEEMED_AMOUNT);
        expect(await dao.totalShares()).to.equal(CONTRIBUTED_AMOUNT - REDEEMED_AMOUNT);
        expect(await dao.availableFunds()).to.equal(CONTRIBUTED_AMOUNT - REDEEMED_AMOUNT);
      });

      it("Should revert when trying to redeem more than the amount contributed", async function () {
        const { dao, investor1 } = await loadFixture(
          deployWithContributionFixture
        );

        const REDEEMED_AMOUNT = 2000;

        await expect(
          dao.connect(investor1).redeem(REDEEMED_AMOUNT)
        ).to.be.revertedWith("Insufficient shares available");
      });
    });

    describe("Transfer Shares", function () {
      it("Should transfer shares to another address", async function () {
        const { dao, investor1, investor2, CONTRIBUTED_AMOUNT } = await loadFixture(
          deployWithContributionFixture
        );
        const SHARES_AMOUNT = 1000;

        const tx = await dao.connect(investor1).transfer(SHARES_AMOUNT, investor2.address);
        await tx.wait();

        expect(await dao.shares(investor1.address)).to.equal(CONTRIBUTED_AMOUNT - SHARES_AMOUNT);
        expect(await dao.shares(investor2.address)).to.equal(SHARES_AMOUNT);
        expect(await dao.investors(investor2.address)).to.be.true;
        expect(await dao.totalShares()).to.equal(CONTRIBUTED_AMOUNT);
        expect(await dao.availableFunds()).to.equal(CONTRIBUTED_AMOUNT);
      });

      it("Should revert when trying to transfer more shares than the amount owned", async function () {
        const { dao, investor1, investor2 } = await loadFixture(
          deployWithContributionFixture
        );

        const SHARES_AMOUNT_OVER = 2000;

        await expect(
          dao.connect(investor1).transfer(SHARES_AMOUNT_OVER, investor2.address)
        ).to.be.revertedWith("Insufficient shares available");
      });
    });

    describe("Proposal", function () {
      it("Should create a new proposal if investor", async function () {
        const { dao, investor1, recipient, CONTRIBUTED_AMOUNT, VOTE_TIME } = await loadFixture(
          deployWithContributionFixture
        );

        const PROPOSAL_NAME = "My proposal";
        const PROPOSAL_AMOUNT = 1000;

        const tx = await dao.connect(investor1).createProposal(
          PROPOSAL_NAME,
          PROPOSAL_AMOUNT,
          recipient.address
        );
        await tx.wait();

        const createdProposal = await dao.proposals(1);

        expect(createdProposal.id).to.equal(1);
        expect(createdProposal.name).to.equal(PROPOSAL_NAME);
        expect(createdProposal.amount).to.equal(PROPOSAL_AMOUNT);
        expect(createdProposal.recipient).to.equal(recipient.address);
        expect(createdProposal.votes).to.equal(0);
        expect(createdProposal.executed).to.be.false;
        expect(await dao.nextProposalId()).to.equal(2);
      });

      it("Should revert when creating a proposal with greater funds than the amount available", async function () {
        const { dao, investor1, recipient } = await loadFixture(
          deployWithContributionFixture
        );

        const PROPOSAL_NAME = "My proposal";
        const PROPOSAL_AMOUNT_OVER = 2000;

        await expect(
          dao.connect(investor1).createProposal(
            PROPOSAL_NAME,
            PROPOSAL_AMOUNT_OVER,
            recipient.address
          )
        ).to.be.revertedWith("Not enough funds");
      });

      it("Should revert when creating a proposal not being an investor", async function () {
        const { dao, recipient } = await loadFixture(
          deployWithContributionFixture
        );

        const PROPOSAL_NAME = "My proposal";
        const PROPOSAL_AMOUNT_OVER = 2000;

        await expect(
          dao.connect(recipient).createProposal(
            PROPOSAL_NAME,
            PROPOSAL_AMOUNT_OVER,
            recipient.address
          )
        ).to.be.revertedWith("Only investors can perform this activity");
      });
    });

    describe("Vote", function () {
      it("Should add a vote if investor", async function () {
        const { dao, investor1, investor2, CONTRIBUTED_AMOUNT } = await loadFixture(
          deployWithProposalFixture
        );

        const PROPOSAL_ID = 1;
        const TOTAL_CONTRIBUTED_AMOUNT = CONTRIBUTED_AMOUNT * 2;

        const tx = await dao.connect(investor1).vote(PROPOSAL_ID);
        await tx.wait();

        const tx2 = await dao.connect(investor2).vote(PROPOSAL_ID);
        await tx2.wait();

        expect((await dao.proposals(PROPOSAL_ID)).votes).to.equal(TOTAL_CONTRIBUTED_AMOUNT);
        expect(await dao.votes(investor1.address, PROPOSAL_ID)).to.be.true;
        expect(await dao.votes(investor2.address, PROPOSAL_ID)).to.be.true;
      });

      it("Should revert when voting for a proposal more than once", async function () {
        const { dao, investor1 } = await loadFixture(
          deployWithProposalFixture
        );

        const PROPOSAL_ID = 1;

        await dao.connect(investor1).vote(PROPOSAL_ID);

        await expect(dao.connect(investor1).vote(PROPOSAL_ID))
          .to.be.revertedWith("Already voted for this proposal");
      });

      it("Should revert if not investor when voting for a proposal", async function () {
        const { dao, recipient } = await loadFixture(
          deployWithProposalFixture
        );

        const PROPOSAL_ID = 1;

        await expect(dao.connect(recipient).vote(PROPOSAL_ID))
          .to.be.revertedWith("Only investors can perform this activity");
      });

      it("Should revert when voting for a proposal after the end period expired", async function () {
        const { dao, recipient, VOTE_TIME } = await loadFixture(
          deployWithProposalFixture
        );

        const PROPOSAL_ID = 1;

        const currentTimestamp = await time.latest();
        await time.increaseTo(currentTimestamp + VOTE_TIME);

        await expect(dao.connect(recipient).vote(PROPOSAL_ID))
          .to.be.revertedWith("Only investors can perform this activity");
      });
    });

    describe("Execute", function () {
      it("Should execute a proposal transfering the funds to the recipient", async function () {
        const { dao, admin, investor1, investor2, recipient, CONTRIBUTED_AMOUNT } = await loadFixture(
          deployWithProposalFixture
        );

        const PROPOSAL_ID = 1;
        const TOTAL_CONTRIBUTED_AMOUNT = CONTRIBUTED_AMOUNT * 2;

        const tx = await dao.connect(investor1).vote(PROPOSAL_ID);
        await tx.wait();

        const tx2 = await dao.connect(investor2).vote(PROPOSAL_ID);
        await tx2.wait();

        const proposal = await dao.proposals(PROPOSAL_ID);


        await expect(dao.connect(admin).executeProposal(PROPOSAL_ID))
          .to.changeEtherBalances(
            [recipient, dao],
            [proposal.amount, -proposal.amount]
          );

        expect(await dao.availableFunds()).to.equal(TOTAL_CONTRIBUTED_AMOUNT - proposal.amount.toNumber());
      });

      it("Should revert when executing a proposal with insufficient votes", async function () {
        const { dao, admin } = await loadFixture(
          deployWithProposalFixture
        );

        const PROPOSAL_ID = 1;

        await expect(dao.connect(admin).executeProposal(PROPOSAL_ID))
          .to.be.revertedWith("Not enough votes to execute the proposal");
      });

      it("Should revert if not admin when executing a proposal", async function () {
        const { dao, investor1, investor2, recipient } = await loadFixture(
          deployWithProposalFixture
        );

        const PROPOSAL_ID = 1;

        const tx = await dao.connect(investor1).vote(PROPOSAL_ID);
        await tx.wait();

        const tx2 = await dao.connect(investor2).vote(PROPOSAL_ID);
        await tx2.wait();

        await expect(dao.connect(recipient).executeProposal(PROPOSAL_ID))
          .to.be.revertedWith("Only admin can perform this activity");
      });
    });

    describe("Withdraw", function () {
      it("Should withdraw all available funds if admin", async function () {
        const { dao, admin, recipient, CONTRIBUTED_AMOUNT } = await loadFixture(
          deployWithProposalFixture
        );

        const AVAILABLE_FUNDS = CONTRIBUTED_AMOUNT * 2;

        await expect(dao.connect(admin).withdraw(AVAILABLE_FUNDS, recipient.address))
          .to.changeEtherBalances(
            [recipient, dao],
            [AVAILABLE_FUNDS, -AVAILABLE_FUNDS]
          );

        expect(await dao.availableFunds()).to.equal(0);
      });

      it("Should revert when trying to withdraw more than the available funds", async function () {
        const { dao, admin, recipient } = await loadFixture(
          deployWithProposalFixture
        );

        const WITHDRAW_AMOUNT_OVER = 5000;

        await expect(
          dao.connect(admin).withdraw(WITHDRAW_AMOUNT_OVER, recipient.address)
        ).to.be.revertedWith("Not enough funds");
      });
    });
  });
});
