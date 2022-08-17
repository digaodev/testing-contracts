import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherWallet", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployWithOwnerSetFixture() {
    const [owner, otherAccount] = await ethers.getSigners();

    const EtherWallet = await ethers.getContractFactory("EtherWallet");
    const etherWallet = await EtherWallet.deploy(owner.address);

    return { etherWallet, owner, otherAccount };
  }

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      const { etherWallet, owner } = await loadFixture(deployWithOwnerSetFixture);

      expect(await etherWallet.owner()).to.equal(owner.address);
    });

    it("Should start without any funds", async function () {
      const { etherWallet } = await loadFixture(deployWithOwnerSetFixture);

      expect(await ethers.provider.getBalance(etherWallet.address)).to.equal(0);
    });
  });

  describe("Send and Receive", function () {
    describe("Validations", function () {
      it("Should revert with the right error if sending from another account", async function () {
        const { etherWallet, otherAccount } = await loadFixture(
          deployWithOwnerSetFixture
        );

        await expect(etherWallet.connect(otherAccount).send(otherAccount.address, 1000))
          .to.be.revertedWith("Only owner is allowed.");
      });
    });

    describe("Transfers", function () {
      it("Should deposit ether to the wallet and update its balance", async function () {
        const { etherWallet, owner } = await loadFixture(
          deployWithOwnerSetFixture
        );

        const tx = await etherWallet.deposit({ from: owner.address, value: 1000 });
        await tx.wait();

        expect(await etherWallet.balanceOf()).to.equal(1000);
      });

      it("Should send ether from the wallet to another account", async function () {
        const { etherWallet, owner, otherAccount } = await loadFixture(
          deployWithOwnerSetFixture
        );

        const tx = await etherWallet.deposit({ from: owner.address, value: 1000 });
        await tx.wait();

        await expect(() => etherWallet.send(otherAccount.address, 500))
          .to.changeEtherBalances(
            [etherWallet, otherAccount],
            [-500, 500]
          );
      });
    });


    describe("Events", function () {
      it("Should emit an event on withdrawals", async function () {
        const { etherWallet, owner, otherAccount } = await loadFixture(
          deployWithOwnerSetFixture
        );

        const tx = await etherWallet.deposit({ from: owner.address, value: 1000 });
        await tx.wait();

        await expect(etherWallet.send(otherAccount.address, 500))
          .to.emit(etherWallet, "Send")
          .withArgs(otherAccount.address, 500);
      });
    });
  });
});
