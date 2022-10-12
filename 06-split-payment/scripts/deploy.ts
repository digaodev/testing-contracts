import { ethers } from "hardhat";

async function main() {
  const SplitPayment = await ethers.getContractFactory("SplitPayment");
  const splitPayment = await SplitPayment.deploy();

  await splitPayment.deployed();

  console.log(`SplitPayment deployed to ${splitPayment.address}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
