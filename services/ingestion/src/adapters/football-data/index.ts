/**
 * Football-Data.org Adapter
 *
 * Free tier: 10 requests/min, delayed scores (no live)
 * Covers: Premier League, La Liga, Bundesliga, Serie A, Ligue 1, Champions League
 * API: https://api.football-data.org/v4/
 */

import type { FootballDataAdapter, ProviderInfo, AdapterRawResult, MatchDetail } from "../types.js";
import type { Competition, Season, Club, Player, Fixture, MatchEvent, TeamMatchStats, PlayerMatchStats, Lineup, LineupPlayer, Provenance } from "@footballterror/football-schema";

const FD_COMPETITIONS: Record<number, { name: string; country: string; confederation: string }> = {
  PL: { name: "Premier League", country: "England", confederation: "UEFA" },
  BL1: { name: "Bundesliga", country: "Germany", confederation: "UEFA" },
  SA: { name: "Serie A", country: "Italy", confederation: "UEFA" },
  PD: { name: "La Liga", country: "Spain", confederation: "UEFA" },
  FL1: { name: "Ligue 1", country: "France", confederation: "UEFA" },
  CL: { name: "Champions League", country: "Europe", confederation: "UEFA" },
};

function makeProvenance(id: string | number, now: Date): Provenance {
  return { provider: "football-data", providerId: String(id), retrievedAt: now, normalizedVersion: "0.1.0", ingestionVersion: "0.1.0" };
}

export class FootballDataAdapter implements FootballDataAdapter {
  readonly info: ProviderInfo = { id: "football-data", name: "Football-Data.org", version: "v4", supportedCompetitions: [], requiresAuth: true, rateLimit: { requests: 10, windowMs: 60_000 } };

  private apiKey: string;
  private baseUrl: string;
  private lastRequest = 0;

  constructor(apiKey: string, baseUrl = "https://api.football-data.org/v4") {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  private async fetch<T>(path: string): Promise<T> {
    // Rate limit: 10 req/min
    const now = Date.now();
    const elapsed = now - this.lastRequest;
    if (elapsed < 6_000) await new Promise(r => setTimeout(r, 6_000 - elapsed));

    const resp = await fetch(`${this.baseUrl}${path}`, { headers: { "X-Auth-Token": this.apiKey } });
    this.lastRequest = Date.now();
    if (!resp.ok) throw new Error(`Football-Data API error: ${resp.status} ${resp.statusText}`);
    return resp.json() as Promise<T>;
  }

  async listCompetitions(): Promise<AdapterRawResult<Competition>[]> {
    const data = await this.fetch<any>("/competitions");
    const now = new Date();
    return (data.competitions ?? [])
      .filter((c: any) => c.code && FD_COMPETITIONS[c.code as keyof typeof FD_COMPETITIONS])
      .map((c: any) => {
        const info = FD_COMPETITIONS[c.code as keyof typeof FD_COMPETITIONS];
        return {
          data: { id: `ft:fd:${c.code}`, name: info.name, country: info.country, countryId: info.country.slice(0, 2).toUpperCase(), confederation: info.confederation, level: 1, gender: "male" as const, active: true, createdAt: now, updatedAt: now },
          provenance: makeProvenance(c.code, now),
        };
      });
  }

  async listSeasons(_providerCompetitionId: string): Promise<AdapterRawResult<Season>[]> {
    // Football-Data current season is implicit — we fetch the current competition
    const code = _providerCompetitionId.replace("ft:fd:", "");
    const data = await this.fetch<any>(`/competitions/${code}`);
    const now = new Date();
    const s = data.currentSeason;
    if (!s) return [];
    return [{ data: { id: `ft:fd:${code}-${s.id}`, competitionId: `ft:fd:${code}`, name: `${s.startDate?.slice(0, 4)}/${s.endDate?.slice(2, 4) ?? "?"}`, startDate: new Date(s.startDate), endDate: new Date(s.endDate), active: true, createdAt: now }, provenance: makeProvenance(s.id, now) }];
  }

  async listClubs(providerCompetitionId: string, _providerSeasonId?: string): Promise<AdapterRawResult<Club>[]> {
    const code = providerCompetitionId.replace("ft:fd:", "");
    const data = await this.fetch<any>(`/competitions/${code}/teams`);
    const now = new Date();
    return (data.teams ?? []).map((t: any) => ({
      data: { id: `ft:fd:${t.id}`, name: t.name, shortName: t.tla, country: t.area?.name ?? "", countryId: t.area?.code ?? "", venue: t.venue, crestUrl: t.crest, active: true, createdAt: now, updatedAt: now },
      provenance: makeProvenance(t.id, now),
    }));
  }

  async listPlayers(): Promise<AdapterRawResult<Player>[]> { return []; }

  async listFixtures(providerCompetitionId: string, _providerSeasonId?: string): Promise<AdapterRawResult<Fixture>[]> {
    const code = providerCompetitionId.replace("ft:fd:", "");
    const data = await this.fetch<any>(`/competitions/${code}/matches?status=FINISHED`);
    const now = new Date();
    return (data.matches ?? []).map((m: any) => ({
      data: {
        id: `ft:fd:${m.id}`, competitionId: `ft:fd:${code}`, seasonId: `ft:fd:${code}-current`,
        matchday: m.matchday, stage: m.stage, status: "finished",
        utcKickoff: new Date(m.utcDate), venue: m.venue, referee: m.referees?.[0]?.name,
        homeTeamId: `ft:fd:${m.homeTeam.id}`, awayTeamId: `ft:fd:${m.awayTeam.id}`,
        homeScore: m.score?.fullTime?.home, awayScore: m.score?.fullTime?.away,
        homeScoreHalfTime: m.score?.halfTime?.home, awayScoreHalfTime: m.score?.halfTime?.away,
        slug: `${m.homeTeam.name.toLowerCase().replace(/\s+/g, "-")}-vs-${m.awayTeam.name.toLowerCase().replace(/\s+/g, "-")}-${m.utcDate?.slice(0, 10)}`,
        createdAt: now, updatedAt: now,
      },
      provenance: makeProvenance(m.id, now),
    }));
  }

  async getMatchDetail(providerFixtureId: string): Promise<MatchDetail | null> { return null; }
  async getLineups(): Promise<AdapterRawResult<{ lineup: Lineup; players: LineupPlayer[] }>[]> { return []; }
  async getTeamStats(): Promise<AdapterRawResult<TeamMatchStats>[]> { return []; }
  async getPlayerStats(): Promise<AdapterRawResult<PlayerMatchStats>[]> { return []; }
  async getMatchEvents(): Promise<AdapterRawResult<MatchEvent>[]> { return []; }
}
