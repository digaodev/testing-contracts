import { ethers } from "hardhat";

async function main() {
  const [approver1, approver2, approver3] = await ethers.getSigners();
  const approvers = [approver1.address, approver2.address, approver3.address];
  const quorum = 2;

  const Wallet = await ethers.getContractFactory("Wallet");
  const wallet = await Wallet.deploy(approvers, quorum);

  await wallet.deployed();

  console.log(
    `Wallet deployed with ${approvers.length} approvers and a quorum of ${quorum}`
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
