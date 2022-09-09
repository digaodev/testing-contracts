import { ethers } from "hardhat";

async function main() {
  const COMPTROLLER = "0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B";
  const PRICEORACLE = "0x922018674c12a7F0D394ebEEf9B58F186CdE13c1";

  const MyDeFiProject = await ethers.getContractFactory("MyDeFiProject");
  const myDeFiProject = await MyDeFiProject.deploy(COMPTROLLER, PRICEORACLE);

  await myDeFiProject.deployed();

  console.log(`MyDeFiProject was deployed to ${myDeFiProject.address}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
