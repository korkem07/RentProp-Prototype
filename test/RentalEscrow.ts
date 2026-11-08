import { expect } from "chai";
import hre from "hardhat";

const { ethers } = await hre.network.create();

describe("RentalEscrow", function () {
  let escrow: any;

  let landlord: any;
  let tenant: any;
  let reviewer: any;
  let stranger: any;

  const DEPOSIT = 200_000n;

  beforeEach(async function () {
    [landlord, tenant, reviewer, stranger] =
      await ethers.getSigners();

    escrow = await ethers.deployContract("RentalEscrow");
  });

  async function createAgreement() {
    await escrow
      .connect(landlord)
      .createAgreement(
        tenant.address,
        reviewer.address,
        DEPOSIT
      );
  }

  async function createFundedAgreement() {
    await createAgreement();

    await escrow
      .connect(tenant)
      .confirmAgreement(0);

    await escrow
      .connect(tenant)
      .depositTestFunds(0);
  }

  // TEST 1
  it("creates a rental agreement", async function () {
    await createAgreement();

    const agreement = await escrow.agreements(0);

    expect(agreement.landlord).to.equal(landlord.address);
    expect(agreement.tenant).to.equal(tenant.address);
    expect(agreement.reviewer).to.equal(reviewer.address);
    expect(agreement.depositAmount).to.equal(DEPOSIT);

    expect(await escrow.nextAgreementId()).to.equal(1n);
  });

  // TEST 2
  it("allows only the tenant to confirm the agreement", async function () {
    await createAgreement();

    await expect(
      escrow
        .connect(stranger)
        .confirmAgreement(0)
    ).to.be.revertedWith("Only tenant");

    await escrow
      .connect(tenant)
      .confirmAgreement(0);

    const agreement = await escrow.agreements(0);

    // State.Confirmed = 1
    expect(agreement.state).to.equal(1n);
  });

  // TEST 3
  it("does not allow test deposit before confirmation", async function () {
    await createAgreement();

    await expect(
      escrow
        .connect(tenant)
        .depositTestFunds(0)
    ).to.be.revertedWith(
      "Agreement not confirmed"
    );

    await escrow
      .connect(tenant)
      .confirmAgreement(0);

    await escrow
      .connect(tenant)
      .depositTestFunds(0);

    const agreement = await escrow.agreements(0);

    // State.Funded = 2
    expect(agreement.state).to.equal(2n);
  });

  // TEST 4
  it("allows only the landlord to propose a settlement", async function () {
    await createFundedAgreement();

    await expect(
      escrow
        .connect(tenant)
        .proposeSettlement(
          0,
          50_000n,
          150_000n
        )
    ).to.be.revertedWith("Only landlord");

    await escrow
      .connect(landlord)
      .proposeSettlement(
        0,
        50_000n,
        150_000n
      );

    const agreement = await escrow.agreements(0);

    // State.Proposed = 3
    expect(agreement.state).to.equal(3n);
  });

  // TEST 5
  it("requires settlement allocation to equal the deposit", async function () {
    await createFundedAgreement();

    await expect(
      escrow
        .connect(landlord)
        .proposeSettlement(
          0,
          50_000n,
          160_000n
        )
    ).to.be.revertedWith(
      "Allocation must equal deposit"
    );
  });

  // TEST 6
  it("allows the tenant to approve a valid settlement", async function () {
    await createFundedAgreement();

    await escrow
      .connect(landlord)
      .proposeSettlement(
        0,
        50_000n,
        150_000n
      );

    await escrow
      .connect(tenant)
      .approveSettlement(0);

    const agreement = await escrow.agreements(0);

    // State.Settled = 5
    expect(agreement.state).to.equal(5n);

    expect(
      agreement.landlordAmount
    ).to.equal(50_000n);

    expect(
      agreement.tenantAmount
    ).to.equal(150_000n);
  });

  // TEST 7
  it("allows only the reviewer to resolve a dispute", async function () {
    await createFundedAgreement();

    await escrow
      .connect(landlord)
      .proposeSettlement(
        0,
        50_000n,
        150_000n
      );

    await escrow
      .connect(tenant)
      .disputeSettlement(0);

    await expect(
      escrow
        .connect(stranger)
        .resolveDispute(
          0,
          20_000n,
          180_000n
        )
    ).to.be.revertedWith("Only reviewer");

    await escrow
      .connect(reviewer)
      .resolveDispute(
        0,
        20_000n,
        180_000n
      );

    const agreement = await escrow.agreements(0);

    expect(agreement.state).to.equal(5n);
    expect(agreement.landlordAmount).to.equal(20_000n);
    expect(agreement.tenantAmount).to.equal(180_000n);
  });

  // TEST 8
  it("does not allow the same agreement to be settled twice", async function () {
    await createFundedAgreement();

    await escrow
      .connect(landlord)
      .proposeSettlement(
        0,
        50_000n,
        150_000n
      );

    await escrow
      .connect(tenant)
      .disputeSettlement(0);

    await escrow
      .connect(reviewer)
      .resolveDispute(
        0,
        20_000n,
        180_000n
      );

    await expect(
      escrow
        .connect(reviewer)
        .resolveDispute(
          0,
          20_000n,
          180_000n
        )
    ).to.be.revertedWith(
      "Agreement is not disputed"
    );
  });
});