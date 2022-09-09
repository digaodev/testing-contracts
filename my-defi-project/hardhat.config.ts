import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: "0.8.9",
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      chainId: 31337,
      forking: {
        url: "https://eth-mainnet.g.alchemy.com/v2/H3cr7DHP3k49jyP8uVEUYn1nucb_HNGD",
        blockNumber: 15499391
      }
    }
  }
};

export default config;
