# AGENTS.md — FootballTerror Agent System

> This document is the authoritative reference for building, testing, and operating agents in FootballTerror.
> Every agent must comply with the contracts defined here. Deviations require an architecture decision record.

---

## 1. What Is an Agent?

An agent is a **structured reasoning module** that:

1. Receives **typed evidence** (features, predictions, historical data, other agents' claims)
2. Produces **typed outputs** (observations, claims) with explicit confidence and provenance
3. Runs inside a **tracked execution context** (AgentRun) with token/cost accounting
4. Never fabricates numerical data — only interprets, contextualizes, and challenges

Agents are **not** prompt-and-pray wrappers. They are deterministic input→output processors
that may use an LLM for the reasoning step but must produce schema-validated, auditable output.

---

## 2. Architecture

```
                    ┌─────────────────────────────┐
                    │         Agent Runner         │
                    │   (services/agents/)         │
                    ├─────────────────────────────┤
                    │  1. Resolve inputs from DB   │
                    │  2. Build prompt/context     │
                    │  3. Call LLM (or deterministic│
                    │     logic for simple agents) │
                    │  4. Validate output schema   │
                    │  5. Store AgentRun + Obser-  │
                    │     vations + Claims to DB   │
                    └──────────┬──────────────────┘
                               │
            ┌──────────────────┼──────────────────┐
            │                  │                  │
      ┌─────▼─────┐    ┌──────▼──────┐    ┌──────▼──────┐
      │   Quant    │    │   Gaffer    │    │ Historian   │
      │ Forecaster │    │ Contrarian  │    │  (future)   │
      └─────┬─────┘    └──────┬──────┘    └──────┬──────┘
            │                  │                  │
            └──────────────────┼──────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │     The Terror      │
                    │  (Chief Synthesis)  │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │   TerrorVerdict     │
                    │  → Match Room       │
                    │  → War Room         │
                    └─────────────────────┘
```

### Execution Order

Agents run in dependency order, not all at once:

1. **Quant** and **Forecaster** run first (they consume raw features/predictions)
2. **Gaffer** and **Historian** run second (they consume features + agent observations)
3. **Contrarian** runs third (it consumes all other agents' claims)
4. **The Terror** runs last (it synthesizes everything)

Within each tier, agents run **concurrently** where possible.

---

## 3. Canonical Types

All agent types are defined in `packages/football-schema/src/types/agent.ts`.

### 3.1 AgentType

```typescript
type AgentType =
  | 'quant' | 'forecaster' | 'gaffer' | 'historian' | 'contrarian'
  | 'terror' | 'scout' | 'newsroom' | 'verifier' | 'kop' | 'broadcaster' | 'publisher';
```

**Phase 5 agents**: `quant`, `forecaster`, `gaffer`, `historian`, `contrarian`, `terror`
**Future agents**: `scout`, `newsroom`, `verifier`, `kop`, `broadcaster`, `publisher`

### 3.2 EvidenceType

Every observation and claim MUST be tagged:

| Type | Meaning | When to Use |
|------|---------|-------------|
| `FACT` | Verified data from a trusted source | "Liverpool have won 8 of their last 10 home matches" |
| `MODEL_OUTPUT` | Numerical output from a deterministic model | "Elo model gives Liverpool 87.3 rating" |
| `FORECAST` | Time-series prediction with uncertainty | "xG trajectory forecasts 2.1 expected goals next match" |
| `INFERENCE` | Logical deduction from evidence | "Given the injury list, Liverpool's PPDA will likely rise" |
| `OPINION` | Subjective assessment (clearly labeled) | "The tactical setup favors an open game" |
| `UNKNOWN` | Insufficient evidence to make a claim | "No reliable data on head-to-head in this formation" |

**Rule**: If you cannot classify your evidence as FACT, MODEL_OUTPUT, or FORECAST, use INFERENCE.
Only use OPINION when genuinely subjective. Use UNKNOWN when you have nothing.

### 3.3 AgentRun

Every agent execution creates an `AgentRun` record:

```typescript
interface AgentRun {
  id: string;                    // ft:agent:{type}:{fixtureId}:{timestamp}
  agentType: AgentType;
  fixtureId?: string;            // which match this run is for
  teamId?: string;               // team-level context
  playerId?: string;             // player-level context
  trigger: string;               // what triggered this run
  modelVersion: string;          // agent version (semver)
  startedAt: Date;
  completedAt?: Date;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'timeout';
  inputHash: string;             // SHA-256 of all inputs
  tokenUsage?: {                 // LLM consumption tracking
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    costUsd?: number;
    model: string;               // e.g. "gpt-4o-mini"
    provider: string;            // e.g. "openai"
  };
  error?: string;
  createdAt: Date;
}
```

**Database table**: `agent_runs` in `packages/database/src/schema/predictions.ts`

### 3.4 AgentObservation

A structured observation is the atomic unit of agent output:

```typescript
interface AgentObservation {
  id: string;                    // ft:obs:{agentType}:{runId}:{index}
  agentRunId: string;            // FK → agent_runs.id
  agentType: AgentType;
  category: string;              // e.g. "form", "tactical", "xg_trend"
  evidenceType: EvidenceType;
  claim: string;                 // the observation text
  confidence: number;            // 0.0 – 1.0
  supportingData: AgentDataPoint[];
  contradictingData?: AgentDataPoint[];
  sourceReferences: string[];    // provenance chain
  createdAt: Date;
}
```

**Database table**: `agent_observations`

### 3.5 AgentDataPoint

Every supporting/contradicting data point must be a structured value:

```typescript
interface AgentDataPoint {
  label: string;                 // e.g. "Last 5 home xG"
  value: number | string;        // the actual value
  unit?: string;                 // e.g. "xG per match"
  source: string;                // where this data came from
  context?: string;              // additional context
}
```

**Rule**: `value` must come from the database, a model, or a verified source.
Never invent `AgentDataPoint` values from LLM generation.

### 3.6 AgentClaim

Claims are synthesized from observations:

```typescript
interface AgentClaim {
  id: string;                    // ft:claim:{agentType}:{runId}:{index}
  agentRunId: string;
  observationId?: string;        // primary observation this claim is based on
  agentType: AgentType;
  claimType: EvidenceType;
  claim: string;                 // the claim text
  confidence: number;            // 0.0 – 1.0
  evidence: string[];            // observation IDs supporting this claim
  contradictoryEvidence?: string[];  // observation IDs contradicting this claim
  published: boolean;
  publishedAt?: Date;
  createdAt: Date;
}
```

**Database table**: `agent_claims`

### 3.7 TerrorVerdict

The Terror's final synthesis for a fixture:

```typescript
interface TerrorVerdict {
  id: string;                    // ft:verdict:{fixtureId}:{timestamp}
  fixtureId: string;
  agentRunId: string;            // The Terror's run that produced this
  headline: string;              // one-line summary
  summary: string;               // 2-4 sentence intelligence summary
  keyInsights: string[];         // top 3-5 bullet points
  predictionReference?: string;  // link to MatchPrediction
  powerIndexReference?: string;  // link to PowerIndexSnapshot
  terrorIndexReference?: string; // link to TerrorIndexSnapshot
  agentContributions: Record<AgentType, string>;  // what each agent contributed
  confidence: number;
  published: boolean;
  createdAt: Date;
}
```

---

## 4. Agent Definitions

### 4.1 Quant

| Property | Value |
|----------|-------|
| **Purpose** | Interpret statistical and model evidence |
| **Tier** | 1 (runs first) |
| **LLM Required** | Yes (for interpretation) |
| **Inputs** | `TeamFeature[]`, `MatchPrediction[]`, `PowerIndexSnapshot`, `TeamForecast[]` |
| **Outputs** | Observations + Claims about statistical patterns |
| **Categories** | `form`, `xg_trend`, `shot_volume`, `possession_trend`, `defensive_record`, `home_away_split` |
| **Forbidden** | Making tactical claims, inventing statistics, claiming certainty |

**Example observations**:
- `[MODEL_OUTPUT] Liverpool's xG over the last 5 home matches (2.3 avg) significantly exceeds the league average (1.5). Confidence: 0.92`
- `[FACT] Arsenal's PPDA of 8.2 over the last 3 matches indicates sustained high pressing. Confidence: 0.95`
- `[FORECAST] Based on rolling 10-match trends, Liverpool's shot volume is declining (-0.3/match). Confidence: 0.71`

**Data access**:
```
Read: team_features, match_predictions, power_index_snapshots, team_forecasts
Write: agent_runs, agent_observations, agent_claims
```

### 4.2 Forecaster

| Property | Value |
|----------|-------|
| **Purpose** | Interpret time-series forecasts and trends |
| **Tier** | 1 (runs first) |
| **LLM Required** | Yes |
| **Inputs** | `TeamForecast[]`, `PlayerForecast[]`, rolling feature windows |
| **Outputs** | Observations + Claims about forward-looking signals |
| **Categories** | `xg_forecast`, `form_trajectory`, `player_output_trend`, `congestion_impact` |
| **Forbidden** | Claiming forecasts are certain, ignoring forecast uncertainty bands |

**Example observations**:
- `[FORECAST] TimesFM projects Liverpool's xG at 2.1 ± 0.4 for the next 3 matches, suggesting sustained attacking output. Confidence: 0.78`
- `[INFERENCE] The P90 forecast for Salah's xA (0.32) is below his 10-match average (0.41), possibly indicating reduced creative involvement. Confidence: 0.65`

**Data access**:
```
Read: team_forecasts, player_forecasts, team_features (rolling windows)
Write: agent_runs, agent_observations, agent_claims
```

### 4.3 Gaffer

| Property | Value |
|----------|-------|
| **Purpose** | Provide tactical hypotheses grounded in evidence |
| **Tier** | 2 (runs after Tier 1) |
| **LLM Required** | Yes (primary reasoning agent) |
| **Inputs** | `TeamFeature[]`, `MatchEvent[]`, `Lineup[]`, Tier 1 agent observations |
| **Outputs** | Observations + Claims about tactical dynamics |
| **Categories** | `pressing_structure`, `build_up_pattern`, `transition_threat`, `set_piece_threat`, `defensive_vulnerability` |
| **Forbidden** | Inventing tactical narratives without data, ignoring contradicting evidence |

**Example observations**:
- `[INFERENCE] Liverpool's PPDA of 7.8 combined with high turnovers (3.2/match) suggests an aggressive press that creates transition opportunities. Confidence: 0.85`
- `[INFERENCE] Arsenal's left side (Zinchenko invert + Martinelli) has conceded 0.8 xGA from that zone in the last 5 matches — a potential overload point. Confidence: 0.72`

**Data access**:
```
Read: team_features, match_events, lineups, player_match_stats, agent_observations (Tier 1)
Write: agent_runs, agent_observations, agent_claims
```

### 4.4 Historian

| Property | Value |
|----------|-------|
| **Purpose** | Find relevant historical precedents in FootballTerror's data |
| **Tier** | 2 (runs after Tier 1) |
| **LLM Required** | Yes (for contextualizing history) |
| **Inputs** | Historical fixtures, results, events, head-to-head records |
| **Outputs** | Observations + Claims about historical patterns |
| **Categories** | `head_to_head`, `historical_form`, `venue_record`, `manager_record`, ` derby_context` |
| **Forbidden** | Misrepresenting sample sizes, cherry-picking data, ignoring context |

**Example observations**:
- `[FACT] In the last 10 Liverpool vs Arsenal matches at Emirates, Liverpool have won 3, drawn 4, lost 3. Confidence: 1.0`
- `[FACT] Arsenal have scored in each of their last 15 home Premier League matches. Confidence: 1.0`
- `[INFERENCE] Klopp's record against Arteta is W3 D2 L1, but all wins came with a fully fit midfield — which is not the case here. Confidence: 0.68`

**Data access**:
```
Read: fixtures, match_events, team_match_stats, player_match_stats, lineups
Write: agent_runs, agent_observations, agent_claims
```

### 4.5 Contrarian

| Property | Value |
|----------|-------|
| **Purpose** | Deliberately challenge high-confidence conclusions |
| **Tier** | 3 (runs after Tier 2) |
| **LLM Required** | Yes (adversarial reasoning) |
| **Inputs** | All other agents' claims, raw features, historical data |
| **Outputs** | Observations + Claims that challenge consensus |
| **Categories** | `confidence_challenge`, `sample_size_warning`, `regression_signal`, `fatigue_factor`, `narrative_vs_data` |
| **Forbidden** | Being contrarian without evidence, ignoring strong consensus, manufacturing doubt |

**Rule of thumb**: The Contrarian should target claims with confidence > 0.80.
If no claim exceeds 0.80, the Contrarian may still flag concerning signals
but should note the overall confidence is moderate.

**Example observations**:
- `[INFERENCE] Quant's claim of Liverpool's xG dominance (confidence 0.92) is based on a 5-match sample. The 10-match sample shows a decline: 2.3 → 1.9 → 1.7 xG. Confidence: 0.74`
- `[FACT] Arsenal's defensive record in the last 3 matches (0.3 xGA/match) contradicts the narrative of a weak defence. Confidence: 0.88`

**Data access**:
```
Read: agent_claims (all agents), team_features, match_predictions, fixtures
Write: agent_runs, agent_observations, agent_claims
```

### 4.6 The Terror

| Property | Value |
|----------|-------|
| **Purpose** | Chief intelligence synthesis — decides what matters |
| **Tier** | 4 (runs last) |
| **LLM Required** | Yes (highest-quality model for final synthesis) |
| **Inputs** | All agent claims + observations, predictions, Power Index, Terror Index |
| **Outputs** | `TerrorVerdict` (headline, summary, key insights) |
| **Categories** | `synthesis` |
| **Forbidden** | Inventing evidence, contradicting data without citing it, adding information not provided by other agents |

**The Terror does NOT**:
- Run its own analysis
- Generate new data points
- Override agent claims
- Make up narratives

**The Terror DOES**:
- Rank importance of agent claims
- Identify the strongest supporting and contradicting signals
- Synthesize a coherent narrative from structured evidence
- Produce a headline and summary for the Match Room
- Assign overall confidence based on agent agreement

**Data access**:
```
Read: agent_claims (all agents), agent_observations, match_predictions,
      power_index_snapshots, terror_index_snapshots
Write: agent_runs, terror_verdicts
```

---

## 5. Execution Lifecycle

### 5.1 Trigger

Agent runs are triggered by domain events:

| Event | Agents Triggered |
|-------|-----------------|
| `FIXTURE_CREATED` | None (just stores fixture) |
| `LINEUP_CONFIRMED` | Quant, Forecaster, Gaffer, Historian, Contrarian, Terror |
| `MATCH_FINISHED` | Quant, Forecaster, Historian (for evaluation) |
| `MODEL_RECALCULATED` | Quant, Forecaster |
| `PLAYER_AVAILABILITY_CHANGED` | Gaffer, Quant |
| `POWER_INDEX_CHANGED` | Quant |
| `TERROR_INDEX_CHANGED` | Terror |

### 5.2 Input Resolution

Before an agent runs, the runner resolves its inputs from the database:

```typescript
// Pseudocode
const inputs = {
  features: await db.select().from(teamFeatures)
    .where(eq(teamFeatures.teamId, fixture.homeTeamId))
    .orderBy(desc(teamFeatures.createdAt))
    .limit(20),
  
  predictions: await db.select().from(matchPredictions)
    .where(eq(matchPredictions.fixtureId, fixtureId))
    .orderBy(desc(matchPredictions.generatedAt))
    .limit(5),
  
  // ... other inputs based on agent type
};
```

### 5.3 Prompt Construction

The runner builds a structured prompt:

```
You are the {AgentType} agent for FootballTerror.

TASK: {agent-specific instructions}

EVIDENCE:
{formatted structured data}

CONSTRAINTS:
- Never invent numerical data
- Tag every observation with an EvidenceType
- Assign confidence 0.0-1.0
- Reference supporting data points
- Note contradicting evidence if present

OUTPUT SCHEMA:
{JSON schema for expected output}
```

### 5.4 Output Validation

The runner validates the LLM output against the schema:

1. Parse JSON response
2. Validate against `AgentObservation[]` and `AgentClaim[]` schemas
3. Check all `AgentDataPoint` values are present
4. Verify confidence is in [0, 1]
5. Verify evidenceType is a valid enum value
6. Reject and retry if validation fails (max 2 retries)

### 5.5 Storage

Validated output is stored atomically:

```
BEGIN TRANSACTION;
  INSERT INTO agent_runs (...);
  INSERT INTO agent_observations (...);
  INSERT INTO agent_claims (...);
COMMIT;
```

### 5.6 Evaluation

After a match finishes, agent claims are evaluated against actual results:

- **Quant claims** → compared to actual match stats
- **Model claims** → compared to actual outcomes
- **Gaffer claims** → qualitatively assessed (human review in Phase 1)
- **Historian claims** → factual accuracy checked
- **Contrarian claims** → evaluated on whether they identified real risks

---

## 6. Hallucination Defense

### 6.1 The Three Rules

1. **Never invent numbers.** Every numerical claim must come from a database query, model output, or verified source.
2. **Never manufacture data points.** Every `AgentDataPoint` must reference a real source.
3. **Never turn uncertainty into false certainty.** If confidence < 0.5, use UNKNOWN.

### 6.2 Validation Checklist

Before publishing any agent claim:

- [ ] Every `AgentDataPoint` has a `source` field
- [ ] `source` references a real database table or model version
- [ ] `value` is a real number/string (not hallucinated)
- [ ] `evidenceType` is appropriate (FACT requires verified data, etc.)
- [ ] `confidence` is honest (not inflated for apparent authority)
- [ ] Contradicting evidence is included if it exists
- [ ] The claim text does not contain information not present in the data

### 6.3 Confidence Calibration

Agents should produce honest confidence scores. Calibration targets:

| Confidence Range | Meaning | Action |
|-----------------|---------|--------|
| 0.9 – 1.0 | Strong evidence, well-established | Publish prominently |
| 0.7 – 0.9 | Good evidence, some uncertainty | Publish with caveats |
| 0.5 – 0.7 | Moderate evidence, significant uncertainty | Include in analysis, note uncertainty |
| 0.3 – 0.5 | Weak evidence, speculative | Flag as uncertain, do not publish prominently |
| 0.0 – 0.3 | Insufficient evidence | Output UNKNOWN |

### 6.4 Contradiction Handling

When agents disagree:

1. The Contrarian's role is to surface disagreements
2. The Terror's role is to present both sides
3. Never hide contradicting evidence
4. Display disagreement to users — it's valuable intelligence

---

## 7. LLM Routing

### 7.1 Model Selection

| Agent | Recommended Model | Rationale |
|-------|------------------|-----------|
| Quant | `gpt-4o-mini` | Structured interpretation, cost-efficient |
| Forecaster | `gpt-4o-mini` | Similar to Quant |
| Gaffer | `gpt-4o` | Complex tactical reasoning needs stronger model |
| Historian | `gpt-4o-mini` | Data lookup + simple contextualization |
| Contrarian | `gpt-4o-mini` | Adversarial reasoning, but constrained scope |
| The Terror | `gpt-4o` | Final synthesis needs highest quality |

### 7.2 Cost Controls

- **Deterministic first**: If an agent's logic can be implemented as pure code (no LLM), do it
- **Token budget**: Each agent run has a token budget (configurable per agent type)
- **Caching**: Identical inputs → cached output (hash-based)
- **Batching**: Process multiple fixtures in a single LLM call where possible
- **Rate limiting**: Respect provider rate limits via `@nvidia-api-pacer` or equivalent

### 7.3 LLM Router Abstraction

All LLM calls go through a router (Phase 5 implementation):

```typescript
interface LLMRouter {
  complete(params: {
    model: string;
    messages: ChatMessage[];
    temperature?: number;
    maxTokens?: number;
    responseFormat?: 'json' | 'text';
  }): Promise<{ content: string; usage: TokenUsage }>;
}
```

This enables:
- Provider failover
- Cost tracking per agent
- Token budget enforcement
- Response caching
- Local model fallback

---

## 8. Event-Driven Integration

Agents subscribe to domain events via the event system:

```typescript
// services/agents/src/events.ts
const agentEventHandlers = {
  LINEUP_CONFIRMED: async (event) => {
    // Trigger all Phase 5 agents for this fixture
    await runAgentTier(1, event.fixtureId);  // Quant, Forecaster
    await runAgentTier(2, event.fixtureId);  // Gaffer, Historian
    await runAgentTier(3, event.fixtureId);  // Contrarian
    await runAgentTier(4, event.fixtureId);  // The Terror
  },
  
  MATCH_FINISHED: async (event) => {
    // Re-run evaluation agents
    await runAgentTier(1, event.fixtureId);  // Quant (evaluation mode)
    await runAgentTier(2, event.fixtureId);  // Historian (post-match)
  },
};
```

### Domain Events

| Event | When | Agents |
|-------|------|--------|
| `FIXTURE_CREATED` | New fixture added | None |
| `LINEUP_CONFIRMED` | Lineups announced (pre-match) | All Phase 5 agents |
| `MATCH_STARTED` | Kickoff | None (live events handled separately) |
| `GOAL_SCORED` | Goal scored | None (live mode only) |
| `MATCH_FINISHED` | Full-time whistle | Quant, Historian (evaluation) |
| `MODEL_RECALCULATED` | Model scores updated | Quant, Forecaster |
| `POWER_INDEX_CHANGED` | Power Index updated | Quant |
| `TERROR_INDEX_CHANGED` | Terror Index updated | The Terror |
| `PLAYER_AVAILABILITY_CHANGED` | Injury/suspension update | Gaffer, Quant |

---

## 9. Testing Agents

### 9.1 Unit Tests

Each agent needs:

```typescript
// services/agents/tests/quant.test.ts
describe('QuantAgent', () => {
  it('should produce valid observations from features', async () => {
    const features = createTestFeatures();
    const agent = new QuantAgent(mockLLM, mockDB);
    const result = await agent.run({ fixtureId: 'test-fixture' });
    
    expect(result.observations.length).toBeGreaterThan(0);
    for (const obs of result.observations) {
      expect(obs.evidenceType).toMatch(/^(FACT|MODEL_OUTPUT|FORECAST|INFERENCE|OPINION|UNKNOWN)$/);
      expect(obs.confidence).toBeGreaterThanOrEqual(0);
      expect(obs.confidence).toBeLessThanOrEqual(1);
      expect(obs.supportingData.length).toBeGreaterThan(0);
    }
  });
  
  it('should never invent AgentDataPoint values', async () => {
    // Mock LLM returns hallucinated values
    const mockLLM = createMockLLM({ hallucinate: true });
    const agent = new QuantAgent(mockLLM, mockDB);
    const result = await agent.run({ fixtureId: 'test-fixture' });
    
    // All data points should reference real sources
    for (const obs of result.observations) {
      for (const dp of obs.supportingData) {
        expect(dp.source).toBeTruthy();
        expect(dp.source).not.toMatch(/^(LLM|generated|invented)/);
      }
    }
  });
});
```

### 9.2 Contract Tests

Every agent must pass the contract test:

```typescript
// services/agents/tests/contract.test.ts
describe('Agent Contract', () => {
  for (const agentType of ['quant', 'forecaster', 'gaffer', 'historian', 'contrarian', 'terror']) {
    describe(`${agentType} agent`, () => {
      it('should implement the Agent interface', () => {
        const agent = createAgent(agentType);
        expect(agent.type).toBe(agentType);
        expect(typeof agent.run).toBe('function');
        expect(typeof agent.validate).toBe('function');
      });
      
      it('should produce valid output schema', async () => {
        const agent = createAgent(agentType);
        const result = await agent.run(createTestContext());
        expect(() => validateAgentOutput(result)).not.toThrow();
      });
    });
  }
});
```

### 9.3 Integration Tests

Test the full pipeline: data → features → agents → verdict:

```typescript
describe('Agent Pipeline Integration', () => {
  it('should produce a TerrorVerdict for a complete fixture', async () => {
    // Ingest test fixture
    await ingestTestFixture('arsenal-vs-liverpool-2024');
    
    // Run all agents
    const verdict = await runAgentPipeline('arsenal-vs-liverpool-2024');
    
    expect(verdict).toBeDefined();
    expect(verdict.headline).toBeTruthy();
    expect(verdict.keyInsights.length).toBeGreaterThanOrEqual(3);
    expect(verdict.confidence).toBeGreaterThanOrEqual(0);
    expect(verdict.confidence).toBeLessThanOrEqual(1);
    expect(Object.keys(verdict.agentContributions).length).toBeGreaterThanOrEqual(4);
  });
});
```

---

## 10. Database Schema Reference

### Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `agent_runs` | Execution context | `agent_type`, `fixture_id`, `status`, `input_hash`, `token_usage` |
| `agent_observations` | Structured observations | `agent_run_id`, `evidence_type`, `confidence`, `supporting_data` (JSON) |
| `agent_claims` | Synthesized claims | `agent_run_id`, `claim_type`, `confidence`, `evidence` (JSON) |
| `model_versions` | Agent/model versioning | `name`, `version`, `type`, `config` (JSON), `metrics` (JSON) |

### Relationships

```
agent_runs (1) ──→ (N) agent_observations
agent_runs (1) ──→ (N) agent_claims
agent_observations (1) ──→ (N) agent_claims (via evidence array)
fixtures (1) ──→ (N) agent_runs
clubs (1) ──→ (N) agent_runs
```

---

## 11. Adding a New Agent

### Checklist

- [ ] Define `AgentType` in `packages/football-schema/src/types/agent.ts`
- [ ] Create agent module in `services/agents/src/agents/{name}/`
- [ ] Implement the `Agent` interface
- [ ] Define input schema (what data it needs)
- [ ] Define output schema (what observations/claims it produces)
- [ ] Write the system prompt
- [ ] Add to the agent registry
- [ ] Wire up event subscriptions
- [ ] Write unit tests
- [ ] Write contract tests
- [ ] Update this document (AGENTS.md)
- [ ] Update `docs/ROADMAP.md` if it's a new phase

### Agent Module Structure

```
services/agents/src/agents/{name}/
├── index.ts          # Agent implementation
├── prompt.ts         # System prompt template
├── schema.ts         # Input/output validation schemas
└── tests/
    └── {name}.test.ts
```

---

## 12. Cost Discipline

### Per-Agent Budget Limits (Configurable)

| Agent | Max Tokens/Run | Max Cost/Run | Model |
|-------|---------------|-------------|-------|
| Quant | 2,000 | $0.003 | gpt-4o-mini |
| Forecaster | 2,000 | $0.003 | gpt-4o-mini |
| Gaffer | 4,000 | $0.06 | gpt-4o |
| Historian | 3,000 | $0.005 | gpt-4o-mini |
| Contrarian | 2,500 | $0.004 | gpt-4o-mini |
| The Terror | 5,000 | $0.075 | gpt-4o |
| **Total** | **18,500** | **~$0.15** | |

### Cost Optimization Strategies

1. **Deterministic agents**: If no LLM is needed, don't use one
2. **Input pruning**: Only send relevant features, not entire database
3. **Caching**: Hash inputs, return cached output if unchanged
4. **Batching**: Process multiple fixtures per LLM call
5. **Model tiering**: Use cheaper models for simpler agents
6. **Token counting**: Track and enforce per-agent budgets

---

## 13. Observability

### What to Log

Every agent run produces:

```typescript
{
  agentType: 'quant',
  fixtureId: 'ft:statsbomb:3879635',
  status: 'completed',
  duration: 2340,           // ms
  inputHash: 'a1b2c3...',
  tokenUsage: {
    promptTokens: 1247,
    completionTokens: 523,
    totalTokens: 1770,
    costUsd: 0.0005,
    model: 'gpt-4o-mini',
    provider: 'openai'
  },
  observationsGenerated: 5,
  claimsGenerated: 2,
  averageConfidence: 0.78
}
```

### Metrics to Track

- Agent run count per type per day
- Average duration per agent type
- Token consumption per agent type
- Cost per agent type
- Average confidence per agent type
- Claim publication rate
- Agent disagreement rate (Contrarian flagging rate)

---

## 14. Security

### Access Control

- Agents READ from features, predictions, and historical data
- Agents WRITE to `agent_runs`, `agent_observations`, `agent_claims`
- Agents NEVER write to `fixtures`, `competitions`, or `clubs`
- Agents NEVER modify predictions or features
- The Terror NEVER auto-publishes — requires explicit publish action

### Secrets

- LLM API keys stored in environment variables
- Never logged, never in agent prompts, never in database
- Token usage logged without API key details

### Auto-Publish Guard

```typescript
// services/agents/src/publish.ts
if (!env.AUTO_PUBLISH_ENABLED) {
  log.warn('Auto-publish disabled — verdict queued for review');
  await queueForReview(verdict);
  return;
}
```

---

## 15. Future Agents (Phase 10+)

### Scout
- Scans external sources for transfer rumors, tactical innovations
- Feeds into Gaffer and Historian

### Newsroom
- Monitors news feeds for breaking stories
- Feeds into The Terror for timeliness assessment

### Verifier
- Cross-references claims against multiple sources
- Flags potential misinformation

### Kop
- Liverpool-specific intelligence agent
- Deep knowledge of squad, tactics, culture

### Broadcaster
- Generates natural language for FootballTerror Radio
- Converts structured intelligence to spoken commentary

### Publisher
- Manages publication pipeline
- Formats intelligence for different surfaces (Match Room, War Room, API)
