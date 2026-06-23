import Anthropic from "@anthropic-ai/sdk";
import { isAddress } from "viem";

// Server-only route. The Anthropic key never reaches the client; this handler
// runs in the Node.js runtime and reads it from the environment.
export const runtime = "nodejs";

// Known payees the LLM may resolve a label to. The one allow-listed vendor is
// sourced from the agent loop (packages/hardhat/scripts/agentLoop.ts). Do NOT
// invent addresses. Any name/0x not in this map passes through unchanged and is
// correctly denied on-chain by check(). Resolution is NOT policy: an address
// resolved here still goes through check() and can be denied (e.g. over cap).
const KNOWN_PAYEES: Record<string, string> = {
  vendor: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
};

const MODEL = "claude-haiku-4-5"; // light parse, a small model is plenty

const SYSTEM_PROMPT = `You convert a plain-English payment request into a structured proposal for an on-chain agent.

You are ONLY a proposer. You do not approve, reject, or judge payments. An on-chain policy contract does that. Never refuse a request for being too large, off-list, or otherwise non-compliant. Always extract what was asked and let the contract decide. Extracting an over-budget or unknown-recipient payment is correct behavior.

Known payees (resolve a matching label to its address):
${Object.entries(KNOWN_PAYEES)
  .map(([label, addr]) => `- "${label}" -> ${addr}`)
  .join("\n")}

Rules:
- If the text names a known payee label, set "label" to that label and "address" to its mapped address.
- If the text gives an explicit 0x address, use it verbatim as "address" and set "label" to "" (or a short descriptor).
- "valueBnb" is the amount in BNB as a decimal string (e.g. "0.02"). Strip currency words.
- "reasoning" is one short sentence on how you parsed it.

Return STRICT JSON only, with no prose and no markdown fences:
{"address": "0x...", "valueBnb": "0.02", "label": "vendor", "reasoning": "..."}`;

type Parsed = { address: string; valueBnb: string; label: string; reasoning: string };

// Strip accidental ```json fences and parse defensively.
function parseModelJson(raw: string): Parsed | null {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  try {
    const obj = JSON.parse(cleaned);
    if (typeof obj?.address !== "string" || typeof obj?.valueBnb !== "string") return null;
    return {
      address: obj.address,
      valueBnb: obj.valueBnb,
      label: typeof obj.label === "string" ? obj.label : "",
      reasoning: typeof obj.reasoning === "string" ? obj.reasoning : "",
    };
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "Server is missing ANTHROPIC_API_KEY." }, { status: 500 });
  }

  let text: string;
  try {
    const body = await request.json();
    text = typeof body?.text === "string" ? body.text.trim() : "";
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (!text) {
    return Response.json({ error: "Describe a payment, e.g. “pay 0.02 to vendor”." }, { status: 400 });
  }

  let raw: string;
  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: text }],
    });
    raw = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map(b => b.text)
      .join("");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error calling the model.";
    return Response.json({ error: `Model request failed: ${message}` }, { status: 502 });
  }

  const parsed = parseModelJson(raw);
  if (!parsed) {
    return Response.json({ error: "Could not parse a proposal from the request." }, { status: 422 });
  }

  // Deterministic resolution: a known label is authoritative over whatever
  // address the model echoed (defends against a fat-fingered hex). Unknown
  // labels/addresses pass through verbatim to be judged by check().
  const known = KNOWN_PAYEES[parsed.label.trim().toLowerCase()];
  const address = known ?? parsed.address;

  if (!isAddress(address)) {
    return Response.json({ error: `Resolved an invalid recipient address: ${address}` }, { status: 422 });
  }

  return Response.json({ address, valueBnb: parsed.valueBnb, label: parsed.label, reasoning: parsed.reasoning });
}
