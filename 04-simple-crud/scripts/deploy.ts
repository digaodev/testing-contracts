import { ethers } from "hardhat";

async function main() {
  const SimpleCrud = await ethers.getContractFactory("SimpleCrud");
  const simpleCrud = await SimpleCrud.deploy();

  await simpleCrud.deployed();

  console.log("SimpleCrud contract deployed to:", simpleCrud.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
