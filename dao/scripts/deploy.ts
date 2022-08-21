import { ethers } from "hardhat";

async function main() {
  const CONTRIBUTION_END_TIME = 2000;
  const QUORUM = 60;
  const VOTE_TIME = 500;

  const DAO = await ethers.getContractFactory("DAO");
  const dao = await DAO.deploy(CONTRIBUTION_END_TIME, VOTE_TIME, QUORUM);

  await dao.deployed();

  console.log(`DAO contract was deployed to ${dao.address}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
