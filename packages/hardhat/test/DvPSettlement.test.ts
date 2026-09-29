import { ethers } from "hardhat";
import { expect } from "chai";
import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import type {
  DvPSettlement,
  MockATSToken,
  MockERC20,
  MaliciousToken,
  FalseReturnToken,
} from "../typechain-types";

// Token amounts in base units (no floating-point)
const ASSET_AMOUNT = ethers.parseUnits("100", 18);   // 100 ATS tokens, 18 decimals
const PAYMENT_AMOUNT = ethers.parseUnits("50", 6);    // 50 payment tokens, 6 decimals
const EXPIRY_OFFSET = 3600n;                          // 1 hour from now

// ============================================================================
// Shared fixture
// ============================================================================

async function deployFixture() {
  const [deployer, seller, buyer, stranger] = await ethers.getSigners();

  // Deploy mock tokens
  const MockATSFactory = await ethers.getContractFactory("MockATSToken");
  const atsToken = (await MockATSFactory.deploy(
    "Demo ATS Asset",
    "ATSD",
    18
  )) as MockATSToken;
  await atsToken.waitForDeployment();

  const MockERC20Factory = await ethers.getContractFactory("MockERC20");
  const payToken = (await MockERC20Factory.deploy(
    "Demo Payment Token",
    "PAYMT",
    6
  )) as MockERC20;
  await payToken.waitForDeployment();

  // Deploy DvPSettlement
  const DvPFactory = await ethers.getContractFactory("DvPSettlement");
  const dvp = (await DvPFactory.deploy(
    await atsToken.getAddress(),
    await payToken.getAddress()
  )) as DvPSettlement;
  await dvp.waitForDeployment();

  // Mint demo balances
  await atsToken.mint(seller.address, ASSET_AMOUNT);
  await payToken.mint(buyer.address, PAYMENT_AMOUNT);

  // Pre-approve (individual tests override this as needed)
  await atsToken.connect(seller).approve(await dvp.getAddress(), ASSET_AMOUNT);
  await payToken.connect(buyer).approve(await dvp.getAddress(), PAYMENT_AMOUNT);

  // Create a standard open offer with 1-hour expiry
  const block = await ethers.provider.getBlock("latest");
  const expiry = BigInt(block!.timestamp) + EXPIRY_OFFSET;
  await dvp.connect(seller).createOffer(
    buyer.address,
    ASSET_AMOUNT,
    PAYMENT_AMOUNT,
    expiry
  );

  return { dvp, atsToken, payToken, deployer, seller, buyer, stranger, expiry };
}

// ============================================================================
describe("DvPSettlement", function () {
  // ==========================================================================
  describe("Constructor", function () {
    it("reverts when atsAsset is the zero address", async function () {
      const [deployer] = await ethers.getSigners();
      const MockERC20Factory = await ethers.getContractFactory("MockERC20");
      const pay = await MockERC20Factory.deploy("Pay", "PAY", 6);
      const DvPFactory = await ethers.getContractFactory("DvPSettlement");
      await expect(
        DvPFactory.deploy(ethers.ZeroAddress, await pay.getAddress())
      ).to.be.revertedWith("zero ats asset");
    });

    it("reverts when paymentToken is the zero address", async function () {
      const MockERC20Factory = await ethers.getContractFactory("MockERC20");
      const ats = await MockERC20Factory.deploy("ATS", "ATS", 18);
      const DvPFactory = await ethers.getContractFactory("DvPSettlement");
      await expect(
        DvPFactory.deploy(await ats.getAddress(), ethers.ZeroAddress)
      ).to.be.revertedWith("zero payment token");
    });

    it("reverts when both addresses are identical", async function () {
      const MockERC20Factory = await ethers.getContractFactory("MockERC20");
      const tok = await MockERC20Factory.deploy("Token", "TOK", 18);
      const addr = await tok.getAddress();
      const DvPFactory = await ethers.getContractFactory("DvPSettlement");
      await expect(DvPFactory.deploy(addr, addr)).to.be.revertedWith("same token");
    });

    it("stores immutable addresses on valid deployment", async function () {
      const { dvp, atsToken, payToken } = await loadFixture(deployFixture);
      expect(await dvp.atsAsset()).to.equal(await atsToken.getAddress());
      expect(await dvp.paymentToken()).to.equal(await payToken.getAddress());
    });
  });

  // ==========================================================================
  describe("createOffer", function () {
    it("reverts when buyer is the zero address", async function () {
      const { dvp, seller } = await loadFixture(deployFixture);
      const block = await ethers.provider.getBlock("latest");
      const expiry = BigInt(block!.timestamp) + EXPIRY_OFFSET;
      await expect(
        dvp.connect(seller).createOffer(ethers.ZeroAddress, ASSET_AMOUNT, PAYMENT_AMOUNT, expiry)
      ).to.be.revertedWith("zero buyer");
    });

    it("reverts when seller equals buyer (msg.sender == buyer)", async function () {
      const { dvp, seller } = await loadFixture(deployFixture);
      const block = await ethers.provider.getBlock("latest");
      const expiry = BigInt(block!.timestamp) + EXPIRY_OFFSET;
      await expect(
        dvp.connect(seller).createOffer(seller.address, ASSET_AMOUNT, PAYMENT_AMOUNT, expiry)
      ).to.be.revertedWith("seller is buyer");
    });

    it("reverts when assetAmount is zero", async function () {
      const { dvp, seller, buyer } = await loadFixture(deployFixture);
      const block = await ethers.provider.getBlock("latest");
      const expiry = BigInt(block!.timestamp) + EXPIRY_OFFSET;
      await expect(
        dvp.connect(seller).createOffer(buyer.address, 0n, PAYMENT_AMOUNT, expiry)
      ).to.be.revertedWith("zero asset amount");
    });

    it("reverts when paymentAmount is zero", async function () {
      const { dvp, seller, buyer } = await loadFixture(deployFixture);
      const block = await ethers.provider.getBlock("latest");
      const expiry = BigInt(block!.timestamp) + EXPIRY_OFFSET;
      await expect(
        dvp.connect(seller).createOffer(buyer.address, ASSET_AMOUNT, 0n, expiry)
      ).to.be.revertedWith("zero payment amount");
    });

    it("reverts when expiry equals current block.timestamp", async function () {
      const { dvp, seller, buyer } = await loadFixture(deployFixture);
      const block = await ethers.provider.getBlock("latest");
      const expiry = BigInt(block!.timestamp); // == now, not strictly greater
      await expect(
        dvp.connect(seller).createOffer(buyer.address, ASSET_AMOUNT, PAYMENT_AMOUNT, expiry)
      ).to.be.revertedWith("expiry in past");
    });

    it("reverts when expiry is in the past", async function () {
      const { dvp, seller, buyer } = await loadFixture(deployFixture);
      const block = await ethers.provider.getBlock("latest");
      const expiry = BigInt(block!.timestamp) - 1n;
      await expect(
        dvp.connect(seller).createOffer(buyer.address, ASSET_AMOUNT, PAYMENT_AMOUNT, expiry)
      ).to.be.revertedWith("expiry in past");
    });

    it("stores offer with all correct fields", async function () {
      const { dvp, seller, buyer, expiry } = await loadFixture(deployFixture);
      // Offer 1 was created in fixture
      const offer = await dvp.offers(1n);
      expect(offer.id).to.equal(1n);
      expect(offer.seller).to.equal(seller.address);
      expect(offer.buyer).to.equal(buyer.address);
      expect(offer.assetAmount).to.equal(ASSET_AMOUNT);
      expect(offer.paymentAmount).to.equal(PAYMENT_AMOUNT);
      expect(offer.expiry).to.equal(expiry);
      expect(offer.status).to.equal(0n); // Open = 0
    });

    it("assigns sequential IDs starting at 1", async function () {
      const { dvp, seller, buyer } = await loadFixture(deployFixture);
      const block = await ethers.provider.getBlock("latest");
      const expiry = BigInt(block!.timestamp) + EXPIRY_OFFSET;
      // First offer was ID 1 (in fixture); create second offer
      const tx = await dvp.connect(seller).createOffer(buyer.address, ASSET_AMOUNT, PAYMENT_AMOUNT, expiry);
      const receipt = await tx.wait();
      const event = receipt!.logs
        .map((l) => dvp.interface.parseLog(l))
        .find((e) => e?.name === "OfferCreated");
      expect(event?.args.offerId).to.equal(2n);
    });

    it("emits OfferCreated with all event args", async function () {
      const { dvp, seller, buyer } = await loadFixture(deployFixture);
      const block = await ethers.provider.getBlock("latest");
      const expiry = BigInt(block!.timestamp) + EXPIRY_OFFSET;
      await expect(
        dvp.connect(seller).createOffer(buyer.address, ASSET_AMOUNT, PAYMENT_AMOUNT, expiry)
      )
        .to.emit(dvp, "OfferCreated")
        .withArgs(2n, seller.address, buyer.address, ASSET_AMOUNT, PAYMENT_AMOUNT, expiry);
    });
  });

  // ==========================================================================
  describe("cancelOffer", function () {
    it("reverts when caller is not the seller", async function () {
      const { dvp, buyer } = await loadFixture(deployFixture);
      await expect(dvp.connect(buyer).cancelOffer(1n)).to.be.revertedWith("not seller");
    });

    it("reverts when caller is a stranger", async function () {
      const { dvp, stranger } = await loadFixture(deployFixture);
      await expect(dvp.connect(stranger).cancelOffer(1n)).to.be.revertedWith("not seller");
    });

    it("reverts when offer is already Filled", async function () {
      const { dvp, seller, buyer } = await loadFixture(deployFixture);
      await dvp.connect(buyer).acceptOffer(1n);
      await expect(dvp.connect(seller).cancelOffer(1n)).to.be.revertedWith("not open");
    });

    it("reverts when offer is already Cancelled", async function () {
      const { dvp, seller } = await loadFixture(deployFixture);
      await dvp.connect(seller).cancelOffer(1n);
      await expect(dvp.connect(seller).cancelOffer(1n)).to.be.revertedWith("not open");
    });

    it("sets status to Cancelled and emits OfferCancelled", async function () {
      const { dvp, seller } = await loadFixture(deployFixture);
      await expect(dvp.connect(seller).cancelOffer(1n))
        .to.emit(dvp, "OfferCancelled")
        .withArgs(1n);
      const offer = await dvp.offers(1n);
      expect(offer.status).to.equal(2n); // Cancelled = 2
    });
  });

  // ==========================================================================
  describe("acceptOffer — Authorization", function () {
    it("reverts when caller is not the designated buyer", async function () {
      const { dvp, seller } = await loadFixture(deployFixture);
      await expect(dvp.connect(seller).acceptOffer(1n)).to.be.revertedWith("not buyer");
    });

    it("reverts when caller is a non-participant stranger", async function () {
      const { dvp, stranger } = await loadFixture(deployFixture);
      await expect(dvp.connect(stranger).acceptOffer(1n)).to.be.revertedWith("not buyer");
    });

    it("reverts when offer is already Filled (duplicate acceptance)", async function () {
      const { dvp, buyer } = await loadFixture(deployFixture);
      await dvp.connect(buyer).acceptOffer(1n);
      await expect(dvp.connect(buyer).acceptOffer(1n)).to.be.revertedWith("not open");
    });

    it("reverts when offer is Cancelled", async function () {
      const { dvp, seller, buyer } = await loadFixture(deployFixture);
      await dvp.connect(seller).cancelOffer(1n);
      await expect(dvp.connect(buyer).acceptOffer(1n)).to.be.revertedWith("not open");
    });
  });

  // ==========================================================================
  describe("acceptOffer — Expiry", function () {
    it("reverts when block.timestamp equals offer.expiry", async function () {
      const { dvp, buyer, expiry } = await loadFixture(deployFixture);
      await time.setNextBlockTimestamp(expiry);
      await expect(dvp.connect(buyer).acceptOffer(1n)).to.be.revertedWith("expired");
    });

    it("reverts when block.timestamp is one second after offer.expiry", async function () {
      const { dvp, buyer, expiry } = await loadFixture(deployFixture);
      await time.setNextBlockTimestamp(expiry + 1n);
      await expect(dvp.connect(buyer).acceptOffer(1n)).to.be.revertedWith("expired");
    });

    it("succeeds when block.timestamp is one second before offer.expiry", async function () {
      const { dvp, buyer, expiry } = await loadFixture(deployFixture);
      await time.setNextBlockTimestamp(expiry - 1n);
      await expect(dvp.connect(buyer).acceptOffer(1n)).to.not.be.reverted;
    });
  });

  // ==========================================================================
  describe("acceptOffer — Allowance and Balance", function () {
    it("reverts when buyer has zero payment token allowance", async function () {
      const { dvp, buyer, payToken } = await loadFixture(deployFixture);
      // Revoke allowance
      await payToken.connect(buyer).approve(await dvp.getAddress(), 0n);
      await expect(dvp.connect(buyer).acceptOffer(1n)).to.be.reverted;
    });

    it("reverts when buyer payment allowance is less than paymentAmount", async function () {
      const { dvp, buyer, payToken } = await loadFixture(deployFixture);
      // Set allowance to 1 less than required
      await payToken.connect(buyer).approve(await dvp.getAddress(), PAYMENT_AMOUNT - 1n);
      await expect(dvp.connect(buyer).acceptOffer(1n)).to.be.reverted;
    });

    it("reverts when seller has zero ATS asset allowance", async function () {
      const { dvp, seller, buyer, atsToken } = await loadFixture(deployFixture);
      // Revoke seller allowance
      await atsToken.connect(seller).approve(await dvp.getAddress(), 0n);
      await expect(dvp.connect(buyer).acceptOffer(1n)).to.be.reverted;
    });

    it("reverts when seller ATS allowance is less than assetAmount", async function () {
      const { dvp, seller, buyer, atsToken } = await loadFixture(deployFixture);
      // Set allowance to 1 less than required
      await atsToken.connect(seller).approve(await dvp.getAddress(), ASSET_AMOUNT - 1n);
      await expect(dvp.connect(buyer).acceptOffer(1n)).to.be.reverted;
    });

    it("reverts when seller has no ATS balance (but has allowance)", async function () {
      const { dvp, seller, buyer, atsToken } = await loadFixture(deployFixture);
      // Transfer all seller tokens away
      await atsToken.connect(seller).transfer(buyer.address, ASSET_AMOUNT);
      await expect(dvp.connect(buyer).acceptOffer(1n)).to.be.reverted;
    });

    it("reverts when buyer has no payment balance (but has allowance)", async function () {
      const { dvp, buyer, payToken, stranger } = await loadFixture(deployFixture);
      // Transfer all buyer payment tokens away to stranger
      await payToken.connect(buyer).transfer(stranger.address, PAYMENT_AMOUNT);
      await expect(dvp.connect(buyer).acceptOffer(1n)).to.be.reverted;
    });
  });

  // ==========================================================================
  describe("acceptOffer — Happy Path", function () {
    it("transfers exact paymentAmount from buyer to seller", async function () {
      const { dvp, seller, buyer, payToken } = await loadFixture(deployFixture);
      const sellerPayBefore = await payToken.balanceOf(seller.address);
      const buyerPayBefore = await payToken.balanceOf(buyer.address);

      await dvp.connect(buyer).acceptOffer(1n);

      const sellerPayAfter = await payToken.balanceOf(seller.address);
      const buyerPayAfter = await payToken.balanceOf(buyer.address);

      expect(sellerPayAfter - sellerPayBefore).to.equal(PAYMENT_AMOUNT);
      expect(buyerPayBefore - buyerPayAfter).to.equal(PAYMENT_AMOUNT);
    });

    it("transfers exact assetAmount from seller to buyer", async function () {
      const { dvp, seller, buyer, atsToken } = await loadFixture(deployFixture);
      const sellerAtsBefore = await atsToken.balanceOf(seller.address);
      const buyerAtsBefore = await atsToken.balanceOf(buyer.address);

      await dvp.connect(buyer).acceptOffer(1n);

      const sellerAtsAfter = await atsToken.balanceOf(seller.address);
      const buyerAtsAfter = await atsToken.balanceOf(buyer.address);

      expect(sellerAtsBefore - sellerAtsAfter).to.equal(ASSET_AMOUNT);
      expect(buyerAtsAfter - buyerAtsBefore).to.equal(ASSET_AMOUNT);
    });

    it("sets offer status to Filled", async function () {
      const { dvp, buyer } = await loadFixture(deployFixture);
      await dvp.connect(buyer).acceptOffer(1n);
      const offer = await dvp.offers(1n);
      expect(offer.status).to.equal(1n); // Filled = 1
    });

    it("emits OfferSettled with correct args", async function () {
      const { dvp, seller, buyer } = await loadFixture(deployFixture);
      await expect(dvp.connect(buyer).acceptOffer(1n))
        .to.emit(dvp, "OfferSettled")
        .withArgs(1n, seller.address, buyer.address, ASSET_AMOUNT, PAYMENT_AMOUNT);
    });
  });

  // ==========================================================================
  describe("acceptOffer — ATS Failure Scenarios", function () {
    it("reverts when buyer's KYC is revoked after offer creation (MockATSToken.blockRecipient)", async function () {
      const { dvp, buyer, atsToken } = await loadFixture(deployFixture);
      // Simulate KYC revocation after offer creation
      await atsToken.blockRecipient(buyer.address);
      await expect(dvp.connect(buyer).acceptOffer(1n)).to.be.revertedWith(
        "ATS: buyer not eligible"
      );
    });

    it("reverts when ATS token is paused after offer creation (MockATSToken.blockAllTransfers)", async function () {
      const { dvp, buyer, atsToken } = await loadFixture(deployFixture);
      // Simulate token pause
      await atsToken.blockAllTransfers();
      await expect(dvp.connect(buyer).acceptOffer(1n)).to.be.revertedWith("ATS: paused");
    });

    it("leaves all balances unchanged when asset transfer fails after payment would succeed", async function () {
      const { dvp, seller, buyer, atsToken, payToken } = await loadFixture(deployFixture);
      // Block ATS transfer so asset step will fail
      await atsToken.blockRecipient(buyer.address);

      const sellerPayBefore = await payToken.balanceOf(seller.address);
      const buyerAtsBefore = await atsToken.balanceOf(buyer.address);

      await expect(dvp.connect(buyer).acceptOffer(1n)).to.be.reverted;

      // Payment must have rolled back too
      expect(await payToken.balanceOf(seller.address)).to.equal(sellerPayBefore);
      expect(await atsToken.balanceOf(buyer.address)).to.equal(buyerAtsBefore);
    });

    it("leaves all balances unchanged when payment transfer fails", async function () {
      const { dvp, seller, buyer, atsToken, payToken } = await loadFixture(deployFixture);
      // Remove buyer payment allowance so payment fails first
      await payToken.connect(buyer).approve(await dvp.getAddress(), 0n);

      const sellerAtsBefore = await atsToken.balanceOf(seller.address);
      const buyerPayBefore = await payToken.balanceOf(buyer.address);

      await expect(dvp.connect(buyer).acceptOffer(1n)).to.be.reverted;

      expect(await atsToken.balanceOf(seller.address)).to.equal(sellerAtsBefore);
      expect(await payToken.balanceOf(buyer.address)).to.equal(buyerPayBefore);
    });
  });

  // ==========================================================================
  describe("acceptOffer — Atomicity", function () {
    it("offer status remains Open when asset transfer fails (not Filled)", async function () {
      const { dvp, buyer, atsToken } = await loadFixture(deployFixture);
      // Block asset transfer
      await atsToken.blockRecipient(buyer.address);

      await expect(dvp.connect(buyer).acceptOffer(1n)).to.be.reverted;

      // Status must roll back to Open (not Filled)
      const offer = await dvp.offers(1n);
      expect(offer.status).to.equal(0n); // Open = 0
    });

    it("no partial balance change when payment transfer fails", async function () {
      const { dvp, seller, buyer, atsToken, payToken } = await loadFixture(deployFixture);
      await payToken.connect(buyer).approve(await dvp.getAddress(), 0n);

      const sellerAtsBefore = await atsToken.balanceOf(seller.address);
      const sellerPayBefore = await payToken.balanceOf(seller.address);

      await expect(dvp.connect(buyer).acceptOffer(1n)).to.be.reverted;

      expect(await atsToken.balanceOf(seller.address)).to.equal(sellerAtsBefore);
      expect(await payToken.balanceOf(seller.address)).to.equal(sellerPayBefore);
    });
  });

  // ==========================================================================
  describe("Reentrancy", function () {
    it("reverts reentrant acceptOffer via MaliciousToken (asset position)", async function () {
      const [deployer, seller, buyer] = await ethers.getSigners();

      // Deploy MaliciousToken as the ATS asset
      const MaliciousFactory = await ethers.getContractFactory("MaliciousToken");
      const maliciousAts = (await MaliciousFactory.deploy("Mal", "MAL", 18)) as MaliciousToken;
      await maliciousAts.waitForDeployment();

      // Deploy MockERC20 as payment token
      const MockERC20Factory = await ethers.getContractFactory("MockERC20");
      const payToken = (await MockERC20Factory.deploy("Pay", "PAY", 6)) as MockERC20;
      await payToken.waitForDeployment();

      // Deploy DvPSettlement with malicious ATS token
      const DvPFactory = await ethers.getContractFactory("DvPSettlement");
      const dvp = (await DvPFactory.deploy(
        await maliciousAts.getAddress(),
        await payToken.getAddress()
      )) as DvPSettlement;
      await dvp.waitForDeployment();

      // Mint and approve
      await maliciousAts.mint(seller.address, ASSET_AMOUNT);
      await payToken.mint(buyer.address, PAYMENT_AMOUNT);
      await maliciousAts.connect(seller).approve(await dvp.getAddress(), ASSET_AMOUNT * 2n);
      await payToken.connect(buyer).approve(await dvp.getAddress(), PAYMENT_AMOUNT);

      // Create offer
      const block = await ethers.provider.getBlock("latest");
      const expiry = BigInt(block!.timestamp) + EXPIRY_OFFSET;
      await dvp.connect(seller).createOffer(buyer.address, ASSET_AMOUNT, PAYMENT_AMOUNT, expiry);

      // Set up the reentry target
      await maliciousAts.setReentryTarget(await dvp.getAddress(), 1n);

      // Accept should revert due to ReentrancyGuard
      await expect(dvp.connect(buyer).acceptOffer(1n)).to.be.reverted;
    });
  });

  // ==========================================================================
  describe("False-Return Token", function () {
    it("reverts when payment token transferFrom returns false (no revert)", async function () {
      const [deployer, seller, buyer] = await ethers.getSigners();

      // Deploy FalseReturnToken as payment token
      const FalseFactory = await ethers.getContractFactory("FalseReturnToken");
      const falsePayToken = (await FalseFactory.deploy("FalsePay", "FPT", 6)) as FalseReturnToken;
      await falsePayToken.waitForDeployment();

      // Deploy MockATSToken as ATS token
      const MockATSFactory = await ethers.getContractFactory("MockATSToken");
      const atsToken = (await MockATSFactory.deploy("ATS", "ATSD", 18)) as MockATSToken;
      await atsToken.waitForDeployment();

      // Deploy DvPSettlement
      const DvPFactory = await ethers.getContractFactory("DvPSettlement");
      const dvp = (await DvPFactory.deploy(
        await atsToken.getAddress(),
        await falsePayToken.getAddress()
      )) as DvPSettlement;
      await dvp.waitForDeployment();

      // Mint and approve (false token doesn't revert, so approvals are accepted)
      await atsToken.mint(seller.address, ASSET_AMOUNT);
      await falsePayToken.mint(buyer.address, PAYMENT_AMOUNT);
      await atsToken.connect(seller).approve(await dvp.getAddress(), ASSET_AMOUNT);
      await falsePayToken.connect(buyer).approve(await dvp.getAddress(), PAYMENT_AMOUNT);

      // Create offer
      const block = await ethers.provider.getBlock("latest");
      const expiry = BigInt(block!.timestamp) + EXPIRY_OFFSET;
      await dvp.connect(seller).createOffer(buyer.address, ASSET_AMOUNT, PAYMENT_AMOUNT, expiry);

      // Accept should revert because false-return from payment transferFrom fails require()
      await expect(dvp.connect(buyer).acceptOffer(1n)).to.be.revertedWith(
        "payment transfer failed"
      );
    });

    it("reverts when ATS asset transferFrom returns false (no revert)", async function () {
      const [deployer, seller, buyer] = await ethers.getSigners();

      // Deploy MockERC20 as normal payment token
      const MockERC20Factory = await ethers.getContractFactory("MockERC20");
      const payToken = (await MockERC20Factory.deploy("Pay", "PAY", 6)) as MockERC20;
      await payToken.waitForDeployment();

      // Deploy FalseReturnToken as ATS token
      const FalseFactory = await ethers.getContractFactory("FalseReturnToken");
      const falseAts = (await FalseFactory.deploy("FalseATS", "FATS", 18)) as FalseReturnToken;
      await falseAts.waitForDeployment();

      // Deploy DvPSettlement
      const DvPFactory = await ethers.getContractFactory("DvPSettlement");
      const dvp = (await DvPFactory.deploy(
        await falseAts.getAddress(),
        await payToken.getAddress()
      )) as DvPSettlement;
      await dvp.waitForDeployment();

      await falseAts.mint(seller.address, ASSET_AMOUNT);
      await payToken.mint(buyer.address, PAYMENT_AMOUNT);
      await falseAts.connect(seller).approve(await dvp.getAddress(), ASSET_AMOUNT);
      await payToken.connect(buyer).approve(await dvp.getAddress(), PAYMENT_AMOUNT);

      const block = await ethers.provider.getBlock("latest");
      const expiry = BigInt(block!.timestamp) + EXPIRY_OFFSET;
      await dvp.connect(seller).createOffer(buyer.address, ASSET_AMOUNT, PAYMENT_AMOUNT, expiry);

      // Payment succeeds; ATS false-return should cause revert
      await expect(dvp.connect(buyer).acceptOffer(1n)).to.be.revertedWith(
        "asset transfer failed"
      );
    });
  });
});
