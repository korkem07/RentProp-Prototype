### Security Analysis
We analyzed three main security threats for the RentProp platform and its `RentalEscrow` smart contract, and implemented the following mitigations:

1. **Broken Access Control (Unauthorized Deposit Release)**
   - **Threat**: An unauthorized user might attempt to call the release function to steal the security deposit.
   - **Mitigation**: We prevent this by implementing strict role-based permissions. The deposit can only be released if both the tenant and landlord approve the settlement, or if an authorized independent reviewer submits a formal decision. 

2. **Reentrancy Attacks**
   - **Threat**: A malicious fallback function could repeatedly call the withdrawal function to drain funds before the contract balance updates.
   - **Mitigation**: We follow the checks-effects-interactions pattern and apply a reentrancy guard (e.g., `nonReentrant` modifier) on all functions handling the transfer of test funds.

3. **Tampering with Off-Chain Evidence**
   - **Threat**: Since sensitive rental documents and photographs are stored off-chain, a malicious party could alter these files to win a dispute.
   - **Mitigation**: We record cryptographic hashes of the check-in condition reports and photographs directly on the private Besu network. If any off-chain document is altered, its new hash will not match the on-chain record, exposing the tampering.

### External Audit Plan
Before any production launch, we plan to conduct a comprehensive external security audit. The cost of this independent audit is budgeted at KZT 2.000 million, which is already accounted for in our Year 0 development funding.
