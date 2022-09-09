import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers, artifacts } from "hardhat";

describe("MyDeFiProject", function () {
  const COMPTROLLER = "0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B";
  const PRICEORACLE = "0x922018674c12a7F0D394ebEEf9B58F186CdE13c1";

  // erc20
  const DAI = "0x6B175474E89094C44Da98b954EedeAC495271d0F";

  // compound
  const CDAI = "0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643"
  const CBAT = "0x6C8c6b02E7b2BE14d4fA6022Dfd6d75921D90E4E"

  const SUPPLY_DECIMALS = 8
  const SUPPLY_AMOUNT = 10 ** SUPPLY_DECIMALS
  const BORROW_DECIMALS = 18
  const BORROW_INTEREST = 10 ** 18

  async function deployCleanFixture() {
    const [admin, lender] = await ethers.getSigners();

    const MyDeFiProject = await ethers.getContractFactory("MyDeFiProject");
    const myDeFiProject = await MyDeFiProject.deploy(COMPTROLLER, PRICEORACLE);

    // Fund some DAI
    const Dai = await ethers.getContractFactory("DAI");
    const dai = await Dai.deploy();
    await dai.faucet(lender.address, 100);
    console.log('====balanceOf-1', await dai.balanceOf(lender.address));
    await dai.connect(lender).transfer(myDeFiProject.address, 50);
    console.log('====balanceOf-2', await dai.balanceOf(lender.address));

    return {
      myDeFiProject,
      lender
    };
  }

  describe("Deployment", function () {
    it("Should execute lending and borrow functions", async function () {
      const { myDeFiProject } = await loadFixture(deployCleanFixture);

      await myDeFiProject.supply(CDAI, parseInt(ethers.utils.formatEther(10)));

      await myDeFiProject.enterMarket(CDAI);

      const maxBorrow = await myDeFiProject.getMaxBorrow(CBAT);
      console.log(`Max Bat Balance: ${ethers.utils.formatEther(maxBorrow)}`);

      await myDeFiProject.borrow(CBAT, parseInt(ethers.utils.formatEther(10)));

      // await myDeFiProject.repayBorrow(CBAT, parseInt(ethers.utils.formatEther(5)));

      // await myDeFiProject.redeem(CDAI, 100 * Math.pow(10, 8)); //cToken have 8 decimals

      // const { liquidity } = await myDeFiProject.getAccountLiquidity()
      // const colFactor = await myDeFiProject.getCollateralFactor()
      // const supplied = await myDeFiProject.balanceOfUnderlying.call()
      // const price = await myDeFiProject.getPriceFeed(tokenToBorrow)
      // const maxBorrow = liquidity.div(price)
      // const borrowedBalance = await myDeFiProject.getBorrowedBalance.call(tokenToBorrow)
      // const tokenToBorrowBal = await tokenToBorrow.balanceOf(myDeFiProject.address)
      // const borrowRate = await myDeFiProject.getBorrowRatePerBlock.call(tokenToBorrow)
    });
  });
});
