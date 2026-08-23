/**
 * Football-Charts.com Adapter
 *
 * Free tier: all leagues, current + previous season, 5000 req/day, 60/min.
 * Probabilities and results only — no odds, no live scores.
 * Auth: Authorization: Bearer <key>
 * Attribution required: "Data by football-charts.com"
 */

import type { FootballDataAdapter, ProviderInfo, AdapterRawResult } from "../types.js";
import type { Competition, Season, Club, Player, Fixture, MatchEvent, TeamMatchStats, PlayerMatchStats, Lineup, LineupPlayer, Provenance, MatchStatus } from "@footballterror/football-schema";

function makeProvenance(id: string | number, now: Date): Provenance {
  return {
    provider: "football-charts",
    providerId: String(id),
    retrievedAt: now,
    normalizedVersion: "0.1.0",
    ingestionVersion: "0.1.0",
    rawPayloadRef: "Data by football-charts.com",
  };
}

export class FootballChartsAdapter implements FootballDataAdapter {
  readonly info: ProviderInfo = {
    id: "football-charts",
    name: "Football-Charts.com",
    version: "v1",
    supportedCompetitions: [],
    requiresAuth: true,
    rateLimit: { requests: 60, windowMs: 60_000 }, // free tier: 60/min, 5000/day
  };

  private apiKey: string;
  private baseUrl: string;
  private requestTimes: number[] = [];

  constructor(apiKey: string, baseUrl = "https://footballcharts-backend.onrender.com/api/v1") {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  /** Rate limit: 60 requests/min sliding window */
  private async throttle(): Promise<void> {
    this.requestTimes = this.requestTimes.filter((t) => Date.now() - t < 60_000);
    if (this.requestTimes.length >= 60) {
      const wait = 60_000 - (Date.now() - this.requestTimes[0]!);
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    }
    this.requestTimes.push(Date.now());
  }

  private async fetch<T>(path: string): Promise<T> {
    await this.throttle();
    const resp = await fetch(`${this.baseUrl}${path}`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
    if (!resp.ok) throw new Error(`Football-Charts API error ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
    return resp.json() as Promise<T>;
  }

  async listCompetitions(): Promise<AdapterRawResult<Competition>[]> {
    const data = await this.fetch<any>("/leagues/");
    const now = new Date();
    return (data.leagues ?? []).map((l: any) => ({
      data: {
        id: `ft:fc:${l.code ?? l.id ?? l.name}`,
        name: l.name,
        country: l.country ?? "",
        countryId: (l.country ?? "").slice(0, 2).toUpperCase(),
        confederation: l.confederation ?? "UEFA",
        level: l.level ?? 1,
        gender: "male" as const,
        active: true,
        createdAt: now,
        updatedAt: now,
      },
      provenance: makeProvenance(l.code ?? l.id ?? l.name, now),
    }));
  }

  async listSeasons(providerCompetitionId: string): Promise<AdapterRawResult<Season>[]> {
    // Free tier covers current + previous season per league
    const league = providerCompetitionId.replace("ft:fc:", "");
    const now = new Date();
    const year = now.getUTCFullYear();
    const current = `${year}/${String(year + 1).slice(2)}`;
    const previous = `${year - 1}/${String(year).slice(2)}`;
    return [current, previous].map((name) => ({
      data: {
        id: `ft:fc:${league}:${name}`,
        competitionId: providerCompetitionId,
        name,
        startDate: new Date(`${name.split("/")[0]}-08-01`),
        endDate: new Date(`${Number(name.split("/")[0]) + 1}-07-01`),
        active: name === current,
        createdAt: now,
      },
      provenance: makeProvenance(`${league}:${name}`, now),
    }));
  }

  async listClubs(providerCompetitionId: string, providerSeasonId?: string): Promise<AdapterRawResult<Club>[]> {
    const league = providerCompetitionId.replace("ft:fc:", "");
    const season = providerSeasonId ? providerSeasonId.split(":").pop() : undefined;
    const q = season ? `?season=${encodeURIComponent(season)}` : "";
    const data = await this.fetch<any>(`/leagues/${league}/teams/${q}`);
    const now = new Date();
    return (data.teams ?? []).map((t: any) => ({
      data: {
        id: `ft:fc:${t.id ?? t.slug ?? t.name}`,
        name: t.name,
        shortName: t.short_name ?? t.abbr,
        country: "",
        countryId: "",
        venue: t.stadium ?? t.venue,
        crestUrl: t.crest ?? t.logo_url,
        active: true,
        createdAt: now,
        updatedAt: now,
      },
      provenance: makeProvenance(t.id ?? t.slug ?? t.name, now),
    }));
  }

  async listPlayers(): Promise<AdapterRawResult<Player>[]> {
    return []; // Football-Charts does not expose player-level data on the free tier
  }

  async listFixtures(providerCompetitionId: string, providerSeasonId?: string): Promise<AdapterRawResult<Fixture>[]> {
    const league = providerCompetitionId.replace("ft:fc:", "");
    const season = providerSeasonId ? providerSeasonId.split(":").pop() : undefined;
    const q = season ? `?season=${encodeURIComponent(season)}` : "";

    const [fixturesData, resultsData] = await Promise.all([
      this.fetch<any>(`/leagues/${league}/fixtures/${q}`).catch(() => null),
      this.fetch<any>(`/leagues/${league}/results/${q}`).catch(() => null),
    ]);

    const now = new Date();
    const out: AdapterRawResult<Fixture>[] = [];

    const mapOne = (m: any, status: MatchStatus): AdapterRawResult<Fixture> => ({
      data: {
        id: `ft:fc:${m.id ?? m.slug}`,
        competitionId: providerCompetitionId,
        seasonId: providerSeasonId ?? `ft:fc:${league}:current`,
        matchday: m.matchday ?? m.round,
        status,
        utcKickoff: new Date(m.kickoff ?? m.date ?? m.utc_date),
        venue: m.venue,
        homeTeamId: `ft:fc:${m.home_team?.id ?? m.home_team}`,
        awayTeamId: `ft:fc:${m.away_team?.id ?? m.away_team}`,
        homeScore: m.home_goals ?? m.score?.home ?? undefined,
        awayScore: m.away_goals ?? m.score?.away ?? undefined,
        slug: m.slug ?? String(m.id),
        createdAt: now,
        updatedAt: now,
      },
      provenance: makeProvenance(m.id ?? m.slug, now),
    });

    for (const m of fixturesData?.fixtures ?? fixturesData?.matches ?? []) {
      out.push(mapOne(m, "scheduled"));
    }
    for (const m of resultsData?.results ?? resultsData?.matches ?? []) {
      out.push(mapOne(m, "finished"));
    }
    return out;
  }

  /**
   * Win probabilities for an upcoming fixture (free-tier replacement for odds).
   * Returns the raw projection payload — downstream decides how to map it.
   */
  async getProjection(providerCompetitionId: string, season?: string): Promise<any> {
    const league = providerCompetitionId.replace("ft:fc:", "");
    const q = season ? `?season=${encodeURIComponent(season)}` : "";
    return this.fetch<any>(`/leagues/${league}/projection/${q}`);
  }

  async getLeagueTable(providerCompetitionId: string, season?: string): Promise<any> {
    const league = providerCompetitionId.replace("ft:fc:", "");
    const q = season ? `?season=${encodeURIComponent(season)}` : "";
    return this.fetch<any>(`/leagues/${league}/table/${q}`);
  }

  // Not available on Football-Charts free tier:
  async getMatchDetail(): Promise<any> { return null; }
  async getLineups(): Promise<AdapterRawResult<{ lineup: Lineup; players: LineupPlayer[] }>[]> { return []; }
  async getTeamStats(): Promise<AdapterRawResult<TeamMatchStats>[]> { return []; }
  async getPlayerStats(): Promise<AdapterRawResult<PlayerMatchStats>[]> { return []; }
  async getMatchEvents(): Promise<AdapterRawResult<MatchEvent>[]> { return []; }
}
