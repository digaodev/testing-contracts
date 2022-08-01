import { ethers } from "hardhat";

async function main() {
  const HelloWorldContract = await ethers.getContractFactory("HelloWorldContract");
  const helloWorldContract = await HelloWorldContract.deploy();

  await helloWorldContract.deployed();

  console.log("HelloWorldContract deployed to:", helloWorldContract.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
