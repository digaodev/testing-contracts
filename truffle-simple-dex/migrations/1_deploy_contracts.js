const Dai = artifacts.require('mocks/Dai.sol');
const Bat = artifacts.require('mocks/Bat.sol');
const Rep = artifacts.require('mocks/Rep.sol');
const Zrx = artifacts.require('mocks/Zrx.sol');
const Dex = artifacts.require('Dex.sol');

const [DAI, BAT, REP, ZRX] = ['DAI', 'BAT', 'REP', 'ZRX']
  .map(ticker => web3.utils.asciiToHex(ticker));

// register tokens, seed accounts and create multiple orders and trades 
// for easier testing in local/test networks
module.exports = async function (deployer, _network, accounts) {
  const [trader1, trader2, trader3, trader4, _] = accounts;

  const SIDE = {
    BUY: 0,
    SELL: 1
  };

  // deploy contracts
  await deployer.deploy(Dai);
  await deployer.deploy(Bat);
  await deployer.deploy(Rep);
  await deployer.deploy(Zrx);
  await deployer.deploy(Dex);

  const dai = await Dai.deployed();
  const bat = await Bat.deployed();
  const rep = await Rep.deployed();
  const zrx = await Zrx.deployed();
  const dex = await Dex.deployed();

  // register tokens
  await Promise.all([
    dex.addToken(DAI, dai.address),
    dex.addToken(BAT, bat.address),
    dex.addToken(REP, rep.address),
    dex.addToken(ZRX, zrx.address)
  ]);

  const amount = web3.utils.toWei('1000');
  const seedTokenBalance = async (token, trader) => {
    await token.faucet(trader, amount)

    await token.approve(
      dex.address,
      amount,
      { from: trader }
    );

    const ticker = await token.name();

    await dex.deposit(
      web3.utils.asciiToHex(ticker),
      amount,
      { from: trader }
    );
  };

  // seed tokens for the following accounts
  await seedTokenBalance(dai, trader1);
  await seedTokenBalance(bat, trader1);
  await seedTokenBalance(rep, trader1);
  await seedTokenBalance(zrx, trader1);

  await seedTokenBalance(dai, trader2);
  await seedTokenBalance(bat, trader2);
  await seedTokenBalance(rep, trader2);
  await seedTokenBalance(zrx, trader2);

  await seedTokenBalance(dai, trader3);
  await seedTokenBalance(bat, trader3);
  await seedTokenBalance(rep, trader3);
  await seedTokenBalance(zrx, trader3);

  await seedTokenBalance(dai, trader4);
  await seedTokenBalance(bat, trader4);
  await seedTokenBalance(rep, trader4);
  await seedTokenBalance(zrx, trader4);

  const increaseTime = async (seconds) => {
    await web3.currentProvider.send({
      jsonrpc: '2.0',
      method: 'evm_increaseTime',
      params: [seconds],
      id: 0,
    }, () => { });

    await web3.currentProvider.send({
      jsonrpc: '2.0',
      method: 'evm_mine',
      params: [],
      id: 0,
    }, () => { });
  }

  //create several mock trades
  await dex.createLimitOrder(BAT, 1000, 10, SIDE.BUY, { from: trader1 });
  await dex.createMarketOrder(BAT, 1000, SIDE.SELL, { from: trader2 });
  await increaseTime(1);
  await dex.createLimitOrder(BAT, 1200, 11, SIDE.BUY, { from: trader1 });
  await dex.createMarketOrder(BAT, 1200, SIDE.SELL, { from: trader2 });
  await increaseTime(1);
  await dex.createLimitOrder(BAT, 1200, 15, SIDE.BUY, { from: trader1 });
  await dex.createMarketOrder(BAT, 1200, SIDE.SELL, { from: trader2 });
  await increaseTime(1);
  await dex.createLimitOrder(BAT, 1500, 14, SIDE.BUY, { from: trader1 });
  await dex.createMarketOrder(BAT, 1500, SIDE.SELL, { from: trader2 });
  await increaseTime(1);
  await dex.createLimitOrder(BAT, 2000, 12, SIDE.BUY, { from: trader1 });
  await dex.createMarketOrder(BAT, 2000, SIDE.SELL, { from: trader2 });
  await increaseTime(1);
  await dex.createLimitOrder(REP, 1000, 2, SIDE.BUY, { from: trader1 });
  await dex.createMarketOrder(REP, 1000, SIDE.SELL, { from: trader2 });
  await increaseTime(1);
  await dex.createLimitOrder(REP, 500, 4, SIDE.BUY, { from: trader1 });
  await dex.createMarketOrder(REP, 500, SIDE.SELL, { from: trader2 });
  await increaseTime(1);
  await dex.createLimitOrder(REP, 800, 2, SIDE.BUY, { from: trader1 });
  await dex.createMarketOrder(REP, 800, SIDE.SELL, { from: trader2 });
  await increaseTime(1);
  await dex.createLimitOrder(REP, 1200, 6, SIDE.BUY, { from: trader1 });
  await dex.createMarketOrder(REP, 1200, SIDE.SELL, { from: trader2 });
  await increaseTime(1);

  //create several mock orders
  await dex.createLimitOrder(BAT, 1400, 10, SIDE.BUY, { from: trader1 });
  await dex.createLimitOrder(BAT, 1200, 11, SIDE.BUY, { from: trader2 });
  await dex.createLimitOrder(BAT, 1000, 12, SIDE.BUY, { from: trader2 });
  await dex.createLimitOrder(REP, 3000, 4, SIDE.BUY, { from: trader1 });
  await dex.createLimitOrder(REP, 2000, 5, SIDE.BUY, { from: trader1 });
  await dex.createLimitOrder(REP, 500, 6, SIDE.BUY, { from: trader2 });
  await dex.createLimitOrder(ZRX, 4000, 12, SIDE.BUY, { from: trader1 });
  await dex.createLimitOrder(ZRX, 3000, 13, SIDE.BUY, { from: trader1 });
  await dex.createLimitOrder(ZRX, 500, 14, SIDE.BUY, { from: trader2 });
  await dex.createLimitOrder(BAT, 2000, 16, SIDE.SELL, { from: trader3 });
  await dex.createLimitOrder(BAT, 3000, 15, SIDE.SELL, { from: trader4 });
  await dex.createLimitOrder(BAT, 500, 14, SIDE.SELL, { from: trader4 });
  await dex.createLimitOrder(REP, 4000, 10, SIDE.SELL, { from: trader3 });
  await dex.createLimitOrder(REP, 2000, 9, SIDE.SELL, { from: trader3 });
  await dex.createLimitOrder(REP, 800, 8, SIDE.SELL, { from: trader4 });
  await dex.createLimitOrder(ZRX, 1500, 23, SIDE.SELL, { from: trader3 });
  await dex.createLimitOrder(ZRX, 1200, 22, SIDE.SELL, { from: trader3 });
  await dex.createLimitOrder(ZRX, 900, 21, SIDE.SELL, { from: trader4 });
};