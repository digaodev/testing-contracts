import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshopt in every test.
  async function deployWithCleanTransfersFixture() {
    // Contracts are deployed using the first 3 signers' address and a quorum of 
    // 2 by default
    const [approver1, approver2, approver3, receiver, faucet] = await ethers.getSigners();
    const approversAddresses = [approver1.address, approver2.address, approver3.address];
    const quorum = 2;
    const transferValue = ethers.utils.parseEther('1');

    const Wallet = await ethers.getContractFactory("Wallet");
    const walletContract = await Wallet.deploy(approversAddresses, quorum);

    // send funds to the contract wallet
    const transferEthers = await faucet.sendTransaction({
      to: walletContract.address,
      value: transferValue,
    });
    await transferEthers.wait();

    return {
      walletContract,
      quorum,
      approversAddresses,
      approver1,
      approver2,
      approver3,
      receiver,
      transferValue
    };
  }

  async function deployWithSingleTransferFixture() {
    // Contracts are deployed using the first 3 signers' address and a quorum of 
    // 2 by default
    const [approver1, approver2, approver3, receiver, faucet] = await ethers.getSigners();
    const approversAddresses = [approver1.address, approver2.address, approver3.address];
    const quorum = 2;
    const transferValue = ethers.utils.parseEther('1');

    const Wallet = await ethers.getContractFactory("Wallet");
    const walletContract = await Wallet.deploy(approversAddresses, quorum);

    // send funds to the contract wallet
    const transferEthers = await faucet.sendTransaction({
      to: walletContract.address,
      value: transferValue,
    });
    await transferEthers.wait();

    // create a single transfer which will have id 0
    const tx = await walletContract
      .connect(approver1)
      .createTransfer(transferValue, receiver.address);

    await tx.wait();

    return {
      walletContract,
      quorum,
      approversAddresses,
      approver1,
      approver2,
      approver3,
      receiver,
      transferValue
    };
  }

  describe("Deployment", function () {
    it("Should set the right number of approvers", async function () {
      const { walletContract, approversAddresses } = await loadFixture(deployWithCleanTransfersFixture);

      const numberOfApprovers = (await walletContract.getApprovers()).length;
      expect(numberOfApprovers).to.equal(approversAddresses.length);
    });

    it("Should set the right number of quorum", async function () {
      const { walletContract, quorum } = await loadFixture(deployWithCleanTransfersFixture);

      expect(await walletContract.quorum()).to.equal(quorum);
    });

    it("Should set the transfers to empty", async function () {
      const { walletContract } = await loadFixture(deployWithCleanTransfersFixture);

      const numberOfTransfers = (await walletContract.getTransfers()).length;
      expect(numberOfTransfers).to.equal(0);
    });

    it("Should set the approvals to empty", async function () {
      const { walletContract } = await loadFixture(deployWithCleanTransfersFixture);

      const numberOfApprovals = (await walletContract.approvals).length;
      expect(numberOfApprovals).to.equal(0);
    });
  });

  describe("Transfers", function () {
    it("Should create a new transfer if sender is an approver", async function () {
      const { walletContract, approver1, receiver, transferValue } =
        await loadFixture(deployWithCleanTransfersFixture);

      const transferId = 0

      const tx = await walletContract.connect(approver1)
        .createTransfer(transferValue, receiver.address);

      tx.wait();

      const transfer = await walletContract.transfers(transferId);
      expect(transfer.id).to.equal(transferId);
      expect(transfer.to).to.equal(receiver.address);
      expect(transfer.amount).to.equal(transferValue);
      expect(transfer.approvals).to.equal(0);
      expect(transfer.sent).to.equal(false);
    });

    it("Should revert with the right error if sender is NOT an approver", async function () {
      const { walletContract, receiver: notApprover } = await loadFixture(
        deployWithCleanTransfersFixture
      );

      const transferValue = 1000000000;

      await expect(walletContract.connect(notApprover)
        .createTransfer(transferValue, notApprover.address)).to.be.revertedWith('only approver allowed');
    });
  });

  describe("Approvals", function () {
    it("Should add one approval if sender is an approver", async function () {
      const { walletContract, approver1 } =
        await loadFixture(deployWithSingleTransferFixture);

      const transferId = 0

      await walletContract.connect(approver1).approveTransfer(transferId);

      const transfer = (await walletContract.getTransfers())[transferId];
      const hasApproval = await walletContract.approvals(approver1.address, transferId);

      expect(transfer.approvals).to.equal(1);
      expect(hasApproval).to.be.true;
    });

    it("Should transfer funds if sender is an approver and the quorum is reached", async function () {
      const { walletContract, approver1, approver2, receiver, transferValue } =
        await loadFixture(deployWithSingleTransferFixture);

      const transferId = 0

      const tx1 = await walletContract.connect(approver1).approveTransfer(transferId);
      tx1.wait();

      await expect(
        walletContract.connect(approver2).approveTransfer(transferId)
      ).to.changeEtherBalance(receiver.address, transferValue);

      const transfer = (await walletContract.getTransfers())[transferId];

      expect(transfer.sent).to.be.true;
    });

    it("Should revert with the right error if sender is an approver that already approved a transfer", async function () {
      const { walletContract, approver1 } =
        await loadFixture(deployWithSingleTransferFixture);

      const transferId = 0

      await walletContract.connect(approver1).approveTransfer(transferId);

      await expect(walletContract.connect(approver1).approveTransfer(transferId))
        .to.be.revertedWith('cannot approve transfer twice');
    });

    it("Should revert with the right error if sender is an approver but the transfer is already sent", async function () {
      const { walletContract, approver1, approver2, approver3 } =
        await loadFixture(deployWithSingleTransferFixture);

      const transferId = 0

      const tx1 = await walletContract.connect(approver1).approveTransfer(transferId);
      tx1.wait();

      const tx2 = await walletContract.connect(approver2).approveTransfer(transferId);
      tx2.wait();

      await expect(walletContract.connect(approver3).approveTransfer(transferId))
        .to.be.revertedWith('transfer has already been sent');
    });

    it("Should revert with the right error if sender is NOT an approver", async function () {
      const { walletContract, receiver: notApprover } =
        await loadFixture(deployWithSingleTransferFixture);

      await expect(walletContract.connect(notApprover).approveTransfer(0))
        .to.be.revertedWith('only approver allowed');
    });
  });
});
