# FootballTerror — Agent System

## Philosophy

Agents in FootballTerror are structured reasoning modules that receive evidence and produce claims. They never fabricate data — they interpret, contextualize, and challenge.

## Evidence Types

Every agent claim must be tagged with an evidence type:

| Type | Description |
|------|------------|
| FACT | Verified data from a trusted source |
| MODEL_OUTPUT | Numerical output from a deterministic model |
| FORECAST | Time-series prediction with uncertainty |
| INFERENCE | Logical deduction from evidence |
| OPINION | Subjective assessment (must be clearly labeled) |
| UNKNOWN | Insufficient evidence to make a claim |

## Agent Definitions

### Quant
- **Purpose**: Interprets statistical and model evidence
- **Inputs**: Features, predictions, power index, historical data
- **Outputs**: Statistical observations with confidence
- **Forbidden**: Making tactical claims without evidence

### Forecaster
- **Purpose**: Interprets time-series forecasts
- **Inputs**: Team/player forecasts, trend data
- **Outputs**: Forward-looking observations
- **Forbidden**: Claiming certainty about forecasts

### Gaffer
- **Purpose**: Provides tactical hypotheses grounded in evidence
- **Inputs**: Match events, team features, lineup data
- **Outputs**: Tactical observations and hypotheses
- **Forbidden**: Inventing tactical narratives without data

### Historian
- **Purpose**: Searches historical data for relevant precedents
- **Inputs**: Historical fixtures, results, events
- **Outputs**: Precedent-based observations
- **Forbidden**: Misrepresenting historical context

### Contrarian
- **Purpose**: Deliberately challenges high-confidence conclusions
- **Inputs**: Other agents' claims, contrary evidence
- **Outputs**: Counter-arguments, risk factors
- **Forbidden**: Being contrarian for its own sake — must cite evidence

### The Terror
- **Purpose**: Chief intelligence/editorial agent
- **Inputs**: All other agents' structured outputs
- **Outputs**: Synthesized verdict, key insights
- **Forbidden**: Inventing evidence — only synthesizes what agents provide

## Agent Output Schema

Every agent produces:
1. `observations`: Array of structured observations
2. `claims`: Array of synthesized claims
3. `confidence`: Overall confidence level
4. `evidenceType`: Classification of output type
5. `sourceReferences`: Provenance chain
6. `tokenUsage`: LLM consumption tracking

## Hallucination Defense

- Agents MUST distinguish fact from inference from opinion
- If evidence is insufficient, output UNKNOWN
- Every claim must reference supporting data points
- Contradictory evidence must be explicitly noted
- The Terror synthesizes but never invents
