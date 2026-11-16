// RentProp financial model check: NPV at 20/25/30%, payback, terminal value, fee sensitivity, gas economics.
// Educational project for the course Introduction to Finance. All figures are hypothetical, KZT million unless stated.
// Run: node scripts/model.mjs

const RECEIPTS = [0, 10.8, 27.0, 54.0];          // cash received from customers, Years 1-3
const FIXED    = [0, 17.199, 18.349, 22.548];    // fixed operating costs
const VARIABLE = [0, 0.638, 3.064, 6.917];       // variable operating costs
const EARNED_Y3 = 39.990;                        // earned service revenue, Year 3
const INITIAL = 19.9;                            // Year 0 expenditure
const FEE = 18000;                               // KZT per 12-month agreement

// Gas inputs: replace GAS_PER_AGREEMENT with the value measured by scripts/gas.ts
const GAS_PER_AGREEMENT = 344432;                // measured with scripts/gas.ts (average at 5% disputes)
const GWEI = 30, BUSY = 3, ETH_USD = 2000, KZT_PER_USD = 500;   // assumptions, cite sources in the report
const VAR_PER_AGREEMENT = 3130;                  // variable cost per agreement used in Section 4.4 of the report, KZT

const cashFlows = ({ volume = 1, fixed = 1, fee = FEE } = {}) => {
  const out = [-INITIAL];
  for (let t = 1; t <= 3; t++) {
    out.push(RECEIPTS[t] * volume * (fee / FEE) - FIXED[t] * fixed - VARIABLE[t] * volume);
  }
  return out;
};
const npv = (cf, r) => cf.reduce((s, x, i) => s + x / (1 + r) ** i, 0);
const cumulative = cf => cf.reduce((a, x) => (a.push((a.at(-1) ?? 0) + x), a), []);
const payback = cf => {
  const c = cumulative(cf);
  return c[3] > 0 ? (2 + (-c[2]) / cf[3]).toFixed(2) + " years" : "after Year 3";
};
const earnedOp3 = ({ volume = 1, fixed = 1, fee = FEE } = {}) =>
  EARNED_Y3 * volume * (fee / FEE) - FIXED[3] * fixed - VARIABLE[3] * volume;
const irr = cf => { let lo = -0.9, hi = 5; for (let i = 0; i < 200; i++) { const m = (lo + hi) / 2; npv(cf, m) > 0 ? lo = m : hi = m; } return (lo + hi) / 2; };
const f2 = x => Number(x.toFixed(2));

const cases = {
  "Base case":              {},
  "25% fewer agreements":   { volume: 0.75 },
  "30% fewer agreements":   { volume: 0.70 },
  "Fixed costs 20% higher": { fixed: 1.2 },
};

console.log("\nTable 7. NPV and payback (KZT million)");
console.table(Object.entries(cases).map(([name, p]) => {
  const cf = cashFlows(p);
  return {
    Case: name,
    "NPV 20%": f2(npv(cf, 0.20)), "NPV 25%": f2(npv(cf, 0.25)), "NPV 30%": f2(npv(cf, 0.30)),
    "Simple payback": payback(cf), "Cash end Y3": f2(cumulative(cf)[3]),
  };
}));

console.log("\nValue after Year 3 at 25% (terminal value, no growth, before tax)");
console.table(Object.entries(cases).filter(([n]) => !n.startsWith("30")).map(([name, p]) => {
  const cf = cashFlows(p), op = earnedOp3(p), tv = op / 0.25, pv = tv / 1.25 ** 3;
  const withTv = cf.slice(); withTv[3] += tv;
  return { Case: name, "Y3 operating profit": f2(op), "Terminal value": f2(tv), "PV of TV": f2(pv),
           "Total NPV": f2(npv(cf, 0.25) + pv), "Project IRR": (irr(withTv) * 100).toFixed(1) + "%" };
}));

console.log("\nTable C7. Sensitivity to the service fee (KZT million, 25%)");
console.table([12000, 15000, 18000, 21000, 24000].map(fee => {
  const cf = cashFlows({ fee });
  return { "Fee, KZT": fee, "3-year NPV": f2(npv(cf, 0.25)), "Cash end Y3": f2(cumulative(cf)[3]),
           "Total NPV with TV": f2(npv(cf, 0.25) + earnedOp3({ fee }) / 0.25 / 1.25 ** 3) };
}));

console.log("\nTable C8. Unit economics per agreement-year with gas (KZT)");
const gasKzt = mult => GAS_PER_AGREEMENT * GWEI * mult * 1e-9 * ETH_USD * KZT_PER_USD;
const row = (label, gas) => ({
  Network: label, Fee: FEE, "Variable cost": -VAR_PER_AGREEMENT, "Gas fees": gas ? -Math.round(gas) : 0,
  Contribution: Math.round(FEE - VAR_PER_AGREEMENT - gas), "Gas as % of fee": (gas / FEE * 100).toFixed(1) + "%",
});
console.table([row("Permissioned (gas price 0)", 0), row("Public, normal", gasKzt(1)), row(`Public, busy (x${BUSY})`, gasKzt(BUSY))]);
console.log(`Assumptions: ${GAS_PER_AGREEMENT.toLocaleString()} gas, ${GWEI} gwei, USD ${ETH_USD} per ETH, KZT ${KZT_PER_USD} per USD.\n`);