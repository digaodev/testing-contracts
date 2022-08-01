import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("HelloWorldContract", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshopt in every test.
  async function deployWithCleanFixture() {
    const HelloWorldContract = await ethers.getContractFactory("HelloWorldContract");
    const helloWorldContract = await HelloWorldContract.deploy();

    return {
      helloWorldContract
    };
  }

  describe("Deployment", function () {
    it("Should deploy successfully", async function () {
      const { helloWorldContract } = await loadFixture(deployWithCleanFixture);

      expect(helloWorldContract.address).to.not.be.empty;
    });
  });

  describe("Hello", function () {
    it("Should return 'Hello World' when called", async function () {
      const { helloWorldContract } = await loadFixture(deployWithCleanFixture);

      const result = await helloWorldContract.hello();

      expect(result).to.equal("Hello World");
    });
  });
});
