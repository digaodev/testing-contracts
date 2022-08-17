import { ethers } from "hardhat";

async function main() {
  const [owner] = await ethers.getSigners();
  const EtherWallet = await ethers.getContractFactory("EtherWallet");
  const etherWallet = await EtherWallet.deploy(owner.address);

  await etherWallet.deployed();

  console.log(`EtherWallet contract deployed to ${etherWallet.address}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
