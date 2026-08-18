/**
 * Test fixtures from StatsBomb Open Data format.
 * These are realistic but small test datasets for unit testing.
 *
 * Source: Derived from StatsBomb's free open-data JSON format.
 * Not actual match data — synthetic test fixtures.
 */

import type {
  Competition,
  Season,
  Club,
  Player,
  Fixture,
  MatchEvent,
  TeamMatchStats,
  PlayerMatchStats,
  Lineup,
  LineupPlayer,
} from '@footballterror/football-schema';

export const TEST_COMPETITION: Competition = {
  id: 'ft:statsbomb:11',
  name: 'Premier League',
  country: 'England',
  countryId: 'GB-ENG',
  confederation: 'UEFA',
  level: 1,
  gender: 'male',
  active: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

export const TEST_SEASON: Season = {
  id: 'ft:statsbomb:42',
  competitionId: 'ft:statsbomb:11',
  name: '2023/24',
  startDate: new Date('2023-08-01'),
  endDate: new Date('2024-05-31'),
  active: true,
  createdAt: new Date('2024-01-01'),
};

export const TEST_CLUB_LIVERPOOL: Club = {
  id: 'ft:statsbomb:14',
  name: 'Liverpool',
  shortName: 'LIV',
  country: 'England',
  countryId: 'GB-ENG',
  city: 'Liverpool',
  founded: 1892,
  venue: 'Anfield',
  primaryColor: '#C8102E',
  active: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

export const TEST_CLUB_ARSENAL: Club = {
  id: 'ft:statsbomb:1',
  name: 'Arsenal',
  shortName: 'ARS',
  country: 'England',
  countryId: 'GB-ENG',
  city: 'London',
  founded: 1886,
  venue: 'Emirates Stadium',
  primaryColor: '#EF0107',
  active: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

export const TEST_FIXTURE: Fixture = {
  id: 'ft:statsbomb:3879635',
  competitionId: 'ft:statsbomb:11',
  seasonId: 'ft:statsbomb:42',
  matchday: 20,
  status: 'finished',
  utcKickoff: new Date('2024-01-07T16:30:00Z'),
  venue: 'Emirates Stadium',
  venueCity: 'London',
  referee: 'Michael Oliver',
  attendance: 60310,
  homeTeamId: 'ft:statsbomb:1',
  awayTeamId: 'ft:statsbomb:14',
  homeScore: 2,
  awayScore: 1,
  homeScoreHalfTime: 1,
  awayScoreHalfTime: 0,
  slug: 'arsenal-vs-liverpool-2024-01-07',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-07'),
};

export const TEST_PLAYER_SALAH: Player = {
  id: 'ft:statsbomb:8209',
  firstName: 'Mohamed',
  lastName: 'Salah',
  name: 'Mohamed Salah',
  nationality: 'Egypt',
  position: 'right_winger',
  active: true,
  currentClubId: 'ft:statsbomb:14',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

export const TEST_PLAYER_HAALAND: Player = {
  id: 'ft:statsbomb:8260',
  firstName: 'Erling',
  lastName: 'Haaland',
  name: 'Erling Haaland',
  nationality: 'Norway',
  position: 'centre_forward',
  active: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

// ─── StatsBomb Raw Format Fixtures ─────────────────────────────────────────────

export const SB_COMPETITIONS_RAW = [
  {
    competition_id: 11,
    country_name: 'England',
    competition_name: 'Premier League',
    competition_gender: 'male',
    competition_youth: false,
    competition_international: false,
    season_id: 42,
    season_name: '2023/24',
    match_updated: '2024-01-07',
    match_available: '2024-01-07',
  },
  {
    competition_id: 11,
    country_name: 'England',
    competition_name: 'Premier League',
    competition_gender: 'male',
    competition_youth: false,
    competition_international: false,
    season_id: 43,
    season_name: '2022/23',
    match_updated: '2023-05-28',
    match_available: '2023-05-28',
  },
  {
    competition_id: 43,
    country_name: 'Spain',
    competition_name: 'La Liga',
    competition_gender: 'male',
    competition_youth: false,
    competition_international: false,
    season_id: 146,
    season_name: '2020/21',
    match_updated: '2021-05-22',
    match_available: '2021-05-22',
  },
];

export const SB_MATCHES_RAW = [
  {
    match_id: 3879635,
    match_date: '2024-01-07',
    kick_off: '16:30:00',
    competition: { competition_id: 11, country_name: 'England', name: 'Premier League' },
    season: { season_id: 42, name: '2023/24' },
    match_week: 20,
    home_team: {
      home_team_id: 1,
      home_team_name: 'Arsenal',
      home_team_country: { name: 'England', id: 100 },
    },
    away_team: {
      away_team_id: 14,
      away_team_name: 'Liverpool',
      away_team_country: { name: 'England', id: 100 },
    },
    home_score: 2,
    away_score: 1,
    score: {
      halftime: { home: 1, away: 0 },
      fulltime: { home: 2, away: 1 },
    },
    match_status: 'available',
    last_updated: '2024-01-07',
    stadium: 'Emirates Stadium',
    attendance: 60310,
    referee: { name: 'Michael Oliver', id: 100 },
    home_team_managers: [{ name: 'Mikel Arteta', id: 100 }],
    away_team_managers: [{ name: 'Jürgen Klopp', id: 101 }],
  },
  {
    match_id: 3879636,
    match_date: '2024-01-13',
    kick_off: '15:00:00',
    competition: { competition_id: 11, country_name: 'England', name: 'Premier League' },
    season: { season_id: 42, name: '2023/24' },
    match_week: 21,
    home_team: {
      home_team_id: 14,
      home_team_name: 'Liverpool',
      home_team_country: { name: 'England', id: 100 },
    },
    away_team: {
      away_team_id: 33,
      away_team_name: 'Manchester United',
      away_team_country: { name: 'England', id: 100 },
    },
    home_score: 3,
    away_score: 0,
    score: {
      halftime: { home: 1, away: 0 },
      fulltime: { home: 3, away: 0 },
    },
    match_status: 'available',
    last_updated: '2024-01-13',
    stadium: 'Anfield',
    attendance: 53286,
    referee: { name: 'Paul Tierney', id: 102 },
  },
];

export const SB_LINEUPS_RAW = [
  {
    team_id: 1,
    team_name: 'Arsenal',
    lineup: [
      { player_id: 1001, player_name: 'David Raya', jersey_number: '22', position: { id: 1, name: 'Goalkeeper' }, start: { bench: false, time: 0 } },
      { player_id: 1002, player_name: 'Ben White', jersey_number: '4', position: { id: 2, name: 'Right Back' }, start: { bench: false, time: 0 } },
      { player_id: 1003, player_name: 'William Saliba', jersey_number: '12', position: { id: 3, name: 'Center Back' }, start: { bench: false, time: 0 } },
      { player_id: 1004, player_name: 'Gabriel Magalhães', jersey_number: '6', position: { id: 3, name: 'Center Back' }, start: { bench: false, time: 0 } },
      { player_id: 1005, player_name: 'Oleksandr Zinchenko', jersey_number: '35', position: { id: 4, name: 'Left Back' }, start: { bench: false, time: 0 } },
      { player_id: 1006, player_name: 'Declan Rice', jersey_number: '41', position: { id: 6, name: 'Defensive Midfield' }, start: { bench: false, time: 0 } },
      { player_id: 1007, player_name: 'Martin Ødegaard', jersey_number: '8', position: { id: 8, name: 'Attacking Midfield' }, start: { bench: false, time: 0 } },
      { player_id: 1008, player_name: 'Kai Havertz', jersey_number: '29', position: { id: 12, name: 'Center Forward' }, start: { bench: false, time: 0 } },
      { player_id: 1009, player_name: 'Bukayo Saka', jersey_number: '7', position: { id: 11, name: 'Right Wing' }, start: { bench: false, time: 0 } },
      { player_id: 1010, player_name: 'Gabriel Jesus', jersey_number: '9', position: { id: 12, name: 'Center Forward' }, start: { bench: false, time: 0 } },
      { player_id: 1011, player_name: 'Gabriel Martinelli', jersey_number: '11', position: { id: 10, name: 'Left Wing' }, start: { bench: false, time: 0 } },
    ],
  },
  {
    team_id: 14,
    team_name: 'Liverpool',
    lineup: [
      { player_id: 8200, player_name: 'Alisson Becker', jersey_number: '1', position: { id: 1, name: 'Goalkeeper' }, start: { bench: false, time: 0 } },
      { player_id: 8201, player_name: 'Trent Alexander-Arnold', jersey_number: '66', position: { id: 2, name: 'Right Back' }, start: { bench: false, time: 0 } },
      { player_id: 8202, player_name: 'Joël Matip', jersey_number: '32', position: { id: 3, name: 'Center Back' }, start: { bench: false, time: 0 } },
      { player_id: 8203, player_name: 'Virgil van Dijk', jersey_number: '4', position: { id: 3, name: 'Center Back' }, start: { bench: false, time: 0 } },
      { player_id: 8204, player_name: 'Andy Robertson', jersey_number: '26', position: { id: 4, name: 'Left Back' }, start: { bench: false, time: 0 } },
      { player_id: 8205, player_name: 'Alexis Mac Allister', jersey_number: '10', position: { id: 6, name: 'Defensive Midfield' }, start: { bench: false, time: 0 } },
      { player_id: 8206, player_name: 'Szoboszlai', jersey_number: '17', position: { id: 8, name: 'Center Midfield' }, start: { bench: false, time: 0 } },
      { player_id: 8207, player_name: 'Dominik Szoboszlai', jersey_number: '18', position: { id: 8, name: 'Attacking Midfield' }, start: { bench: false, time: 0 } },
      { player_id: 8208, player_name: 'Diogo Jota', jersey_number: '20', position: { id: 12, name: 'Center Forward' }, start: { bench: false, time: 0 } },
      { player_id: 8209, player_name: 'Mohamed Salah', jersey_number: '11', position: { id: 11, name: 'Right Wing' }, start: { bench: false, time: 0 } },
      { player_id: 8210, player_name: 'Luis Díaz', jersey_number: '7', position: { id: 10, name: 'Left Wing' }, start: { bench: false, time: 0 } },
    ],
  },
];

export const SB_EVENTS_RAW = [
  {
    id: 10001, index: 1, period: 1, timestamp: '00:00:00', minute: 0, second: 0,
    team: { id: 1, name: 'Arsenal' },
    player: { id: 1001, name: 'David Raya' },
    position: { id: 1, name: 'Goalkeeper' },
    location: [50.0, 50.0],
    type: { id: 1, name: 'Pass' },
    pass: {
      length: 40.0, angle: 0.5,
      end_location: [60.0, 30.0],
      body_part: { id: 38, name: 'Right Foot' },
      type: { id: 65, name: 'Kick Off' },
      outcome: { id: 9, name: 'Complete' },
    },
  },
  {
    id: 10002, index: 2, period: 1, timestamp: '00:00:05', minute: 0, second: 5,
    team: { id: 14, name: 'Liverpool' },
    player: { id: 8209, name: 'Mohamed Salah' },
    position: { id: 11, name: 'Right Wing' },
    location: [70.0, 30.0],
    type: { id: 2, name: 'Pressure' },
    pressure: {},
  },
  {
    id: 10003, index: 3, period: 1, timestamp: '00:12:00', minute: 12, second: 0,
    team: { id: 1, name: 'Arsenal' },
    player: { id: 1009, name: 'Bukayo Saka' },
    position: { id: 11, name: 'Right Wing' },
    location: [82.0, 35.0],
    type: { id: 14, name: 'Shot' },
    shot: {
      end_location: [100.0, 45.0],
      body_part: { id: 38, name: 'Right Foot' },
      type: { id: 87, name: 'Open Play' },
      outcome: { id: 97, name: 'Goal' },
      statsbomb_xg: 0.35,
    },
  },
  {
    id: 10004, index: 4, period: 1, timestamp: '00:35:00', minute: 35, second: 0,
    team: { id: 14, name: 'Liverpool' },
    player: { id: 8209, name: 'Mohamed Salah' },
    position: { id: 11, name: 'Right Wing' },
    location: [88.0, 25.0],
    type: { id: 14, name: 'Shot' },
    shot: {
      end_location: [100.0, 40.0],
      body_part: { id: 38, name: 'Right Foot' },
      type: { id: 87, name: 'Open Play' },
      outcome: { id: 97, name: 'Goal' },
      statsbomb_xg: 0.45,
    },
  },
  {
    id: 10005, index: 5, period: 1, timestamp: '00:40:00', minute: 40, second: 0,
    team: { id: 1, name: 'Arsenal' },
    player: { id: 1009, name: 'Bukayo Saka' },
    position: { id: 11, name: 'Right Wing' },
    location: [90.0, 20.0],
    type: { id: 14, name: 'Shot' },
    shot: {
      end_location: [110.0, 30.0],
      body_part: { id: 38, name: 'Right Foot' },
      type: { id: 87, name: 'Open Play' },
      outcome: { id: 97, name: 'Goal' },
      statsbomb_xg: 0.55,
    },
  },
  {
    id: 10006, index: 6, period: 1, timestamp: '00:43:00', minute: 43, second: 0,
    team: { id: 14, name: 'Liverpool' },
    player: { id: 8209, name: 'Mohamed Salah' },
    position: { id: 11, name: 'Right Wing' },
    location: [85.0, 40.0],
    type: { id: 14, name: 'Shot' },
    shot: {
      end_location: [105.0, 50.0],
      body_part: { id: 38, name: 'Right Foot' },
      type: { id: 87, name: 'Open Play' },
      outcome: { id: 100, name: 'Saved' },
      statsbomb_xg: 0.20,
    },
  },
];
