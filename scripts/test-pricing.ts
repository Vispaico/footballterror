/** Verify pricing suffix parsing + cost computation */
import { parseModelChain, computeCostUsd } from "../packages/config/src/env.js";

const fakeEnv = {
  OPENROUTER_MODEL1_OXALPHA_FREE: "stealth/ox-alpha",
  OPENROUTER_MODEL2_LAGUNAS__0_09__0_18: "poolside/laguna-s-2.1",
  OPENROUTER_MODEL3_MIMO25__0_11__0_28: "xiaomi/mimo-v2.5",
  NVIDIA_MODEL1_M3: "minimaxai/minimax-m3",
};

const chain = parseModelChain("OPENROUTER_", fakeEnv);
console.log("OpenRouter chain with pricing:");
for (const e of chain) {
  console.log(`  ${e.model}  in=$${e.inputPerM ?? "—"}/M  out=$${e.outputPerM ?? "—"}/M`);
}

const nvidia = parseModelChain("NVIDIA_", fakeEnv);
console.log("NVIDIA chain:");
for (const e of nvidia) {
  console.log(`  ${e.model}  in=$${e.inputPerM ?? "—"}/M  out=$${e.outputPerM ?? "—"}/M`);
}

// Cost example: laguna-s at $0.09/$0.18 per M, typical agent call
const usage = { promptTokens: 129, completionTokens: 100 };
const entry = chain.find((e) => e.model === "poolside/laguna-s-2.1")!;
const cost = computeCostUsd(usage, entry);
console.log(`\nExample: ${usage.promptTokens} in / ${usage.completionTokens} out on laguna-s = $${cost}`);

const bigUsage = { promptTokens: 5_000_000, completionTokens: 2_000_000 };
console.log(`Scale check: 5M in / 2M out on laguna-s = $${computeCostUsd(bigUsage, entry)} (expect 0.45+0.36=0.81)`);
