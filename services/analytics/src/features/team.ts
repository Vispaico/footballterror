import type { TeamFeature, RollingWindow } from "@footballterror/football-schema";
import { createId } from "../utils.js";

interface MatchEvent {
  type: { name: string };
  team?: { id: number };
  player?: { id: number };
  location?: number[];
  minute?: number;
  shot?: { outcome?: { name: string }; statsbomb_xg?: number; end_location?: number[] };
  pass?: { outcome?: { name: string }; end_location?: number[]; recipient?: { id: number } };
  carry?: { end_location?: number[] };
  foul_committed?: { card?: { name: string } };
  bad_behaviour?: { card?: { name: string } };
}

export function computeTeamFeatures(
  events: MatchEvent[],
  teamId: number,
  fixtureId: string,
  seasonId: string,
  homeAdvantage: boolean = false
): TeamFeature {
  const teamEvents = events.filter(e => e.team?.id === teamId);
  let goals = 0, xG = 0, shots = 0, shotsOnTarget = 0;
  let passes = 0, progressivePasses = 0, progressiveCarries = 0;
  let tackles = 0, interceptions = 0, blocks = 0, clearances = 0, pressures = 0;
  let fouls = 0, foulsSuffered = 0, yellowCards = 0, redCards = 0;

  for (const e of teamEvents) {
    switch (e.type.name) {
      case "Shot":
        shots++;
        if (e.shot?.statsbomb_xg != null) xG += e.shot.statsbomb_xg;
        if (e.shot?.outcome?.name === "Goal") goals++;
        if (e.shot?.outcome?.name === "Saved" || e.shot?.outcome?.name === "Wayward" || e.shot?.outcome?.name === "Off T") shotsOnTarget++;
        break;
      case "Pass":
        passes++;
        if (e.pass?.outcome?.name === "Complete" && e.pass.end_location && e.location && e.pass.end_location[0] - e.location[0] > 10) progressivePasses++;
        break;
      case "Carry":
        if (e.carry?.end_location && e.location && e.carry.end_location[0] - e.location[0] > 10) progressiveCarries++;
        break;
      case "Duel": tackles++; break;
      case "Pressure": pressures++; break;
      case "Interception": interceptions++; break;
      case "Block": blocks++; break;
      case "Clearance": clearances++; break;
      case "Foul Committed": fouls++; break;
      case "Foul Won": foulsSuffered++; break;
      case "Card":
        if (e.foul_committed?.card?.name === "Yellow Card" || e.bad_behaviour?.card?.name === "Yellow Card") yellowCards++;
        if (e.foul_committed?.card?.name === "Red Card" || e.bad_behaviour?.card?.name === "Red Card") redCards++;
        break;
    }
  }

  return {
  id: createId("tf", teamId, fixtureId),
  teamId: `ft:statsbomb:${teamId}`,
  fixtureId: `ft:statsbomb:${fixtureId}`,
  seasonId,
  computedAt: new Date(),
  featureVersion: "0.1.0",
  goals, goalsConceded: 0, xG, xGA: 0,
  shots, shotsConceded: 0, shotsOnTarget,
  possession: 50, fieldTilt: 50, ppda: 0,
  passes, passAccuracy: 0,
  progressivePasses, progressiveCarries, highTurnovers: 0,
  tackles, interceptions, blocks, clearances, pressures,
  fouls, foulsSuffered, yellowCards, redCards,
  corners: 0, freeKicks: 0, penaltiesAwarded: 0,
  boxEntries: 0,
  setPieceGoals: 0, setPieceConceded: 0, transitionGoals: 0,
  finishingPerformance: 0, goalkeepingPerformance: 0,
  opponentStrength: 50, homeAdvantage: homeAdvantage ? 1 : 0,
  restDays: 7, fixtureCongestion: 1, playerAvailabilityScore: 1,
  };
}
