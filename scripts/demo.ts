import hre from "hardhat";

const { ethers } = await hre.network.create();

console.log("\n========================================");
console.log("   RENTPROP EDUCATIONAL PROTOTYPE");
console.log("========================================");
console.log("Local Hardhat network");
console.log("Fictional test balances only");
console.log("No real money or cryptocurrency\n");

// --------------------------------------------------
// 1. Get local test accounts
// --------------------------------------------------

const [landlord, tenant, reviewer] =
  await ethers.getSigners();

console.log("TEST PARTICIPANTS");
console.log("-----------------");
console.log("Landlord:", landlord.address);
console.log("Tenant:  ", tenant.address);
console.log("Reviewer:", reviewer.address);

// --------------------------------------------------
// 2. Deploy RentalEscrow
// --------------------------------------------------

console.log("\n[1] DEPLOYING RENTAL ESCROW...");

const escrow =
  await ethers.deployContract("RentalEscrow");

await escrow.waitForDeployment();

const contractAddress =
  await escrow.getAddress();

console.log("Contract deployed successfully");
console.log("Contract address:", contractAddress);

// --------------------------------------------------
// 3. Landlord creates agreement
// --------------------------------------------------

console.log("\n[2] LANDLORD CREATES AGREEMENT");

const depositAmount = 200_000n;

const createTx = await escrow
  .connect(landlord)
  .createAgreement(
    tenant.address,
    reviewer.address,
    depositAmount
  );

await createTx.wait();

console.log(
  "Agreement #0 created"
);

console.log(
  "Security deposit:",
  depositAmount.toString(),
  "TEST UNITS"
);

// --------------------------------------------------
// 4. Tenant confirms agreement
// --------------------------------------------------

console.log("\n[3] TENANT CONFIRMS AGREEMENT");

const confirmTx = await escrow
  .connect(tenant)
  .confirmAgreement(0);

await confirmTx.wait();

console.log("Agreement confirmed by tenant");

// --------------------------------------------------
// 5. Tenant records test deposit
// --------------------------------------------------

console.log("\n[4] TEST DEPOSIT RECORDED");

const depositTx = await escrow
  .connect(tenant)
  .depositTestFunds(0);

await depositTx.wait();

console.log(
  "Locked:",
  depositAmount.toString(),
  "TEST UNITS"
);

// --------------------------------------------------
// 6. Landlord proposes deduction
// --------------------------------------------------

console.log("\n[5] LANDLORD PROPOSES SETTLEMENT");

const proposedLandlordAmount = 50_000n;
const proposedTenantAmount = 150_000n;

const proposalTx = await escrow
  .connect(landlord)
  .proposeSettlement(
    0,
    proposedLandlordAmount,
    proposedTenantAmount
  );

await proposalTx.wait();

console.log(
  "Landlord requests:",
  proposedLandlordAmount.toString()
);

console.log(
  "Tenant would receive:",
  proposedTenantAmount.toString()
);

// --------------------------------------------------
// 7. Tenant disputes
// --------------------------------------------------

console.log("\n[6] TENANT DISPUTES SETTLEMENT");

const disputeTx = await escrow
  .connect(tenant)
  .disputeSettlement(0);

await disputeTx.wait();

console.log("Settlement marked as DISPUTED");

// --------------------------------------------------
// 8. Reviewer resolves dispute
// --------------------------------------------------

console.log("\n[7] INDEPENDENT REVIEWER DECISION");

const finalLandlordAmount = 20_000n;
const finalTenantAmount = 180_000n;

const resolveTx = await escrow
  .connect(reviewer)
  .resolveDispute(
    0,
    finalLandlordAmount,
    finalTenantAmount
  );

await resolveTx.wait();

console.log(
  "Approved deduction:",
  finalLandlordAmount.toString(),
  "TEST UNITS"
);

console.log(
  "Returned to tenant:",
  finalTenantAmount.toString(),
  "TEST UNITS"
);

// --------------------------------------------------
// 9. Read final state
// --------------------------------------------------

const agreement =
  await escrow.agreements(0);

console.log("\n[8] FINAL AGREEMENT STATE");

console.log(
  "Landlord allocation:",
  agreement.landlordAmount.toString()
);

console.log(
  "Tenant allocation:",
  agreement.tenantAmount.toString()
);

// Enum:
// Created = 0
// Confirmed = 1
// Funded = 2
// Proposed = 3
// Disputed = 4
// Settled = 5

if (agreement.state === 5n) {
  console.log("Status: SETTLED ✅");
} else {
  console.log(
    "Status code:",
    agreement.state.toString()
  );
}

console.log("\n========================================");
console.log("Demo completed successfully");
console.log("No real money was used");
console.log("========================================\n");