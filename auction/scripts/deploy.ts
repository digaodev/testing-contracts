import { ethers } from "hardhat";

async function main() {
  const Auctions = await ethers.getContractFactory("Auctions");
  const auctions = await Auctions.deploy();

  await auctions.deployed();

  console.log(`Auctions contract deployed to ${auctions.address}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
