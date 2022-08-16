import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleCrud", function () {
  async function deployWithCleanFixture() {
    const SimpleCrud = await ethers.getContractFactory("SimpleCrud");
    const simpleCrud = await SimpleCrud.deploy();

    return { simpleCrud };
  }

  describe("CRUD", function () {
    it("Should create a new user", async function () {
      const { simpleCrud } = await loadFixture(deployWithCleanFixture);

      const tx = await simpleCrud.create("Bob");
      await tx.wait();

      const [createdUserId, createdUserName] = await simpleCrud.read(1);

      expect(createdUserId).to.equal(1);
      expect(createdUserName).to.equal("Bob");
    });

    it("Should read an existing user", async function () {
      const { simpleCrud } = await loadFixture(deployWithCleanFixture);

      const tx = await simpleCrud.create("Bob");
      await tx.wait();

      const tx2 = await simpleCrud.create("Alice");
      await tx2.wait();

      const [createdUserId, createdUserName] = await simpleCrud.read(2);

      expect(createdUserId).to.equal(2);
      expect(createdUserName).to.equal("Alice");
    });

    it("Should revert with correct message when reading a non-existent user", async function () {
      const { simpleCrud } = await loadFixture(deployWithCleanFixture);
      const invalidId = 10;

      await expect(simpleCrud.read(invalidId)).to.be.revertedWith("User not found");
    });

    it("Should update the name value of an existing user", async function () {
      const { simpleCrud } = await loadFixture(deployWithCleanFixture);

      const tx = await simpleCrud.create("Bob");
      await tx.wait();

      const tx2 = await simpleCrud.update(1, "Bob Doe");
      await tx2.wait();

      const [, updatedUserName] = await simpleCrud.read(1);

      expect(updatedUserName).to.equal("Bob Doe");
    });

    it("Should revert with correct message when updating a non-existent user", async function () {
      const { simpleCrud } = await loadFixture(deployWithCleanFixture);
      const invalidId = 10;

      await expect(simpleCrud.update(invalidId, "AnyUserName")).to.be.revertedWith("User not found");
    });

    it("Should delete an existing user", async function () {
      const { simpleCrud } = await loadFixture(deployWithCleanFixture);

      const tx = await simpleCrud.create("Bob");
      await tx.wait();

      const tx2 = await simpleCrud.destroy(1);
      await tx2.wait();

      await expect(simpleCrud.destroy(1)).to.be.revertedWith("User not found");
    });

    it("Should revert with correct message when deleting a non-existent user", async function () {
      const { simpleCrud } = await loadFixture(deployWithCleanFixture);
      const invalidId = 10;

      await expect(simpleCrud.destroy(invalidId)).to.be.revertedWith("User not found");
    });
  });
});
