import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("SplitPayment", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployWithCleanFixture() {
    // Contracts are deployed using the first signer/account by default
    const [owner, recipient1, recipient2, recipient3] = await ethers.getSigners();

    const SplitPayment = await ethers.getContractFactory("SplitPayment");
    const splitPayment = await SplitPayment.deploy();

    return { splitPayment, owner, recipient1, recipient2, recipient3 };
  }

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      const { splitPayment, owner } = await loadFixture(deployWithCleanFixture);

      expect(await splitPayment._owner()).to.equal(owner.address);
    });
  });

  describe("Send", function () {
    describe("Validations", function () {
      it("Should revert with the right error if not owner", async function () {
        const {
          splitPayment,
          recipient1,
          recipient2,
          recipient3
        } = await loadFixture(deployWithCleanFixture);

        await expect(splitPayment.connect(recipient1).send([
          recipient2.address,
          recipient3.address
        ], [
          100,
          200
        ], { value: 300 }))
          .to.be.revertedWith("Only owner is allowed");
      });

      it("Should revert with to and amount have different lengths", async function () {
        const {
          splitPayment,
          recipient1,
          recipient2
        } = await loadFixture(deployWithCleanFixture);

        await expect(splitPayment.send([
          recipient1.address,
          recipient2.address
        ], [
          100,
          200,
          300 // invalid extra param
        ], { value: 600 }))
          .to.be.revertedWith("to and amount must match length");
      });
    });

    describe("Events", function () {
      it("Should emit an event on transfers", async function () {
        const {
          splitPayment,
          owner,
          recipient1,
          recipient2,
          recipient3
        } = await loadFixture(deployWithCleanFixture);

        await expect(splitPayment.send([
          recipient1.address,
          recipient2.address,
          recipient3.address
        ], [
          100,
          200,
          300
        ], { value: 600 }))
          .to.emit(splitPayment, "Transfer")
          .withArgs(
            owner.address,
            [recipient1.address, recipient2.address, recipient3.address],
            [100, 200, 300]);
      });
    });

    describe("Transfers", function () {
      it("Should transfer the funds to the recipients", async function () {
        const {
          splitPayment,
          owner,
          recipient1,
          recipient2,
          recipient3
        } = await loadFixture(deployWithCleanFixture);



        await expect(splitPayment.send([
          recipient1.address,
          recipient2.address,
          recipient3.address
        ], [
          100,
          200,
          300
        ], { value: 600 })).to.changeEtherBalances(
          [owner, recipient1, recipient2, recipient3],
          [-600, 100, 200, 300]
        );
      });
    });
  });
});
