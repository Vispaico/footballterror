export interface ScoreProbability {
  homeGoals: number;
  awayGoals: number;
  probability: number;
}

export interface MatchPrediction {
  homeWin: number;
  draw: number;
  awayWin: number;
  expectedHomeGoals: number;
  expectedAwayGoals: number;
  scoreProbabilities: ScoreProbability[];
}

// Poisson probability mass function
export function poissonPmf(k: number, lambda: number): number {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);
}

function factorial(n: number): number {
  if (n <= 1) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
}

// Dixon-Coles correlation adjustment for low-scoring matches
export function dixonColesTau(x: number, y: number, lambda: number, mu: number, rho: number): number {
  if (x === 0 && y === 0) return 1 - lambda * mu * rho;
  if (x === 0 && y === 1) return lambda + mu * rho;
  if (x === 1 && y === 0) return mu + lambda * rho;
  if (x === 1 && y === 1) return lambda * mu * (1 - rho);
  return lambda * mu;
}

export function predictMatch(
  homeExpectedGoals: number,
  awayExpectedGoals: number,
  rho: number = -0.13
): MatchPrediction {
  const maxGoals = 7;
  const scoreProbs: ScoreProbability[] = [];
  let homeWin = 0, draw = 0, awayWin = 0;

  for (let hg = 0; hg <= maxGoals; hg++) {
    for (let ag = 0; ag <= maxGoals; ag++) {
      const pHome = poissonPmf(hg, homeExpectedGoals);
      const pAway = poissonPmf(ag, awayExpectedGoals);
      const tau = dixonColesTau(hg, ag, homeExpectedGoals, awayExpectedGoals, rho);
      const prob = pHome * pAway * tau / (pHome * pAway || 1);
      scoreProbs.push({ homeGoals: hg, awayGoals: ag, probability: prob });
      if (hg > ag) homeWin += prob;
      else if (hg === ag) draw += prob;
      else awayWin += prob;
    }
  }

  // Normalize
  const total = homeWin + draw + awayWin;
  homeWin /= total;
  draw /= total;
  awayWin /= total;

  return {
    homeWin: Math.round(homeWin * 1000) / 1000,
    draw: Math.round(draw * 1000) / 1000,
    awayWin: Math.round(awayWin * 1000) / 1000,
    expectedHomeGoals: Math.round(homeExpectedGoals * 100) / 100,
    expectedAwayGoals: Math.round(awayExpectedGoals * 100) / 100,
    scoreProbabilities: scoreProbs.sort((a, b) => b.probability - a.probability).slice(0, 10),
  };
}
