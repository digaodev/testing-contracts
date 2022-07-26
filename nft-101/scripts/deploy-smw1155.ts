import { ethers } from "hardhat";

async function main() {
  const SuperMarioWorldERC1155 = await ethers.getContractFactory("SuperMarioWorldERC1155");
  const superMarioWorldERC1155 = await SuperMarioWorldERC1155.deploy("SuperMarioWorldOZ", "SMW1155");

  await superMarioWorldERC1155.deployed();

  console.log(`SuperMarioWorldERC1155 contract deployed to ${superMarioWorldERC1155.address}`);

  // url generated by Pinata service when uploading the metadata json file to ipfs
  await superMarioWorldERC1155.mint(10, "https://ipfs.io/ipfs/QmQmPycymiknDRDDidFYkBCMoc1th2dYfxjfE3Gvfi9iZY");

  console.log("NFT successfully minted!");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
