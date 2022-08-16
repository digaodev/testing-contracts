import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("AdvancedStorage", function () {
  async function deployWithCleanFixture() {
    const AdvancedStorage = await ethers.getContractFactory("AdvancedStorage");
    const advancedStorage = await AdvancedStorage.deploy();

    return { advancedStorage };
  }

  describe("Deployment", function () {
    it("Should set the initial length of the array correctly", async function () {
      const { advancedStorage } = await loadFixture(deployWithCleanFixture);

      expect(await advancedStorage.length()).to.equal(0);
    });
  });


  describe("Actions", function () {
    it("Should add a number to the ids array", async function () {
      const { advancedStorage } = await loadFixture(deployWithCleanFixture);

      const tx = await advancedStorage.add(10);
      await tx.wait();

      expect(await advancedStorage.get(0)).to.equal(10);
    });

    it("Should get a number in a specific position in the ids array", async function () {
      const { advancedStorage } = await loadFixture(deployWithCleanFixture);

      const tx1 = await advancedStorage.add(10);
      await tx1.wait();

      const tx2 = await advancedStorage.add(20);
      await tx2.wait();

      expect(await advancedStorage.get(1)).to.equal(20);
    });

    it("Should get all numbers in the ids array", async function () {
      const { advancedStorage } = await loadFixture(deployWithCleanFixture);

      const tx1 = await advancedStorage.add(10);
      await tx1.wait();

      const tx2 = await advancedStorage.add(20);
      await tx2.wait();

      expect(await advancedStorage.getAll()).to.deep.equal([10, 20]);
    });

    it("Should get the length for the ids array", async function () {
      const { advancedStorage } = await loadFixture(deployWithCleanFixture);

      const tx1 = await advancedStorage.add(10);
      await tx1.wait();

      const tx2 = await advancedStorage.add(20);
      await tx2.wait();

      expect(await advancedStorage.length()).to.equal(2);
    });
  });
});
