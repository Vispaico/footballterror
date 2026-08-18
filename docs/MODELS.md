# FootballTerror — Prediction Models

## Model Philosophy

Start with interpretable baselines before sophisticated ML. Every model must be auditable and calibrated.

## Phase 3 Models

### 1. Elo-Based Strength Model
- Standard Elo with home advantage adjustment
- Provides team strength ratings
- Updated after each match result
- Simple, interpretable, well-understood

### 2. Poisson / Dixon-Coles Goal Model
- Models goal-scoring as independent Poisson processes
- Dixon-Coles adjustment for correlation (low-scoring matches)
- Parameters: attack strength, defence strength, home advantage
- Produces: score grid, match outcome probabilities

### 3. ML Baseline
- Supervised classification (when sufficient training data exists)
- Features from the feature engine
- Gradient-boosted trees or logistic regression
- Must be benchmarked against baselines before adoption

### 4. Ensemble / Meta-Model
- Combines individual model predictions
- Only when individual models are benchmarked
- Weighted average based on calibration performance

## Evaluation Metrics

| Metric | Purpose |
|--------|---------|
| Log Loss | Probability quality |
| Brier Score | Mean squared error of probabilities |
| Calibration | Predicted vs actual frequency by bin |
| Accuracy | Correct outcome prediction |
| Goal Prediction Error | Mean absolute error of goal forecasts |

## Calibration

Models are evaluated in probability bins:
- 0-10%, 10-20%, ..., 90-100%
- A well-calibrated model has predicted ≈ actual frequency in each bin
- FootballTerror publishes calibration data publicly

## Prediction Immutability

Every prediction is a snapshot:
- Created with `modelVersion` and `featureVersion`
- Never overwritten
- New information → new prediction
- Full history displayed to users

## TimesFM Integration (Phase 4)

- Time-series forecasting for team/player metrics
- Compared against naive and statistical baselines
- Only adopted when it meaningfully improves predictions
- May become features in other models
