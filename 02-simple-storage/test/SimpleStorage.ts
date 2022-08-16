import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleStorage", function () {
  async function deployWithCleanFixture() {
    const SimpleStorage = await ethers.getContractFactory("SimpleStorage");
    const simpleStorage = await SimpleStorage.deploy();

    return { simpleStorage };
  }

  describe("Deployment", function () {
    it("Should deploy successfully with the right default value", async function () {
      const { simpleStorage } = await loadFixture(deployWithCleanFixture);

      expect(await simpleStorage.retrieve()).to.equal('');
    });
  });

  describe("Store and Retrieve", function () {
    it("Should store a string value and retrieve it correctly", async function () {
      const { simpleStorage } = await loadFixture(deployWithCleanFixture);
      const textToStore = 'John Doe'

      const tx = await simpleStorage.store(textToStore)
      await tx.wait()

      expect(await simpleStorage.retrieve()).to.equal(textToStore);
    });
  });  
});
