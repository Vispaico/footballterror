export interface EloRating {
  teamId: string;
  rating: number;
  matchesPlayed: number;
}

export interface EloResult {
  homeExpectedScore: number;
  awayExpectedScore: number;
  homeRatingChange: number;
  awayRatingChange: number;
  homeNewRating: number;
  awayNewRating: number;
}

const DEFAULT_HOME_ADVANTAGE = 100;
const DEFAULT_K = 32;

export function expectedScore(ra: number, rb: number, homeAdvantage = DEFAULT_HOME_ADVANTAGE): number {
  return 1 / (1 + Math.pow(10, (rb - ra - homeAdvantage) / 400));
}

export function updateRatings(
  homeRating: number,
  awayRating: number,
  homeGoals: number,
  awayGoals: number,
  k = DEFAULT_K,
  homeAdvantage = DEFAULT_HOME_ADVANTAGE
): EloResult {
  const homeExpected = expectedScore(homeRating, awayRating, homeAdvantage);
  const awayExpected = 1 - homeExpected;

  const homeActual = homeGoals > awayGoals ? 1 : homeGoals === awayGoals ? 0.5 : 0;
  const awayActual = 1 - homeActual;

  const homeChange = k * (homeActual - homeExpected);
  const awayChange = k * (awayActual - awayExpected);

  return {
    homeExpectedScore: homeExpected,
    awayExpectedScore: awayExpected,
    homeRatingChange: homeChange,
    awayRatingChange: awayChange,
    homeNewRating: homeRating + homeChange,
    awayNewRating: awayRating + awayChange,
  };
}

// Pre-seeded Premier League 2015/2016 ratings (approximate from final table)
export const PL_2015_16_RATINGS: Record<string, number> = {
  "Leicester City": 1580,
  "Arsenal": 1570,
  "Tottenham Hotspur": 1565,
  "Manchester City": 1560,
  "Manchester United": 1550,
  "Southampton": 1540,
  "West Ham United": 1535,
  "Liverpool": 1530,
  "Stoke City": 1520,
  "Chelsea": 1515,
  "Everton": 1510,
  "Swansea City": 1505,
  "Watford": 1500,
  "West Bromwich Albion": 1495,
  "Crystal Palace": 1490,
  "Bournemouth": 1485,
  "Sunderland": 1480,
  "Newcastle United": 1475,
  "Norwich City": 1470,
  "Aston Villa": 1420,
};
