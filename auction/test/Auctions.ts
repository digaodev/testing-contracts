import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

async function deployWithCleanFixture() {
  const [seller] = await ethers.getSigners();

  const Auctions = await ethers.getContractFactory("Auctions");
  const auctions = await Auctions.deploy();

  await auctions.deployed();

  return { auctions, seller };
}

async function deployWithOneAuctionFixture() {
  const [seller, buyer1, buyer2] = await ethers.getSigners();

  const Auctions = await ethers.getContractFactory("Auctions");
  const auctions = await Auctions.deploy();

  await auctions.deployed();

  const AUCTION_NAME = "Test Contract";
  const AUCTION_DESCRIPTION = "Test Item 1";
  const AUCTION_MIN_OFFER_PRICE = 100;
  const AUCTION_DURATION = 86400 * 2; // 2 days

  const tx = await auctions.createAuction(
    AUCTION_NAME,
    AUCTION_DESCRIPTION,
    AUCTION_MIN_OFFER_PRICE,
    AUCTION_DURATION,
  );
  await tx.wait();

  return { auctions, seller, buyer1, buyer2, AUCTION_DURATION };
}

async function deployWithAuctionAndTwoOffersFixture() {
  const [seller, buyer1, buyer2] = await ethers.getSigners();

  const Auctions = await ethers.getContractFactory("Auctions");
  const auctions = await Auctions.deploy();

  await auctions.deployed();

  const AUCTION_NAME = "Test Contract";
  const AUCTION_DESCRIPTION = "Test Item 1";
  const AUCTION_MIN_OFFER_PRICE = 100;
  const AUCTION_DURATION = 86400 * 2; // 2 days
  const tx = await auctions.createAuction(
    AUCTION_NAME,
    AUCTION_DESCRIPTION,
    AUCTION_MIN_OFFER_PRICE,
    AUCTION_DURATION,
  );
  await tx.wait();

  const AUCTION_ID = 1;
  const OFFER_PRICE_BUYER1 = 1000;
  const tx2 = await auctions.connect(buyer1).createOffer(AUCTION_ID, {
    value: OFFER_PRICE_BUYER1
  });
  await tx2.wait();

  const OFFER_PRICE_HIGHER_BUYER2 = 1500;
  const tx3 = await auctions.connect(buyer2).createOffer(AUCTION_ID, {
    value: OFFER_PRICE_HIGHER_BUYER2
  });
  await tx3.wait();

  return {
    auctions,
    seller,
    buyer1,
    buyer2,
    AUCTION_DURATION,
    OFFER_PRICE_BUYER1,
    OFFER_PRICE_HIGHER_BUYER2
  };
}

describe("Create Auction", function () {
  it("Should create an auction", async function () {
    const { auctions, seller } = await loadFixture(
      deployWithCleanFixture
    );

    const AUCTION_ID = 1;
    const AUCTION_NAME = "Test Contract";
    const AUCTION_DESCRIPTION = "Test Item 1";
    const AUCTION_MIN_OFFER_PRICE = 100;
    const AUCTION_DURATION = 86400 * 2; // 2 days

    const tx = await auctions.createAuction(
      AUCTION_NAME,
      AUCTION_DESCRIPTION,
      AUCTION_MIN_OFFER_PRICE,
      AUCTION_DURATION,
    );
    await tx.wait();

    const currentTimestamp = await time.latest();
    const allAuctions = await auctions.getAllAuctions();

    expect(allAuctions[0].id).to.equal(AUCTION_ID);
    expect(allAuctions[0].name).to.equal(AUCTION_NAME);
    expect(allAuctions[0].description).to.equal(AUCTION_DESCRIPTION);
    expect(allAuctions[0].minimumOfferPrice).to.equal(AUCTION_MIN_OFFER_PRICE);
    expect(allAuctions[0].auctionEnd).to.equal(currentTimestamp + AUCTION_DURATION);
    expect(allAuctions[0].isCanceled).to.be.false;
    expect(await auctions.sellerAuctions(seller.address, 0)).to.equal(1);
  });

  it("Should emit an event when creating an auction", async function () {
    const { auctions, seller } = await loadFixture(
      deployWithCleanFixture
    );

    const AUCTION_ID = 1;
    const AUCTION_NAME = "Test Contract";
    const AUCTION_DESCRIPTION = "Test Item 1";
    const AUCTION_MIN_OFFER_PRICE = 100;
    const AUCTION_DURATION = 86400 * 2; // 2 days

    await expect(auctions.createAuction(
      AUCTION_NAME,
      AUCTION_DESCRIPTION,
      AUCTION_MIN_OFFER_PRICE,
      AUCTION_DURATION,
    ))
      .to.emit(auctions, "CreateAuction")
      .withArgs(AUCTION_ID, AUCTION_NAME, seller.address);
  });

  it("Should revert if duration is NOT between 1-30 days", async function () {
    const { auctions } = await loadFixture(
      deployWithCleanFixture
    );

    const AUCTION_NAME = "Test Contract";
    const AUCTION_DESCRIPTION = "Test Item 1";
    const AUCTION_MIN_OFFER_PRICE = 100;
    const AUCTION_DURATION = 86400 * 31; // 31 days

    await expect(auctions.createAuction(
      AUCTION_NAME,
      AUCTION_DESCRIPTION,
      AUCTION_MIN_OFFER_PRICE,
      AUCTION_DURATION,
    )).to.be.revertedWith('Duration should be between 1 to 30 days');
  });
});

describe("Cancel Auction", function () {
  it("Should cancel an auction if seller", async function () {
    const { auctions, seller } = await loadFixture(
      deployWithAuctionAndTwoOffersFixture
    );

    const AUCTION_ID = 1;

    const tx = await auctions.connect(seller).cancelAuction(AUCTION_ID);
    await tx.wait();

    const allAuctions = await auctions.getAllAuctions();

    expect(allAuctions[0].isCanceled).to.be.true;
  });

  it("Should leave active offers for refund when canceling an auction", async function () {
    const {
      auctions,
      buyer1
    } = await loadFixture(deployWithAuctionAndTwoOffersFixture);

    const AUCTION_ID = 1;
    const OFFER_PRICE_HIGHER = 1000;

    const tx = await auctions.connect(buyer1).createOffer(
      AUCTION_ID,
      {
        value: OFFER_PRICE_HIGHER
      });
    await tx.wait();

    const allOffers = await auctions.getAllAuctionOffers(AUCTION_ID);

    expect(allOffers[0].isStale).to.be.true;
    expect(allOffers[1].isStale).to.be.false;
    expect(allOffers[2].isStale).to.be.false;
  });

  it("Should emit an event when canceling an auction", async function () {
    const {
      auctions,
      seller
    } = await loadFixture(deployWithAuctionAndTwoOffersFixture);

    const AUCTION_ID = 1;

    await expect(auctions.cancelAuction(AUCTION_ID))
      .to.emit(auctions, "CancelAuction")
      .withArgs(AUCTION_ID, seller.address);
  });

  it("Should revert if not seller when canceling an auction", async function () {
    const { auctions, buyer1 } = await loadFixture(
      deployWithAuctionAndTwoOffersFixture
    );

    const AUCTION_ID = 1;

    await expect(auctions.connect(buyer1).cancelAuction(AUCTION_ID))
      .to.be.revertedWith('Only the seller can cancel an auction');
  });

  it("Should revert when trying to cancel an already canceled auction", async function () {
    const { auctions } = await loadFixture(
      deployWithAuctionAndTwoOffersFixture
    );

    const AUCTION_ID = 1;

    const tx = await auctions.cancelAuction(AUCTION_ID);
    await tx.wait();

    await expect(auctions.cancelAuction(AUCTION_ID))
      .to.be.revertedWith('Auction is already canceled');
  });
});

describe("Create Offer", function () {
  it("Should create an offer", async function () {
    const { auctions, buyer1 } = await loadFixture(
      deployWithOneAuctionFixture
    );

    const AUCTION_ID = 1;
    const OFFER_PRICE = 1000;
    const OFFER_ID = 1;

    const tx = await auctions.connect(buyer1).createOffer(AUCTION_ID, { value: OFFER_PRICE });
    await tx.wait();

    const allAuctions = await auctions.getAllAuctions();
    const allOffers = await auctions.getAllAuctionOffers(AUCTION_ID);

    expect(allOffers[0].id).to.equal(OFFER_ID);
    expect(allOffers[0].auctionId).to.equal(AUCTION_ID);
    expect(allOffers[0].offerPrice).to.equal(OFFER_PRICE);
    expect(allOffers[0].buyer).to.equal(buyer1.address);
    expect(allOffers[0].isStale).to.be.false;
    expect(allAuctions[0].bestOfferId).to.equal(OFFER_ID);
    expect(allAuctions[0].offerIds.length).to.equal(1);
    expect(await auctions.buyerOffers(buyer1.address, 0)).to.equal(OFFER_ID);
  });

  it("Should accept multiple offers for an auction and add up previous bids from same buyer", async function () {
    const { auctions, buyer1, buyer2 } = await loadFixture(
      deployWithOneAuctionFixture
    );

    const AUCTION_ID = 1;
    const OFFER_PRICE_INITIAL_BUYER1 = 1000;
    const OFFER_ID_BUYER1 = 1;
    const OFFER_PRICE_INITIAL_BUYER2 = 2000;
    const OFFER_ID_BUYER2 = 2;
    const OFFER_PRICE_HIGHER_BUYER1 = 1100;
    const OFFER_ID2_BUYER1 = 3;
    const TOTAL_OFFERS_BUYER1 = OFFER_PRICE_INITIAL_BUYER1 + OFFER_PRICE_HIGHER_BUYER1

    const tx = await auctions.connect(buyer1)
      .createOffer(AUCTION_ID, { value: OFFER_PRICE_INITIAL_BUYER1 });
    await tx.wait();

    const tx2 = await auctions.connect(buyer2)
      .createOffer(AUCTION_ID, { value: OFFER_PRICE_INITIAL_BUYER2 });
    await tx2.wait();

    const tx3 = await auctions.connect(buyer1)
      .createOffer(AUCTION_ID, { value: OFFER_PRICE_HIGHER_BUYER1 });
    await tx3.wait();

    const allAuctions = await auctions.getAllAuctions();
    const allOffers = await auctions.getAllAuctionOffers(AUCTION_ID);

    expect(allOffers[0].id).to.equal(OFFER_ID_BUYER1);
    expect(allOffers[0].auctionId).to.equal(AUCTION_ID);
    expect(allOffers[0].offerPrice).to.equal(OFFER_PRICE_INITIAL_BUYER1);
    expect(allOffers[0].buyer).to.equal(buyer1.address);

    expect(allOffers[1].id).to.equal(OFFER_ID_BUYER2);
    expect(allOffers[1].auctionId).to.equal(AUCTION_ID);
    expect(allOffers[1].offerPrice).to.equal(OFFER_PRICE_INITIAL_BUYER2);
    expect(allOffers[1].buyer).to.equal(buyer2.address);

    expect(allOffers[2].id).to.equal(OFFER_ID2_BUYER1);
    expect(allOffers[2].auctionId).to.equal(AUCTION_ID);
    expect(allOffers[2].offerPrice).to.equal(TOTAL_OFFERS_BUYER1);
    expect(allOffers[2].buyer).to.equal(buyer1.address);

    expect(allOffers[0].isStale).to.be.true;
    expect(allOffers[1].isStale).to.be.false;
    expect(allOffers[2].isStale).to.be.false;
    expect(allAuctions[0].bestOfferId).to.equal(OFFER_ID2_BUYER1);
    expect(allAuctions[0].offerIds.length).to.equal(3);
    expect(await auctions.buyerOffers(buyer1.address, 0)).to.equal(OFFER_ID_BUYER1);
    expect(await auctions.buyerOffers(buyer2.address, 0)).to.equal(OFFER_ID_BUYER2);
    expect(await auctions.buyerOffers(buyer1.address, 1)).to.equal(OFFER_ID2_BUYER1);
  });

  it("Should emit an event when creating an offer", async function () {
    const { auctions, buyer1 } = await loadFixture(
      deployWithOneAuctionFixture
    );

    const AUCTION_ID = 1;
    const OFFER_PRICE = 1000;
    const OFFER_ID = 1;

    await expect(auctions.connect(buyer1).createOffer(AUCTION_ID, { value: OFFER_PRICE }))
      .to.emit(auctions, "CreateOffer")
      .withArgs(OFFER_ID, AUCTION_ID, OFFER_PRICE, OFFER_PRICE, buyer1.address);
  });

  it("Should revert if the offer is made for an inexistent auction", async function () {
    const { auctions, buyer1 } = await loadFixture(
      deployWithOneAuctionFixture
    );

    const INEXISTENT_AUCTION_ID = 10;
    const OFFER_PRICE = 100;

    await expect(
      auctions.connect(buyer1)
        .createOffer(INEXISTENT_AUCTION_ID, { value: OFFER_PRICE }))
      .to.be.revertedWith('Auction not found');
  });

  it("Should revert if the offer is made for a canceled auction", async function () {
    const { auctions, buyer1 } = await loadFixture(
      deployWithOneAuctionFixture
    );

    const AUCTION_ID = 1;
    const OFFER_PRICE = 100;

    const tx = await auctions.cancelAuction(AUCTION_ID);
    await tx.wait();

    await expect(
      auctions.connect(buyer1)
        .createOffer(AUCTION_ID, { value: OFFER_PRICE }))
      .to.be.revertedWith('Auction is already canceled');
  });

  it("Should revert if the offer price is lower than the minimum required", async function () {
    const { auctions, buyer1 } = await loadFixture(
      deployWithOneAuctionFixture
    );

    const AUCTION_ID = 1;
    const OFFER_PRICE_LOWER = 10;

    await expect(auctions.connect(buyer1).createOffer(AUCTION_ID, { value: OFFER_PRICE_LOWER }))
      .to.be.revertedWith('Bid should be greater than the minimum offer price');
  });

  it("Should revert when trying to create an offer after the auction has ended ", async function () {
    const { auctions, buyer1, AUCTION_DURATION } = await loadFixture(
      deployWithOneAuctionFixture
    );

    const AUCTION_ID = 1;
    const OFFER_PRICE = 1000;
    const currentTimestamp = await time.latest();

    await time.increaseTo(currentTimestamp + AUCTION_DURATION);

    await expect(auctions.connect(buyer1).createOffer(AUCTION_ID, { value: OFFER_PRICE }))
      .to.be.revertedWith('Auction has expired');
  });

  it("Should revert if the offer price is lower than the current best offer", async function () {
    const { auctions, buyer1, buyer2 } = await loadFixture(
      deployWithOneAuctionFixture
    );

    const AUCTION_ID = 1;
    const OFFER_PRICE = 1000;
    const OFFER_PRICE_LOWER = 100;

    const tx = await auctions.connect(buyer1).createOffer(AUCTION_ID, { value: OFFER_PRICE });
    await tx.wait();

    await expect(auctions.connect(buyer2).createOffer(AUCTION_ID, { value: OFFER_PRICE_LOWER }))
      .to.be.revertedWith('Bid should be greater than the current best offer');
  });
});

describe("Execute Trade", function () {
  it("Should execute a trade and make the funds available after the auction has ended", async function () {
    const {
      auctions,
      seller,
      buyer2,
      AUCTION_DURATION,
      OFFER_PRICE_HIGHER_BUYER2
    } = await loadFixture(deployWithAuctionAndTwoOffersFixture);

    const AUCTION_ID = 1;
    const OFFER_PRICE_HIGHER = 2500;
    const TOTAL_OFFER_BUYER2 = OFFER_PRICE_HIGHER + OFFER_PRICE_HIGHER_BUYER2;

    const tx = await auctions.connect(buyer2).createOffer(
      AUCTION_ID,
      {
        value: OFFER_PRICE_HIGHER
      });
    await tx.wait();

    const auctionEnd = await time.latest() + AUCTION_DURATION;
    await time.increaseTo(auctionEnd);

    const allOffers = await auctions.getAllAuctionOffers(AUCTION_ID);

    expect(allOffers[0].isStale).to.be.false;
    expect(allOffers[1].isStale).to.be.true;
    expect(allOffers[2].isStale).to.be.false;
    await expect(auctions.trade(AUCTION_ID))
      .to.changeEtherBalances(
        [auctions, seller],
        [-TOTAL_OFFER_BUYER2, TOTAL_OFFER_BUYER2]
      );
  });

  it("Should emit an event when executing a trade", async function () {
    const { auctions, AUCTION_DURATION } = await loadFixture(
      deployWithAuctionAndTwoOffersFixture
    );

    const AUCTION_ID = 1;
    const BEST_OFFER_ID = 2;

    const auctionEnd = await time.latest() + AUCTION_DURATION;
    await time.increaseTo(auctionEnd);

    await expect(auctions.trade(AUCTION_ID))
      .to.emit(auctions, "Trade")
      .withArgs(AUCTION_ID, BEST_OFFER_ID);
  });

  it("Should revert if the trade is executed for an inexistent auction", async function () {
    const { auctions, AUCTION_DURATION } = await loadFixture(
      deployWithAuctionAndTwoOffersFixture
    );

    const INEXISTENT_AUCTION_ID = 10;

    const auctionEnd = await time.latest() + AUCTION_DURATION;
    await time.increaseTo(auctionEnd);

    await expect(auctions.trade(INEXISTENT_AUCTION_ID))
      .to.be.revertedWith('Auction not found');
  });

  it("Should revert when trying to execute a trade for an active auction", async function () {
    const { auctions } = await loadFixture(
      deployWithAuctionAndTwoOffersFixture
    );

    const AUCTION_ID = 1;

    await expect(auctions.trade(AUCTION_ID))
      .to.be.revertedWith('Auction is still active');
  });

  it("Should revert when trying to execute a trade for a canceled auction", async function () {
    const { auctions } = await loadFixture(
      deployWithAuctionAndTwoOffersFixture
    );

    const AUCTION_ID = 1;

    const tx = await auctions.cancelAuction(AUCTION_ID);
    await tx.wait();

    await expect(auctions.trade(AUCTION_ID))
      .to.be.revertedWith('Auction is already canceled');
  });
});

describe("Refund Withdrawal", function () {
  it("Should allow buyer to get refunded after the auction has ended", async function () {
    const {
      auctions,
      buyer1,
      buyer2,
      AUCTION_DURATION,
      OFFER_PRICE_BUYER1
    } = await loadFixture(deployWithAuctionAndTwoOffersFixture);

    const AUCTION_ID = 1;
    const OFFER_PRICE_HIGHER = 2500;

    const tx = await auctions.connect(buyer2).createOffer(
      AUCTION_ID,
      {
        value: OFFER_PRICE_HIGHER
      });
    await tx.wait();

    const currentTime = await time.latest();
    const auctionEnd =  currentTime + AUCTION_DURATION;
    await time.increaseTo(auctionEnd);

    const tx2 = await auctions.trade(AUCTION_ID);
    await tx2.wait();

    const offersBeforeRefund = await auctions.getAllAuctionOffers(AUCTION_ID);

    expect(offersBeforeRefund[0].isStale).to.be.false; // was outbid, needs to be refunded
    expect(offersBeforeRefund[1].isStale).to.be.true; // was outbid, won't be refuded (sum up)
    expect(offersBeforeRefund[2].isStale).to.be.true; // winning bid, was sent to seller on .trade()
    await expect(auctions.connect(buyer1).refundWithdrawal(AUCTION_ID))
      .to.changeEtherBalances(
        [auctions, buyer1],
        [-OFFER_PRICE_BUYER1, OFFER_PRICE_BUYER1]
      );

    const offersAfterRefund = await auctions.getAllAuctionOffers(AUCTION_ID);

    expect(offersAfterRefund[0].isStale).to.be.true; // was refunded on withdraw
  });

  it("Should allow buyer to get refunded after the auction was canceled", async function () {
    const {
      auctions,
      seller,
      buyer1,
      buyer2,
      OFFER_PRICE_BUYER1
    } = await loadFixture(deployWithAuctionAndTwoOffersFixture);

    const AUCTION_ID = 1;
    const OFFER_PRICE_HIGHER = 2500;

    const tx = await auctions.connect(buyer2).createOffer(
      AUCTION_ID,
      {
        value: OFFER_PRICE_HIGHER
      });
    await tx.wait();

    const tx2 = await auctions.connect(seller).cancelAuction(AUCTION_ID);
    await tx2.wait();

    const offersBeforeRefund = await auctions.getAllAuctionOffers(AUCTION_ID);

    expect(offersBeforeRefund[0].isStale).to.be.false; // was outbid, needs to be refunded
    expect(offersBeforeRefund[1].isStale).to.be.true; // was outbid, won't be refuded (sum up)
    expect(offersBeforeRefund[2].isStale).to.be.false; // winning bid until auction canceled
    await expect(auctions.connect(buyer1).refundWithdrawal(AUCTION_ID))
      .to.changeEtherBalances(
        [buyer1],
        [OFFER_PRICE_BUYER1]
      );

    const offersAfterRefund = await auctions.getAllAuctionOffers(AUCTION_ID);

    expect(offersAfterRefund[0].isStale).to.be.true; // was refunded on withdraw
  });

  it("Should emit an event when executing a refund", async function () {
    const {
      auctions,
      buyer1,
      buyer2,
      OFFER_PRICE_BUYER1,
      AUCTION_DURATION
    } = await loadFixture(
      deployWithAuctionAndTwoOffersFixture
    );

    const AUCTION_ID = 1;
    const OFFER_PRICE_HIGHER = 2500;

    const tx = await auctions.connect(buyer2).createOffer(
      AUCTION_ID,
      {
        value: OFFER_PRICE_HIGHER
      });
    await tx.wait();

    const auctionEnd = await time.latest() + AUCTION_DURATION;
    await time.increaseTo(auctionEnd);

    const tx2 = await auctions.trade(AUCTION_ID);
    await tx2.wait();

    await expect(auctions.connect(buyer1).refundWithdrawal(AUCTION_ID))
      .to.emit(auctions, "Transfer")
      .withArgs(buyer1.address, OFFER_PRICE_BUYER1);
  });

  it("Should revert when trying to get a refund for an inexistent auction", async function () {
    const { auctions, buyer1 } = await loadFixture(
      deployWithAuctionAndTwoOffersFixture
    );

    const INEXISTENT_AUCTION_ID = 10;

    await expect(auctions.connect(buyer1).refundWithdrawal(INEXISTENT_AUCTION_ID))
      .to.be.revertedWith('Auction not found');
  });

  it("Should revert when trying to get a refund for an active auction", async function () {
    const { auctions, buyer1 } = await loadFixture(
      deployWithAuctionAndTwoOffersFixture
    );

    const AUCTION_ID = 1;

    await expect(auctions.connect(buyer1).refundWithdrawal(AUCTION_ID))
      .to.be.revertedWith('Unable to withdraw from active auction');
  });
})
