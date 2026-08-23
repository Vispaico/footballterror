export { quantAgent } from "./agents/quant.js";
export { gafferAgent } from "./agents/gaffer.js";
export { historianAgent } from "./agents/historian.js";
export { contrarianAgent } from "./agents/contrarian.js";
export { terrorAgent } from "./agents/terror.js";
export type { Agent, AgentContext } from "./types.js";
export { interpretEvidence, synthesizeVerdict, validateObservations } from "./llm-reasoning.js";
export { genId, makeObservation, makeClaim } from "./types.js";
