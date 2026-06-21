# PolicyGuard

**On-chain guardrails for autonomous agents on BNB Chain.** An AI agent can propose any transaction it wants, but it can only ever execute the ones an on-chain policy contract allows. Non-compliant actions are caught before they are ever broadcast.

Live and verified on BSC testnet. Built for the BNB AI Hack.

---

## The problem

Autonomous agents that hold a wallet are powerful and dangerous in the same breath. The moment an agent can sign transactions, a bad prompt, a hallucination, or a compromised step can move funds it should never touch. Most "agent safety" lives off-chain, in the agent's own code, which is exactly the layer you cannot trust once the agent misbehaves.

PolicyGuard moves the guardrail on-chain, where the agent cannot route around it.

## The approach

A single Solidity contract holds the policy. Every action the agent takes routes through one `execute` function, and that function checks the policy on-chain and reverts if any rule fails. The agent also gets a read-only `check` function so it can verify an action before spending gas on it. The result is a clean separation: the agent proposes, the chain decides.

Three rules are enforced on-chain:

- **Allow-list.** Funds can only move to approved addresses. Everything is denied by default.
- **Spend cap.** No single action can exceed the on-chain limit.
- **Pause.** A single owner-controlled kill switch halts all execution instantly.

All policy controls (`setAllowed`, `setSpendCap`, `setPaused`, `execute`) are owner-only, so the agent operates strictly inside a boundary the operator sets.

## Live on BSC testnet (the proof)

Everything below is on-chain and verifiable. The contract source is readable on BscScan.

| | |
|---|---|
| **Contract** | [`0x1862d321953a4b0e2f3b87028a930f12f320e9c8`](https://testnet.bscscan.com/address/0x1862d321953a4b0e2f3b87028a930f12f320e9c8) (verified) |
| **Network** | BSC testnet (chainId 97) |
| **Deploy tx** | [`0xd3aafe18...41bb19`](https://testnet.bscscan.com/tx/0xd3aafe1839df81577cf668076a0acb31163e0d219f2f1c8be63dd2964741bb19) |
| **Compliant execute tx** | [`0xc5387926...b38e09`](https://testnet.bscscan.com/tx/0xc5387926de110f8922f04326c41015df67051bc053b116523070d41ec4b38e09) |

The deploy, a policy-set transaction, and a compliant execution are all successful on-chain, clearing the hackathon's two-transaction requirement with margin.

## How it works

```
  Agent proposes an action
            |
            v
   check(target, value)   <-- on-chain, read-only, free
            |
     compliant? ----no----> denied, never broadcast
            |
           yes
            |
            v
  execute(target, value, data)   <-- on-chain enforcement
            |
   allow-list + spend cap + pause re-checked, reverts if any fail
            |
            v
      action settles on-chain
```

The key property: a denied action is filtered by `check` before it is ever sent, so it costs nothing and never touches the chain. The on-chain re-check inside `execute` means even a buggy or adversarial agent that skips `check` still cannot get a non-compliant action through.

### Contract interface

| Function | Access | Purpose |
|---|---|---|
| `check(target, value)` | view | Pre-flight verdict: returns whether an action would pass, and the reason if not. |
| `execute(target, value, data)` | owner | Runs an action only if it passes allow-list, spend cap, and pause. Emits `Executed`. |
| `setAllowed(target, bool)` | owner | Add or remove an address from the allow-list. |
| `setSpendCap(amount)` | owner | Set the maximum value per action. |
| `setPaused(bool)` | owner | Global kill switch. |

## Demo: the agent loop in action

The included agent loop proposes a batch of actions and only executes the compliant ones. Verified output from a live testnet run:

```
EXECUTED   Pay 0.02 BNB to approved vendor     -> success (allow-listed, within cap)
DENIED     Pay 2 BNB (over cap)                -> "exceeds spend cap"      (caught pre-flight, never broadcast)
DENIED     Pay 0.1 BNB to unknown address      -> "target not on allow-list" (caught pre-flight, never broadcast)
```

One action settled on-chain. Two were stopped before they could ever be sent.

## Tech stack

- **Contract:** Solidity (`^0.8.20`), one focused `PolicyGuard.sol`.
- **Chain:** BNB Smart Chain testnet (chainId 97).
- **Framework:** Scaffold-ETH 2 (Next.js, Wagmi, Viem, Hardhat).
- **Agent loop:** TypeScript with viem, standalone and chain-agnostic.

The agent loop talks to the contract through a standard EVM interface, so the same guardrail works for any agent or framework that can call a contract, not just this one.

## Run it yourself

```bash
# 1. Install
yarn install

# 2. Configure (never commit secrets)
cp packages/hardhat/.env.example packages/hardhat/.env
# fill in your RPC URL and deployer key in the .env file

# 3. Deploy PolicyGuard to BSC testnet
yarn deploy --network bscTestnet

# 4. Run the agent loop against your deployed contract
cd packages/hardhat
npx tsx scripts/agentLoop.ts
```

All secrets (RPC endpoint, deployer key) live in a gitignored `.env`. The deployer key is stored as an encrypted keystore, never as plaintext.

## Roadmap

The current build proves the core: an agent constrained by an on-chain policy it cannot escape. The natural next layer is a natural-language proposer, a thin LLM front end that turns plain English into a proposed action and feeds it into the same `check` and `execute` loop. Because the guardrail is on-chain, the proposer can be swapped or upgraded freely without ever weakening the safety boundary.

## License

MIT. Open source and free to use.
