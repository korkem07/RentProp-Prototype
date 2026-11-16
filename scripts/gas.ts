// Measures the gas used by each RentalEscrow function on the local Hardhat network.
// Educational project for the course Introduction to Finance. Local network only, no real funds.
// Run: npx hardhat run scripts/gas.ts
import hre from "hardhat";

const { ethers } = await hre.network.create();
const [landlord, tenant, reviewer] = await ethers.getSigners();
const DEPOSIT = 200_000n;

type Row = { step: string; gasUsed: number };

async function measure(rows: Row[], step: string, tx: Promise<any>) {
  const receipt = await (await tx).wait();
  rows.push({ step, gasUsed: Number(receipt.gasUsed) });
}

async function flow(disputed: boolean): Promise<Row[]> {
  const rows: Row[] = [];
  const escrow: any = await ethers.deployContract("RentalEscrow");

  await measure(rows, "createAgreement", escrow.connect(landlord).createAgreement(tenant.address, reviewer.address, DEPOSIT));
  await measure(rows, "confirmAgreement", escrow.connect(tenant).confirmAgreement(0));
  await measure(rows, "depositTestFunds", escrow.connect(tenant).depositTestFunds(0));
  await measure(rows, "proposeSettlement", escrow.connect(landlord).proposeSettlement(0, 50_000n, 150_000n));

  if (disputed) {
    await measure(rows, "disputeSettlement", escrow.connect(tenant).disputeSettlement(0));
    await measure(rows, "resolveDispute", escrow.connect(reviewer).resolveDispute(0, 20_000n, 180_000n));
  } else {
    await measure(rows, "approveSettlement", escrow.connect(tenant).approveSettlement(0));
  }
  return rows;
}

const total = (rows: Row[]) => rows.reduce((sum, r) => sum + r.gasUsed, 0);

const agreed = await flow(false);
const disputed = await flow(true);

console.log("\nAgreed settlement (5 transactions)");
console.table(agreed);
console.log("Disputed settlement (6 transactions)");
console.table(disputed);

const DISPUTE_RATE = 0.05; // dispute frequency assumed in the financial model
const average = Math.round(total(agreed) * (1 - DISPUTE_RATE) + total(disputed) * DISPUTE_RATE);

console.table([
  { case: "Agreed settlement", totalGas: total(agreed) },
  { case: "Disputed settlement", totalGas: total(disputed) },
  { case: "Average at 5% disputes", totalGas: average },
]);
console.log(`Use ${average.toLocaleString()} as GAS_PER_AGREEMENT in scripts/model.mjs and in the report.\n`);
