import { SQUAD_POOL, DRAFT_STARS, MARKET_POOL } from "../../PlayersPool";

export const clubLogos = {
  "Real Madrid": "/clubs/realmadrid.png",
  Barcelona: "/clubs/barcelona.png",
  "Atletico de Madrid": "/clubs/atlmadrid.png",
  "Athletic Club": "/clubs/athletic.png",
  Arsenal: "/clubs/arsenal.png",
  Villarreal: "/clubs/villarreal.png",
  "Vancouver Whitecaps": "/clubs/vancouver.png",
  Tottenham: "/clubs/tottenham.png",
  Sunderland: "/clubs/sunderland.png",
  "Sporting CP": "/clubs/sporting.png",
  Sassuolo: "/clubs/sassuolo.png",
  Roma: "/clubs/roma.png",
  "Real Sociedad": "/clubs/realsociedad.png",
  "RB Leipzig": "/clubs/rbleipzig.png",
  "Rayo Vallecano": "/clubs/rayovallecano.png",
  "RC Lens": "/clubs/racinglens.png",
  PSV: "/clubs/psv.png",
  PSG: "/clubs/psg.png",
  Porto: "/clubs/porto.png",
  "Olympique Lyonnais": "/clubs/olympiquelyon.png",
  "Olympique Marseille": "/clubs/olympiquemarsella.png",
  "Nottingham Forest": "/clubs/nottingham_forest.png",
  "Newcastle United": "/clubs/newcastle.png",
  Napoli: "/clubs/napoli.png",
  "AS Monaco": "/clubs/monaco.png",
  "AC Milan": "/clubs/milan.png",
  "Manchester United": "/clubs/manchesterunited.png",
  "Manchester City": "/clubs/manchestercity.png",
  "LA FC": "/clubs/losangeles.png",
  Liverpool: "/clubs/liverpool.png",
  Lazio: "/clubs/lazio.png",
  Juventus: "/clubs/juventus.png",
  "Inter Miami": "/clubs/intermiami.png",
  "Inter Milan": "/clubs/inter.png",
  Galatasaray: "/clubs/galatasaray.png",
  Fiorentina: "/clubs/fiorentina.png",
  Fenerbahçe: "/clubs/fenerbahce.png",
  Everton: "/clubs/everton.png",
  "Eintracht Frankfurt": "/clubs/eintrachtfrankfurt.png",
  "Crystal Palace": "/clubs/crystalpalace.png",
  Como: "/clubs/como.png",
  Chelsea: "/clubs/chelsea.png",
  Celta: "/clubs/celta.png",
  Brighton: "/clubs/brighton.png",
  Brentford: "/clubs/brentford.png",
  "Borussia Dortmund": "/clubs/borussiadortmund.png",
  Bologna: "/clubs/bologna.png",
  "Real Betis": "/clubs/betis.png",
  Besiktas: "/clubs/besiktas.png",
  Benfica: "/clubs/benfica.png",
  "Bayern Munich": "/clubs/bayernmunchen.png",
  "Bayer Leverkusen": "/clubs/bayerleverkusen.png",
  Atalanta: "/clubs/atalanta.png",
  "Aston Villa": "/clubs/astonvilla.png",
  "Al Nassr": "/clubs/al_nassr.png",
  "Al Hilal": "/clubs/al_hilal.png",
  "Al Ahli": "/clubs/al_ahli_saudi.png",
  "Free Agent": "/clubs/free_agent.png",
  Getafe: "/clubs/getafe.png",
  Mallorca: "/clubs/mallorca.png",
  Lecce: "/clubs/lecce.png",
  "Al Qadsiah": "/clubs/al_qadsiah.png",
  "Al Shabab": "/clubs/al_shabab.png",
  "Al Khaleej": "/clubs/al_khaleej.png",
  Legend: "/clubs/legend.png",
  "Sporting Clube de Braga": "/clubs/braga.png",
  Hoffenheim: "/clubs/hoffenheim.png",
  Fulham: "/clubs/fulham.png",
  "Boca Juniors": "/clubs/boca.png",
  "Club Brugge": "/clubs/clubbrujas.png",
  "Al Ittihad": "/clubs/al_ittihad.png",
};

// ─── VIEWS ──────────────────────────────────────────────────────────────────
export const VIEWS = {
  LOGIN: "login",
  MY_LEAGUES: "my_leagues",
  HOME: "home",
  CREATE_LEAGUE: "create_league",
  JOIN_LEAGUE: "join_league",
  SETUP: "setup",
  WAITING: "waiting",
  DRAFT: "draft",
  TABLE: "table",
  FIXTURES: "fixtures",
  SQUADS: "squads",
  MARKET: "market",
  TRANSFERS: "transfers",
  STATS: "stats",
  TOURNAMENT: "tournament",
};
export function genLeagueCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no O/0/I/1 to avoid confusion
  let code = "";
  for (let i = 0; i < 6; i++)
    code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// ─── ECONOMY ─────────────────────────────────────────────────────────────────
export const BUDGET = 100;
export const MAX_SQUAD = 23;
export const PRIZE_WIN = 5,
  PRIZE_DRAW = 2,
  PRIZE_LOSS = 1;
export const PRIZE_GOAL_FOR = 0.3,
  PRIZE_GOAL_AGAINST = -0.2;
export const SEASON_PRIZE_TOPSCORER = 5,
  SEASON_PRIZE_TOPASSIST = 5,
  SEASON_PRIZE_MVP = 8,
  SEASON_PRIZE_ZAMORA = 5;
export const MARKET_VALUE_PER_GOAL = 0.5;
export const MARKET_VALUE_PER_ASSIST = 0.25;
export const MARKET_VALUE_PER_MVP = 1;
export const MARKET_VALUE_MAX_MULTIPLIER = 2; // tope = valor base * 2
export const TOURNAMENT_PRIZE_MONEY = 40;
export const PLAYER_PICK_MIN_OVERALL = 87,
  PLAYER_PICK_MAX_OVERALL = 89;
export const LEGEND_PRIZE_MAX_OVERALL = 89; // tournament prize: a legend rated 89 or below
export const LEGEND_MARKET_MIN_OVERALL = 89; // market purchase: a legend rated 89 or above
export const LEGEND_MARKET_PRICE = 100;
export const FINAL_RANKING_PRIZE_FIRST = 65,
  FINAL_RANKING_PRIZE_DECAY = 0.15; // 1st=65M, each next position -15% of the previous
export function finalRankingPrize(positionIdx) {
  // positionIdx: 0 = 1st place
  return (
    FINAL_RANKING_PRIZE_FIRST *
    Math.pow(1 - FINAL_RANKING_PRIZE_DECAY, positionIdx)
  );
}

export function playerValue(overall, pos) {
  const base = (() => {
    if (overall >= 91) return 85;
    if (overall >= 90) return 75;
    if (overall >= 89) return 70;
    if (overall >= 88) return 65;
    if (overall >= 87) return 55;
    if (overall >= 86) return 40;
    if (overall >= 85) return 25;
    if (overall >= 84) return 15;
    if (overall >= 83) return 12;
    return 10;
  })();
  if (pos === "POR") return Math.round(base * 0.4 * 10) / 10;
  else if (pos === "DFC" || pos === "LD" || pos === "LI" || pos === "MCD")
    return Math.round(base * 0.7 * 10) / 10;
  else return base;
}
export function clauseBase(overall, pos) {
  return playerValue(overall, pos);
}
export function calcMarketValue(player) {
  const base = playerValue(player.overall, player.pos);
  const bonus =
    (player.goals || 0) * MARKET_VALUE_PER_GOAL +
    (player.assists || 0) * MARKET_VALUE_PER_ASSIST +
    (player.mvps || 0) * MARKET_VALUE_PER_MVP;
  return Math.min(
    Math.round((base + bonus) * 10) / 10,
    base * MARKET_VALUE_MAX_MULTIPLIER,
  );
}

export function isNightClauseLock() {
  const now = new Date();
  const hour = now.getHours(); // local hour
  return hour >= 19 || hour < 4;
}

export function isClauseLocked(player, teamLastMatchAt) {
  if (isNightClauseLock()) return true;
  if (!player.joinedAt) return false;

  const FOUR_DAYS_MS = 4 * 24 * 60 * 60 * 1000;
  if (Date.now() - player.joinedAt >= FOUR_DAYS_MS) return false;
  if (teamLastMatchAt && player.joinedAt <= teamLastMatchAt) return false;
  return true;
}
export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
// ─── Knockout tournament bracket generation ─────────────────────────────────
// Builds a single-elimination bracket from a list of team names. If the
// count isn't a power of 2, the smallest power of 2 >= count is used as the
// bracket size, and the extra slots become random byes (auto-advance) in
// round 1 — so every round after that is always a clean power of 2.
export function nextPowerOf2(n) {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}
export function generateBracket(teamNames) {
  const bracketSize = nextPowerOf2(teamNames.length);
  const byeCount = bracketSize - teamNames.length;
  const shuffled = shuffle(teamNames);
  // First `byeCount` teams (after shuffling) get a bye and advance immediately,
  // each paired with an empty slot in their own round-1 match. The rest play
  // each other normally — this guarantees no match ever has two empty slots.
  const byeTeams = shuffled.slice(0, byeCount);
  const playingTeams = shuffled.slice(byeCount);

  const round1 = [];
  let matchIdx = 0;
  for (const t of byeTeams) {
    round1.push({
      id: `r0_m${matchIdx}`,
      round: 0,
      matchIndex: matchIdx,
      home: t,
      away: null,
      homeGoals: "",
      awayGoals: "",
      played: false,
      scorers: [],
      assists: [],
      mvp: null,
      winner: t,
    });
    matchIdx++;
  }
  for (let i = 0; i < playingTeams.length; i += 2) {
    round1.push({
      id: `r0_m${matchIdx}`,
      round: 0,
      matchIndex: matchIdx,
      home: playingTeams[i],
      away: playingTeams[i + 1],
      homeGoals: "",
      awayGoals: "",
      played: false,
      scorers: [],
      assists: [],
      mvp: null,
      winner: null,
    });
    matchIdx++;
  }
  // Shuffle the match order within round 1 (cosmetic — doesn't change pairings)
  // while keeping matchIndex consistent with array position, since later rounds
  // depend on matchIndex to know which next-round slot a winner feeds into.
  round1.forEach((m, i) => {
    m.matchIndex = i;
    m.id = `r0_m${i}`;
  });

  const rounds = [round1];
  let prevRoundMatches = round1.length;
  let roundIdx = 1;
  while (prevRoundMatches > 1) {
    const matches = [];
    for (let i = 0; i < prevRoundMatches / 2; i++) {
      matches.push({
        id: `r${roundIdx}_m${i}`,
        round: roundIdx,
        matchIndex: i,
        home: null,
        away: null,
        homeGoals: "",
        awayGoals: "",
        played: false,
        scorers: [],
        assists: [],
        mvp: null,
        winner: null,
      });
    }
    rounds.push(matches);
    prevRoundMatches = matches.length;
    roundIdx++;
  }
  return rounds;
}
// After a match result is saved, propagate the winner into the next round's
// matching slot (home if this match's index is even, away if odd).
export function propagateBracketWinners(rounds) {
  const newRounds = rounds.map((r) => r.map((m) => ({ ...m })));
  for (let ri = 0; ri < newRounds.length - 1; ri++) {
    const round = newRounds[ri];
    const nextRound = newRounds[ri + 1];
    for (const m of round) {
      if (!m.winner) continue;
      const nextMatch = nextRound[Math.floor(m.matchIndex / 2)];
      if (!nextMatch) continue;
      if (m.matchIndex % 2 === 0) nextMatch.home = m.winner;
      else nextMatch.away = m.winner;
    }
  }
  // Auto-resolve any new bye situations created by propagation (e.g. both
  // slots of a match end up being the same already-decided bye chain).
  for (const round of newRounds) {
    for (const m of round) {
      if (
        !m.played &&
        !m.winner &&
        (m.home === null || m.away === null) &&
        (m.home || m.away)
      ) {
        m.winner = m.home || m.away;
      }
    }
  }
  return newRounds;
}
// Position groups for fallback when exact position is exhausted
export const POS_GROUP = {
  POR: ["POR"],
  DFC: ["DFC"],
  LD: ["LD", "DFC"],
  LI: ["LI", "DFC"],
  MCD: ["MCD", "MC"],
  MC: ["MC", "MCD"],
  MCO: ["MCO", "MC"],
  ED: ["ED", "EI"],
  EI: ["EI", "ED"],
  DC: ["DC"],
};
// Cada formación define slots con posición visual en el campo (0-100, 0=arriba/portería rival, 100=abajo/tu portería)
export const FORMATIONS = {
  "4-3-3": [
    { id: "GK", x: 50, y: 92, label: "POR" },
    { id: "LB", x: 15, y: 72, label: "LI" },
    { id: "CB1", x: 38, y: 78, label: "DFC" },
    { id: "CB2", x: 62, y: 78, label: "DFC" },
    { id: "RB", x: 85, y: 72, label: "LD" },
    { id: "CM1", x: 30, y: 52, label: "MC" },
    { id: "CM2", x: 50, y: 46, label: "MC" },
    { id: "CM3", x: 70, y: 52, label: "MC" },
    { id: "LW", x: 18, y: 20, label: "EI" },
    { id: "ST", x: 50, y: 14, label: "DC" },
    { id: "RW", x: 82, y: 20, label: "ED" },
  ],
  "4-4-2": [
    { id: "GK", x: 50, y: 92, label: "POR" },
    { id: "LB", x: 15, y: 72, label: "LI" },
    { id: "CB1", x: 38, y: 78, label: "DFC" },
    { id: "CB2", x: 62, y: 78, label: "DFC" },
    { id: "RB", x: 85, y: 72, label: "LD" },
    { id: "LM", x: 15, y: 46, label: "MI" },
    { id: "CM1", x: 38, y: 50, label: "MC" },
    { id: "CM2", x: 62, y: 50, label: "MC" },
    { id: "RM", x: 85, y: 46, label: "MD" },
    { id: "ST1", x: 38, y: 16, label: "DC" },
    { id: "ST2", x: 62, y: 16, label: "DC" },
  ],
  "3-5-2": [
    { id: "GK", x: 50, y: 92, label: "POR" },
    { id: "CB1", x: 25, y: 76, label: "DFC" },
    { id: "CB2", x: 50, y: 80, label: "DFC" },
    { id: "CB3", x: 75, y: 76, label: "DFC" },
    { id: "LM", x: 10, y: 48, label: "MI" },
    { id: "CM1", x: 34, y: 54, label: "MC" },
    { id: "CM2", x: 50, y: 48, label: "MC" },
    { id: "CM3", x: 66, y: 54, label: "MC" },
    { id: "RM", x: 90, y: 48, label: "MD" },
    { id: "ST1", x: 38, y: 16, label: "DC" },
    { id: "ST2", x: 62, y: 16, label: "DC" },
  ],
  "4-2-3-1": [
    { id: "GK", x: 50, y: 92, label: "POR" },
    { id: "LB", x: 15, y: 72, label: "LI" },
    { id: "CB1", x: 38, y: 78, label: "DFC" },
    { id: "CB2", x: 62, y: 78, label: "DFC" },
    { id: "RB", x: 85, y: 72, label: "LD" },
    { id: "CDM1", x: 38, y: 58, label: "MCD" },
    { id: "CDM2", x: 62, y: 58, label: "MCD" },
    { id: "LW", x: 18, y: 34, label: "MI" },
    { id: "CAM", x: 50, y: 30, label: "MCO" },
    { id: "RW", x: 82, y: 34, label: "MD" },
    { id: "ST", x: 50, y: 12, label: "DC" },
  ],
  "4-1-2-1-2": [
    { id: "GK", x: 50, y: 92, label: "POR" },
    { id: "LB", x: 15, y: 72, label: "LI" },
    { id: "CB1", x: 38, y: 78, label: "DFC" },
    { id: "CB2", x: 62, y: 78, label: "DFC" },
    { id: "RB", x: 85, y: 72, label: "LD" },
    { id: "CDM", x: 50, y: 60, label: "MCD" },
    { id: "RW", x: 82, y: 40, label: "MD" },
    { id: "LW", x: 18, y: 40, label: "MI" },
    { id: "CAM", x: 50, y: 30, label: "MCO" },
    { id: "ST1", x: 38, y: 16, label: "DC" },
    { id: "ST2", x: 62, y: 16, label: "DC" },
  ],
  "3-4-3": [
    { id: "GK", x: 50, y: 92, label: "POR" },
    { id: "CB1", x: 25, y: 76, label: "DFC" },
    { id: "CB2", x: 50, y: 80, label: "DFC" },
    { id: "CB3", x: 75, y: 76, label: "DFC" },
    { id: "LM", x: 12, y: 50, label: "MI" },
    { id: "CM1", x: 38, y: 52, label: "MC" },
    { id: "CM2", x: 62, y: 52, label: "MC" },
    { id: "RM", x: 88, y: 50, label: "MD" },
    { id: "LW", x: 18, y: 18, label: "EI" },
    { id: "ST", x: 50, y: 12, label: "DC" },
    { id: "RW", x: 82, y: 18, label: "ED" },
  ],
};
export const FORMATION_NAMES = Object.keys(FORMATIONS);
export function findPlayerInTeam(team, playerId) {
  return allPlayersOf(team).find((p) => p.id === playerId) || null;
}
export function generateSquad(idx, usedStars, usedNames) {
  const availableStars = DRAFT_STARS.filter((p) => !usedStars.includes(p.name));
  // Hard fallback: if every star is taken (more teams than stars), allow reuse with a unique suffix
  const star =
    availableStars.length > 0
      ? shuffle(availableStars)[0]
      : shuffle(DRAFT_STARS)[0];

  const REQUIRED = [
    "POR",
    "DFC",
    "DFC",
    "LD",
    "LI",
    "MCD",
    "MC",
    "MCO",
    "ED",
    "EI",
    "DC",
  ];
  const squad = [];
  const taken = [...usedNames, star.name];

  for (const reqPos of REQUIRED) {
    let picked = null;
    // Try exact + related positions in priority order, widening the search until someone is found
    for (const tryPos of POS_GROUP[reqPos]) {
      const cands = shuffle(
        SQUAD_POOL.filter((p) => !taken.includes(p.name) && p.pos === tryPos),
      );
      if (cands[0]) {
        picked = cands[0];
        break;
      }
    }
    // Final fallback: any unused player regardless of position, so the slot is never left empty
    if (!picked) {
      const anyCands = shuffle(
        SQUAD_POOL.filter((p) => !taken.includes(p.name)),
      );
      if (anyCands[0]) picked = anyCands[0];
    }
    // Absolute last resort: pool is fully exhausted across all teams — reuse a player (rare, only with many teams)
    if (!picked) picked = shuffle(SQUAD_POOL)[0];
    squad.push({
      ...picked,
      id: `p${squad.length}_${idx}`,
      goals: 0,
      assists: 0,
      mvps: 0,
      clauseValue: clauseBase(picked.overall, picked.pos),
    });
    taken.push(picked.name);
  }

  // 6 substitutes — same hard guarantee (1 star + 11 starters + 6 subs = 18 total)
  for (let i = 0; i < 6; i++) {
    let picked = shuffle(SQUAD_POOL.filter((p) => !taken.includes(p.name)))[0];
    if (!picked) picked = shuffle(SQUAD_POOL)[0]; // reuse if fully exhausted
    squad.push({
      ...picked,
      id: `sub${i}_${idx}`,
      goals: 0,
      assists: 0,
      mvps: 0,
      clauseValue: clauseBase(picked.overall, picked.pos),
    });
    taken.push(picked.name);
  }

  return {
    star: {
      ...star,
      id: `star_${idx}`,
      goals: 0,
      assists: 0,
      mvps: 0,
      clauseValue: clauseBase(star.overall, star.pos),
    },
    squad,
  };
}
export function generateMarket(day, excludeNames = []) {
  const available = MARKET_POOL.filter((p) => !excludeNames.includes(p.name));
  return shuffle(available)
    .slice(0, 15)
    .map((p, i) => ({
      ...p,
      marketId: `${day}_${i}_${p.name.replace(/\s/g, "_")}`,
      baseValue: playerValue(p.overall, p.pos),
    }));
}
export function fmtM(n) {
  return `${n.toFixed(1)}M€`;
}
export function posColor(pos) {
  if (pos === "POR") return "#e67e22";
  if (["DFC", "LD", "LI"].includes(pos)) return "#2980b9";
  if (["MC", "MCO", "MCD"].includes(pos)) return "#27ae60";
  if (["DC", "ED", "EI", "CF"].includes(pos)) return "#c0392b";
  return "#7f8c8d";
}
export function ratingColor(r) {
  if (r >= 90) return "#ff6b35";
  if (r >= 87) return "#f0c040";
  if (r >= 85) return "#27ae60";
  return "#5a9fd4";
}
export function initTeam(name) {
  return {
    name,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    gf: 0,
    ga: 0,
    points: 0,
    squad: null,
    budget: BUDGET,
    crest: null,
    lastMatchAt: null,
  };
}
export function getDayKey() {
  return new Date().toISOString().slice(0, 10);
}
export function nextMarketRefreshTime(now = new Date()) {
  const today330 = new Date(now);
  today330.setHours(3, 30, 0, 0);
  const today1530 = new Date(now);
  today1530.setHours(15, 30, 0, 0);
  const tomorrow330 = new Date(now);
  tomorrow330.setDate(tomorrow330.getDate() + 1);
  tomorrow330.setHours(3, 30, 0, 0);
  const tomorrow1530 = new Date(now);
  tomorrow1530.setDate(tomorrow1530.getDate() + 1);
  tomorrow1530.setHours(15, 30, 0, 0);
  return [today330, today1530, tomorrow330, tomorrow1530].find((c) => c >= now);
}
export function msUntilNextMarketRefresh() {
  return Math.max(0, nextMarketRefreshTime().getTime() - Date.now());
}
export function lastScheduledRefreshBefore(now = new Date()) {
  const times = [];
  for (let d = 0; d <= 1; d++) {
    const date = new Date(now);
    date.setDate(date.getDate() - d);
    const t330 = new Date(date);
    t330.setHours(3, 30, 0, 0);
    times.push(t330);
    const t1530 = new Date(date);
    t1530.setHours(15, 30, 0, 0);
    times.push(t1530);
  }
  const past = times.filter((t) => t <= now);
  return past.length ? past.reduce((a, b) => (a > b ? a : b)) : null;
}
export function fmtCountdown(ms) {
  if (ms <= 0) return "00:00:00";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}
export function allPlayersOf(team) {
  return [team?.squad?.star, ...(team?.squad?.squad || [])].filter(Boolean);
}
export const MIN_SQUAD_TO_PLAY = 16;
export const ITEMS_PER_PAGE = 5;
export function hasIncompleteSquad(team) {
  return allPlayersOf(team).length < MIN_SQUAD_TO_PLAY;
}
