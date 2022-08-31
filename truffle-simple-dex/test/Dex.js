const { expectRevert } = require('@openzeppelin/test-helpers');
const Dai = artifacts.require('mocks/Dai.sol');
const Bat = artifacts.require('mocks/Bat.sol');
const Rep = artifacts.require('mocks/Rep.sol');
const Zrx = artifacts.require('mocks/Zrx.sol');
const Dex = artifacts.require('Dex.sol');

const SIDE = {
  BUY: 0,
  SELL: 1
};

contract('Dex', (accounts) => {
  let dai, bat, rep, zrx, dex;

  const [admin, trader1, trader2] = [accounts[0], accounts[1], accounts[2]];

  const [DAI, BAT, REP, ZRX] = ['DAI', 'BAT', 'REP', 'ZRX']
    .map(ticker => web3.utils.asciiToHex(ticker));

  beforeEach(async () => {
    ([dai, bat, rep, zrx] = await Promise.all([
      Dai.new(),
      Bat.new(),
      Rep.new(),
      Zrx.new()
    ]));

    dex = await Dex.new();

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
    };

    await seedTokenBalance(dai, trader1);
    await seedTokenBalance(bat, trader1);
    await seedTokenBalance(rep, trader1);
    await seedTokenBalance(zrx, trader1);

    await seedTokenBalance(dai, trader2);
    await seedTokenBalance(bat, trader2);
    await seedTokenBalance(rep, trader2);
    await seedTokenBalance(zrx, trader2);
  });

  it('should correctly set the admin on deploy', async () => {
    const contractAdmin = await dex.admin();

    assert.equal(contractAdmin, admin);
  });

  it('should revert when adding a new token if NOT admin', async () => {
    await expectRevert(
      dex.addToken(web3.utils.asciiToHex(DAI), dai.address, { from: trader1 }),
      'Only admin is allowed'
    );
  });

  it('should revert when adding a previously registered token', async () => {
    await expectRevert(
      dex.addToken(DAI, dai.address),
      'Token already registered'
    );
  });

  it('should deposit a given amount for a registered token', async () => {
    const amount = web3.utils.toWei('1');

    await dex.deposit(
      DAI,
      amount,
      { from: trader1 }
    );

    const balance = await dex.traderBalances(trader1, DAI);
    assert(balance.toString() === amount);
  });

  it('should revert when trying to deposit if token does not exist', async () => {
    const amount = web3.utils.toWei('1');

    await expectRevert(
      dex.deposit(
        web3.utils.asciiToHex('INEXISTENT-TOKEN'),
        amount,
        { from: trader1 }
      ),
      'Token does not exist'
    );
  });

  it('should withdraw a given amount of registered tokens', async () => {
    const amount = web3.utils.toWei('100');

    await dex.deposit(
      DAI,
      amount,
      { from: trader1 }
    );

    await dex.withdraw(
      DAI,
      amount,
      { from: trader1 }
    );

    const dexBalance = await dex.traderBalances(trader1, DAI);
    const daiBalance = await dai.balanceOf(trader1);

    assert(dexBalance.isZero());
    assert(daiBalance.toString() === web3.utils.toWei('1000'));
  });

  it('should revert when trying to withdraw if token does not exist', async () => {
    const amount = web3.utils.toWei('100');

    await expectRevert(
      dex.withdraw(
        web3.utils.asciiToHex('INEXISTENT-TOKEN'),
        amount,
        { from: trader1 }
      ),
      'Token does not exist'
    );
  });

  it('should revert when trying to withdraw if balance is insufficient', async () => {
    const amount = web3.utils.toWei('100');
    const amountGreater = web3.utils.toWei('1000');

    await dex.deposit(
      DAI,
      amount,
      { from: trader1 }
    );

    await expectRevert(
      dex.withdraw(
        DAI,
        amountGreater,
        { from: trader1 }
      ),
      'Insufficient balance'
    );
  });

  it('should create BUY limit orders and sort them correctly in the order book', async () => {
    const depositAmount100 = web3.utils.toWei('100');
    const depositAmount200 = web3.utils.toWei('200');
    const orderAmount10 = web3.utils.toWei('10');

    await dex.deposit(
      DAI,
      depositAmount100,
      { from: trader1 }
    );

    await dex.createLimitOrder(
      REP,
      orderAmount10,
      10,
      SIDE.BUY,
      { from: trader1 }
    );

    const buyOrders = await dex.getOrders(REP, SIDE.BUY);
    const sellOrders = await dex.getOrders(REP, SIDE.SELL);

    assert(buyOrders.length === 1);
    assert(buyOrders[0].trader === trader1);
    assert(buyOrders[0].ticker === web3.utils.padRight(REP, 64));
    assert(buyOrders[0].price === '10');
    assert(buyOrders[0].amount === orderAmount10);
    assert(sellOrders.length === 0);


    await dex.deposit(
      DAI,
      depositAmount200,
      { from: trader2 }
    );

    await dex.createLimitOrder(
      REP,
      orderAmount10,
      11,
      SIDE.BUY,
      { from: trader2 }
    );

    const buyOrders2 = await dex.getOrders(REP, SIDE.BUY);
    const sellOrders2 = await dex.getOrders(REP, SIDE.SELL);

    assert(buyOrders2.length === 2);
    assert(buyOrders2[0].trader === trader2);
    assert(buyOrders2[1].trader === trader1);
    assert(sellOrders2.length === 0);

    await dex.deposit(
      DAI,
      depositAmount200,
      { from: trader2 }
    );

    await dex.createLimitOrder(
      REP,
      orderAmount10,
      9,
      SIDE.BUY,
      { from: trader2 }
    );

    const buyOrders3 = await dex.getOrders(REP, SIDE.BUY);
    const sellOrders3 = await dex.getOrders(REP, SIDE.SELL);

    assert(buyOrders3.length === 3);
    assert(buyOrders3[0].trader === trader2);
    assert(buyOrders3[1].trader === trader1);
    assert(buyOrders3[2].trader === trader2);
    assert(sellOrders3.length === 0);
  });

  it('should revert when trying to create a limit order if token does not exist', async () => {
    const orderAmount = web3.utils.toWei('1000');

    await expectRevert(
      dex.createLimitOrder(
        web3.utils.asciiToHex('INEXISTENT-TOKEN'),
        orderAmount,
        10,
        SIDE.BUY,
        { from: trader1 }
      ),
      'Token does not exist'
    );
  });

  it('should revert when trying to create a limit order if token balance is insufficient', async () => {
    const depositAmount = web3.utils.toWei('99');
    const orderAmount = web3.utils.toWei('100');

    await dex.deposit(
      REP,
      depositAmount,
      { from: trader1 }
    );

    await expectRevert(
      dex.createLimitOrder(
        REP,
        orderAmount,
        10,
        SIDE.SELL,
        { from: trader1 }
      ),
      'Insufficient balance for this token'
    );
  });

  it('should revert when trying to create a limit order if DAI balance is insufficient', async () => {
    const daiAmount = web3.utils.toWei('99');
    const orderAmount = web3.utils.toWei('10');

    await dex.deposit(
      DAI,
      daiAmount,
      { from: trader1 }
    );

    await expectRevert(
      dex.createLimitOrder(
        REP,
        orderAmount,
        10,
        SIDE.BUY,
        { from: trader1 }
      ),
      'Insufficient balance for DAI'
    );
  });

  it('should revert when trying to create a limit order if token is DAI', async () => {
    const orderAmount = web3.utils.toWei('1000');

    await expectRevert(
      dex.createLimitOrder(
        DAI,
        orderAmount,
        10,
        SIDE.BUY,
        { from: trader1 }
      ),
      'Cannot trade DAI token'
    );
  });

  it('should create a market order and match it against an existing limit order', async () => {
    const depositAmount = web3.utils.toWei('100');
    const limitOrderAmount = web3.utils.toWei('10');
    const marketOrderAmount = web3.utils.toWei('5');

    await dex.deposit(
      DAI,
      depositAmount,
      { from: trader1 }
    );

    await dex.createLimitOrder(
      REP,
      limitOrderAmount,
      10,
      SIDE.BUY,
      { from: trader1 }
    );

    await dex.deposit(
      REP,
      depositAmount,
      { from: trader2 }
    );

    await dex.createMarketOrder(
      REP,
      marketOrderAmount,
      SIDE.SELL,
      { from: trader2 }
    );

    const balances = await Promise.all([
      dex.traderBalances(trader1, DAI),
      dex.traderBalances(trader1, REP),
      dex.traderBalances(trader2, DAI),
      dex.traderBalances(trader2, REP),
    ]);

    const orders = await dex.getOrders(REP, SIDE.BUY);

    assert(orders.length === 1);
    assert(orders[0].filled = marketOrderAmount);
    assert(balances[0].toString() === web3.utils.toWei('50'));
    assert(balances[1].toString() === web3.utils.toWei('5'));
    assert(balances[2].toString() === web3.utils.toWei('50'));
    assert(balances[3].toString() === web3.utils.toWei('95'));
  });

  it('should revert when creating a market order if token balance is insufficient', async () => {
    const marketOrder = web3.utils.toWei('101');

    await expectRevert(
      dex.createMarketOrder(
        REP,
        marketOrder,
        SIDE.SELL,
        { from: trader2 }
      ),
      'Insufficient balance for this token'
    );
  });

  it('should revert when creating a market order if DAI balance is insufficient', async () => {
    const amount = web3.utils.toWei('100');
    const marketAmount = web3.utils.toWei('101');

    await dex.deposit(
      REP,
      amount,
      { from: trader1 }
    );

    await dex.createLimitOrder(
      REP,
      amount,
      10,
      SIDE.SELL,
      { from: trader1 }
    );

    await expectRevert(
      dex.createMarketOrder(
        REP,
        marketAmount,
        SIDE.BUY,
        { from: trader2 }
      ),
      'Insufficient balance for DAI token'
    );
  });

  it('should revert when creating a market order if token is DAI', async () => {
    const amount = web3.utils.toWei('1000');

    await expectRevert(
      dex.createMarketOrder(
        DAI,
        amount,
        SIDE.BUY,
        { from: trader1 }
      ),
      'Cannot trade DAI token'
    );
  });

  it('should revert when creating a market order if token does not exist', async () => {
    const amount = web3.utils.toWei('1000');

    await expectRevert(
      dex.createMarketOrder(
        web3.utils.asciiToHex('INEXISTENT-TOKEN'),
        amount,
        SIDE.BUY,
        { from: trader1 }
      ),
      'Token does not exist'
    );
  });
});