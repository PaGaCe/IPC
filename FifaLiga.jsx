import { useState, useCallback, useEffect, useRef } from "react";
import { storage } from "./firebaseStorage";
import * as Flags from "country-flag-icons/react/3x2";
import logoImg from "./src/assets/logo.webp";
import {
  signInWithGoogle,
  signOutUser,
  onAuthChange,
  ensureUserProfile,
  addLeagueToProfile,
  removeLeagueFromProfile,
} from "./firebaseAuth";
import {
  SQUAD_POOL,
  DRAFT_STARS,
  MARKET_POOL,
  LEGEND_POOL,
} from "./PlayersPool";
import countries from "i18n-iso-countries";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  TouchSensor,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import en from "i18n-iso-countries/langs/en.json";

countries.registerLocale(en);

// ─── VIEWS ──────────────────────────────────────────────────────────────────
const VIEWS = {
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
function genLeagueCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no O/0/I/1 to avoid confusion
  let code = "";
  for (let i = 0; i < 6; i++)
    code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// ─── ECONOMY ─────────────────────────────────────────────────────────────────
const BUDGET = 100;
const MAX_SQUAD = 23;
const PRIZE_WIN = 5,
  PRIZE_DRAW = 2,
  PRIZE_LOSS = 1;
const PRIZE_GOAL_FOR = 0.3,
  PRIZE_GOAL_AGAINST = -0.2;
const SEASON_PRIZE_TOPSCORER = 5,
  SEASON_PRIZE_TOPASSIST = 5,
  SEASON_PRIZE_MVP = 8,
  SEASON_PRIZE_ZAMORA = 5;
const TOURNAMENT_PRIZE_MONEY = 40;
const PLAYER_PICK_MIN_OVERALL = 87,
  PLAYER_PICK_MAX_OVERALL = 89;
const LEGEND_PRIZE_MAX_OVERALL = 89; // tournament prize: a legend rated 89 or below
const LEGEND_MARKET_MIN_OVERALL = 89; // market purchase: a legend rated 89 or above
const LEGEND_MARKET_PRICE = 100;
const FINAL_RANKING_PRIZE_FIRST = 50,
  FINAL_RANKING_PRIZE_DECAY = 0.3; // 1st=50M, each next position -30% of the previous
function finalRankingPrize(positionIdx) {
  // positionIdx: 0 = 1st place
  return (
    FINAL_RANKING_PRIZE_FIRST *
    Math.pow(1 - FINAL_RANKING_PRIZE_DECAY, positionIdx)
  );
}

function playerValue(overall) {
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
}
function clauseBase(overall) {
  return playerValue(overall);
}
const CLAUSE_LOCK_HOURS = 24;

function isNightClauseLock() {
  const now = new Date();
  const hour = now.getHours(); // local hour
  return hour >= 18 || hour < 6;
}

function isClauseLocked(player) {
  // night general block
  if (isNightClauseLock()) return true;

  if (!player.joinedAt) return false; // original draft players are never locked
  const elapsedMs = Date.now() - player.joinedAt;
  return elapsedMs < CLAUSE_LOCK_HOURS * 60 * 60 * 1000;
}
function clauseLockRemainingMs(player) {
  if (!player.joinedAt) return 0;
  const elapsedMs = Date.now() - player.joinedAt;
  return Math.max(0, CLAUSE_LOCK_HOURS * 60 * 60 * 1000 - elapsedMs);
}
function shuffle(arr) {
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
function nextPowerOf2(n) {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}
function generateBracket(teamNames) {
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
function propagateBracketWinners(rounds) {
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
const POS_GROUP = {
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
const FORMATIONS = {
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
const FORMATION_NAMES = Object.keys(FORMATIONS);
function findPlayerInTeam(team, playerId) {
  return allPlayersOf(team).find((p) => p.id === playerId) || null;
}
function generateSquad(idx, usedStars, usedNames) {
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
      clauseValue: clauseBase(picked.overall),
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
      clauseValue: clauseBase(picked.overall),
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
      clauseValue: clauseBase(star.overall),
    },
    squad,
  };
}
function generateMarket(day, excludeNames = []) {
  const available = MARKET_POOL.filter((p) => !excludeNames.includes(p.name));
  return shuffle(available)
    .slice(0, 15)
    .map((p, i) => ({
      ...p,
      marketId: `${day}_${i}_${p.name.replace(/\s/g, "_")}`,
      baseValue: playerValue(p.overall),
    }));
}
function fmtM(n) {
  return `${n.toFixed(1)}M€`;
}
function posColor(pos) {
  if (pos === "POR") return "#e67e22";
  if (["DFC", "LD", "LI"].includes(pos)) return "#2980b9";
  if (["MC", "MCO", "MCD"].includes(pos)) return "#27ae60";
  if (["DC", "ED", "EI", "CF"].includes(pos)) return "#c0392b";
  return "#7f8c8d";
}
function ratingColor(r) {
  if (r >= 90) return "#ff6b35";
  if (r >= 87) return "#f0c040";
  if (r >= 85) return "#27ae60";
  return "#5a9fd4";
}
function initTeam(name) {
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
  };
}
function getDayKey() {
  return new Date().toISOString().slice(0, 10);
}
function msUntilNextMarketRefresh(resetAt) {
  if (resetAt) {
    return Math.max(0, resetAt + 24 * 60 * 60 * 1000 - Date.now());
  }
  const now = new Date();
  const nextMidnight = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
  );
  return nextMidnight.getTime() - Date.now();
}
function fmtCountdown(ms) {
  if (ms <= 0) return "00:00:00";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}
function allPlayersOf(team) {
  return [team?.squad?.star, ...(team?.squad?.squad || [])].filter(Boolean);
}
const MIN_SQUAD_TO_PLAY = 16;
const ITEMS_PER_PAGE = 5;
function hasIncompleteSquad(team) {
  return allPlayersOf(team).length < MIN_SQUAD_TO_PLAY;
}
// ─── APP ─────────────────────────────────────────────────────────────────────
export default function FifaLiga() {
  const [view, setView] = useState(VIEWS.LOGIN);

  // ── Authentication state ──
  const [authUser, setAuthUser] = useState(null); // Firebase user object | null
  const [userProfile, setUserProfile] = useState(null); // { displayName, email, leagues: [{code, teamName}] }
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState("");

  // Local-device state (NOT shared): which league am I in, am I the admin, which team is "mine"
  const [leagueCode, setLeagueCode] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [myTeamName, setMyTeamName] = useState(null);
  const [deviceLoaded, setDeviceLoaded] = useState(false);

  // Home/create/join form state
  const [leagueNameInput, setLeagueNameInput] = useState("");
  const [joinCodeInput, setJoinCodeInput] = useState("");
  const [newTeamNameInput, setNewTeamNameInput] = useState("");
  const [homeError, setHomeError] = useState("");

  const [teamInput, setTeamInput] = useState("");
  const [teams, setTeams] = useState([]);
  const [fixtures, setFixtures] = useState([]);
  const [started, setStarted] = useState(false);
  const [draftDone, setDraftDone] = useState(false);
  const [pendingResult, setPR] = useState(null);
  const [homeGoals, setHG] = useState("");
  const [awayGoals, setAG] = useState("");
  const [matchEvents, setMatchEvents] = useState({
    scorers: [],
    assists: [],
    mvp: null,
  });

  const [marketDay, setMarketDay] = useState(null);
  const [marketResetAt, setMarketResetAt] = useState(null);
  const [marketCountdownMs, setMarketCountdownMs] = useState(
    msUntilNextMarketRefresh(),
  );
  const [marketList, setMarketList] = useState([]);
  const [bids, setBids] = useState({});
  const [marketHistory, setMarketHistory] = useState([]);
  const [swapModal, setSwapModal] = useState(null);

  const [tournamentBracket, setTournamentBracket] = useState(null); // array of rounds, each an array of matches
  const [tournamentResultModal, setTournamentResultModal] = useState(null); // {round, matchIndex}
  const [tHomeGoals, setTHomeGoals] = useState("");
  const [tAwayGoals, setTAwayGoals] = useState("");

  // Tournament champion prize: { claimed: bool, type: "money"|"playerpick"|null,
  //   cards: [player,player,player] | null, revealed: [bool,bool,bool],
  //   selectedIdx: number|null }
  const [championPrize, setChampionPrize] = useState(null);
  const [playerPickSwapModal, setPlayerPickSwapModal] = useState(null); // {newPlayer} when squad is full
  const [legendBuyConfirm, setLegendBuyConfirm] = useState(null); // legend player pending purchase confirmation
  const [legendSwapModal, setLegendSwapModal] = useState(null); // {newPlayer} when squad is full after legend purchase

  const [offers, setOffers] = useState([]); // [{offerId, fromTeam, toTeam, player, amount, status, createdAt}]
  const [notifications, setNotifications] = useState([]); // [{id, type, text, createdAt, read}]
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(notifications.length / ITEMS_PER_PAGE);
  const visibleNotifications = notifications.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE,
  );
  const [clauseConfirm, setClauseConfirm] = useState(null);
  const [discardConfirm, setDiscardConfirm] = useState(null);
  const [clauseInvestInput, setClauseInvestInput] = useState({});
  const [offerModal, setOfferModal] = useState(null); // { teamName, player } being offered on
  const [offerAmountStr, setOfferAmountStr] = useState("");
  const [viewingTeam, setViewingTeam] = useState(null); // team being inspected read-only from TABLE
  const [squadTab, setSquadTab] = useState("lineup"); // "lineup" | "squad"
  const [lineupSlotModal, setLineupSlotModal] = useState(null); // {teamName, slotId} mientras eliges jugador para un slot

  // Bid modal (new simplified flow)
  const [bidModal, setBidModal] = useState(null); // { player } from market
  const [bidAmountStr, setBidAmountStr] = useState("");

  // Toast notifications (replace alert())
  const [toast, setToast] = useState(null); // { text, type }
  const showToast = (text, type = "error") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 2800);
  };

  // Team switcher sheet (bottom sheet for picking active team)
  const [storageLoaded, setStorageLoaded] = useState(false);

  // ── Storage key helpers ──
  const leagueKey = (code) => `league_${code}`;
  const deviceKey = "fifaLigaDevice"; // local, not shared: { leagueCode, isAdmin, myTeamName }

  // ── Step 0: listen for Firebase auth state (persists across visits) ──
  useEffect(() => {
    const unsubscribe = onAuthChange(async (user) => {
      setAuthUser(user);
      if (user) {
        const profile = await ensureUserProfile(user);
        setUserProfile(profile);
        // Land on the leagues selector if they have any saved leagues,
        // otherwise the regular create/join screen.
        setView(profile?.leagues?.length > 0 ? VIEWS.MY_LEAGUES : VIEWS.HOME);
      } else {
        setUserProfile(null);
        setView(VIEWS.LOGIN);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const link = document.createElement("link");
    link.href =
      "https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }, []);

  const handleGoogleSignIn = async () => {
    setAuthError("");
    try {
      await signInWithGoogle();
      // onAuthChange above will pick up the new user and redirect automatically.
    } catch (e) {
      setAuthError("No se pudo iniciar sesión con Google. Inténtalo de nuevo.");
    }
  };

  const handleSignOut = async () => {
    await signOutUser();
    setLeagueCode(null);
    setIsAdmin(false);
    setMyTeamName(null);
    setTeams([]);
    setFixtures([]);
    setStarted(false);
  };

  // ── Step 1: load local device info (which league am I in, am I admin) ──
  useEffect(() => {
    (async () => {
      try {
        const saved = await storage.get(deviceKey);
        if (saved) {
          const d = JSON.parse(saved.value);
          if (d.leagueCode) setLeagueCode(d.leagueCode);
          if (d.isAdmin) setIsAdmin(d.isAdmin);
          if (d.myTeamName) setMyTeamName(d.myTeamName);
        }
      } catch (e) {}
      setDeviceLoaded(true);
    })();
  }, []);

  const saveDevice = useCallback(
    async (patch) => {
      const state = { leagueCode, isAdmin, myTeamName, ...patch };
      try {
        await storage.set(deviceKey, JSON.stringify(state));
      } catch (e) {}
    },
    [leagueCode, isAdmin, myTeamName],
  );

  // ── Step 2: once we know our league code, load (and poll) the SHARED league state ──
  const applyLeagueState = (s) => {
    if (s.teams) setTeams(s.teams);
    if (s.fixtures) setFixtures(s.fixtures);
    setStarted(!!s.started);
    setDraftDone(!!s.draftDone);
    if (s.marketDay) setMarketDay(s.marketDay);
    if (s.marketList) setMarketList(s.marketList);
    if (s.marketResetAt !== undefined) setMarketResetAt(s.marketResetAt);
    if (s.bids) setBids(s.bids);
    if (s.marketHistory) setMarketHistory(s.marketHistory);
    if (s.offers) setOffers(s.offers);
    if (s.notifications) setNotifications(s.notifications);
    if (s.tournamentBracket !== undefined)
      setTournamentBracket(s.tournamentBracket);
    if (s.championPrize !== undefined) setChampionPrize(s.championPrize);
  };

  const loadLeague = useCallback(async (code) => {
    try {
      const saved = await storage.get(leagueKey(code), true);
      if (saved) {
        const s = JSON.parse(saved.value);
        applyLeagueState(s);
        return s;
      }
    } catch (e) {}
    return null;
  }, []);

  useEffect(() => {
    if (!deviceLoaded) return;
    if (!leagueCode) {
      setStorageLoaded(true);
      return;
    }
    (async () => {
      const s = await loadLeague(leagueCode);
      // Decide which screen to land on
      if (s?.started) setView(VIEWS.TABLE);
      else if (myTeamName) setView(VIEWS.WAITING);
      else setView(VIEWS.SETUP); // shouldn't normally happen, but fallback
      setStorageLoaded(true);
    })();
  }, [deviceLoaded, leagueCode]);

  // Keep a ref to the current view so the long-lived Firestore subscription
  // below always reads the latest value without needing to resubscribe.
  const viewRef = useRef(view);
  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  // ── Real-time sync: subscribe to the shared league document.
  // Replaces the old 8s polling — Firestore pushes updates instantly
  // whenever any player (or the admin) writes to the league, so bids,
  // new teams joining, accepted offers, tournament results, etc. all
  // appear live for everyone.
  useEffect(() => {
    if (!leagueCode) return;
    const unsubscribe = storage.subscribe(
      leagueKey(leagueCode),
      (rawValue) => {
        if (!rawValue) return;
        try {
          const s = JSON.parse(rawValue);
          applyLeagueState(s);
          if (
            s.started &&
            (viewRef.current === VIEWS.WAITING ||
              viewRef.current === VIEWS.JOIN_LEAGUE)
          ) {
            setView(VIEWS.TABLE);
          }
        } catch (e) {
          console.error("Failed to parse live league update:", e);
        }
      },
      true,
    );
    return () => unsubscribe();
  }, [leagueCode]);

  // ── Market countdown: ticks every second while viewing the market ──
  useEffect(() => {
    if (view !== VIEWS.MARKET) return;
    setMarketCountdownMs(msUntilNextMarketRefresh(marketResetAt));
    const tick = setInterval(
      () => setMarketCountdownMs(msUntilNextMarketRefresh(marketResetAt)),
      1000,
    );
    return () => clearInterval(tick);
  }, [view, marketResetAt]);

  const save = useCallback(
    async (patch) => {
      if (!leagueCode) return;
      const state = {
        teams,
        fixtures,
        started,
        draftDone,
        marketDay,
        marketList,
        marketResetAt,
        bids,
        marketHistory,
        offers,
        notifications,
        tournamentBracket,
        championPrize,
        ...patch,
      };
      try {
        await storage.set(leagueKey(leagueCode), JSON.stringify(state), true);
      } catch (e) {}
    },
    [
      leagueCode,
      teams,
      fixtures,
      started,
      draftDone,
      marketDay,
      marketList,
      marketResetAt,
      bids,
      marketHistory,
      offers,
      notifications,
      tournamentBracket,
      championPrize,
    ],
  );

  // ── Create league (becomes admin) ──
  const createLeague = async () => {
    const name = leagueNameInput.trim();
    if (!name) {
      setHomeError("Pon un nombre para la liga");
      return;
    }
    const code = genLeagueCode();

    // Step 1: test storage with a minimal write first to isolate the failure point
    try {
      const testResult = await storage.set(leagueKey(code), "test");
      if (!testResult) {
        setHomeError(
          "Fallo en escritura de prueba (storage devolvió null/vacío).",
        );
        return;
      }
    } catch (e) {
      setHomeError(
        `Fallo en escritura de PRUEBA (sin shared): ${e?.message || JSON.stringify(e) || String(e)}`,
      );
      return;
    }

    // Step 2: now try the real shared write
    const initialState = {
      leagueName: name,
      teams: [],
      fixtures: [],
      started: false,
      draftDone: false,
      marketDay: null,
      marketList: [],
      marketResetAt: null,
      bids: {},
      marketHistory: [],
      offers: [],
      notifications: [],
      tournamentBracket: null,
      championPrize: null,
    };
    try {
      const result = await storage.set(
        leagueKey(code),
        JSON.stringify(initialState),
        true,
      );
      if (!result) {
        setHomeError(
          "Escritura de prueba OK, pero la escritura SHARED devolvió vacío.",
        );
        return;
      }
      setLeagueCode(code);
      setIsAdmin(true);
      await saveDevice({ leagueCode: code, isAdmin: true, myTeamName: null });
      setHomeError("");
      setView(VIEWS.SETUP);
    } catch (e) {
      setHomeError(
        `Escritura de prueba OK, pero falló SHARED: ${e?.message || JSON.stringify(e) || String(e)}`,
      );
    }
  };

  // ── Join league (enter code, then create your own team) ──
  const checkJoinCode = async () => {
    const code = joinCodeInput.trim().toUpperCase();
    if (!code) {
      setHomeError("Introduce un código de liga");
      return;
    }
    const saved = await storage.get(leagueKey(code), true).catch(() => null);
    if (!saved) {
      setHomeError("No se encontró ninguna liga con ese código");
      return;
    }
    const s = JSON.parse(saved.value);
    applyLeagueState(s);
    setLeagueCode(code);
    setIsAdmin(false);
    setHomeError("");
    if (s.started) {
      setView(VIEWS.TABLE);
      await saveDevice({ leagueCode: code, isAdmin: false });
    } else setView(VIEWS.SETUP);
  };

  // ── Create my own team within the league (draft happens instantly) ──
  const createMyTeam = async () => {
    const name = newTeamNameInput.trim();
    if (!name) {
      setHomeError("Ponle un nombre a tu equipo");
      return;
    }

    const MAX_ATTEMPTS = 5;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      // 1. Read latest shared state right before writing (excludes my own previous attempt, if any)
      const latest = await storage
        .get(leagueKey(leagueCode), true)
        .catch(() => null);
      const s = latest ? JSON.parse(latest.value) : { teams: [] };
      const existingTeams = (s.teams || []).filter((t) => t.name !== name); // remove my own stale attempt if present
      if (
        existingTeams.find((t) => t.name.toLowerCase() === name.toLowerCase())
      ) {
        setHomeError("Ya existe un equipo con ese nombre en esta liga");
        return;
      }
      const usedStars = existingTeams
        .map((t) => t.squad?.star?.name)
        .filter(Boolean);
      const usedNames = existingTeams.flatMap((t) =>
        (t.squad?.squad || []).map((p) => p.name),
      );
      const idx = existingTeams.length;
      const squad = generateSquad(idx, usedStars, usedNames);
      const newTeam = { ...initTeam(name), squad, crest: null };
      const updatedTeams = [...existingTeams, newTeam];
      const updatedState = { ...s, teams: updatedTeams };

      try {
        await storage.set(
          leagueKey(leagueCode),
          JSON.stringify(updatedState),
          true,
        );
      } catch (e) {
        setHomeError("Error al crear el equipo. Inténtalo de nuevo.");
        return;
      }

      // 2. Re-read immediately: did someone else write concurrently with overlapping players?
      const verify = await storage
        .get(leagueKey(leagueCode), true)
        .catch(() => null);
      const verifyState = verify ? JSON.parse(verify.value) : updatedState;
      const myPlayers = [squad.star.name, ...squad.squad.map((p) => p.name)];
      const otherTeams = (verifyState.teams || []).filter(
        (t) => t.name !== name,
      );
      const otherPlayers = otherTeams.flatMap((t) =>
        [
          t.squad?.star?.name,
          ...(t.squad?.squad || []).map((p) => p.name),
        ].filter(Boolean),
      );
      const hasConflict = myPlayers.some((p) => otherPlayers.includes(p));

      if (!hasConflict) {
        setTeams(verifyState.teams || updatedTeams);
        setMyTeamName(name);
        await saveDevice({ myTeamName: name });
        if (authUser) await addLeagueToProfile(authUser.uid, leagueCode, name);
        setHomeError("");
        setView(VIEWS.WAITING);
        return;
      }
      // Conflict: another device wrote a team concurrently and now both share players.
      // Next loop iteration re-reads the merged state (which now includes the other device's team),
      // removes my own stale entry, and regenerates my squad against the fuller exclusion list.
    }
    setHomeError(
      "No se pudo crear el equipo sin conflictos, inténtalo una vez más.",
    );
  };

  // ── Setup (legacy single-device handlers, still used by admin's own team creation flow internally) ──
  const removeTeam = (name) => {
    const u = teams.filter((t) => t.name !== name);
    setTeams(u);
    save({ teams: u });
  };
  const updateTeamEmoji = (teamName, emoji) => {
    // Keep only the first emoji/character the user picked (some keyboards
    // insert extra invisible variation-selector codepoints; a couple of
    // visible chars is plenty for a crest icon).
    const trimmed = (emoji || "").slice(0, 4);
    const u = teams.map((t) =>
      t.name !== teamName ? t : { ...t, crestEmoji: trimmed },
    );
    setTeams(u);
    save({ teams: u });
  };

  // ── Start tournament: admin only ──
  const startTournament = async () => {
    if (!isAdmin) return;
    if (teams.length < 2) {
      showToast("Necesitas al menos 2 equipos para empezar");
      return;
    }
    // Re-fetch latest state to avoid overwriting teams that joined moments ago
    const latest = await storage
      .get(leagueKey(leagueCode), true)
      .catch(() => null);
    const s = latest ? JSON.parse(latest.value) : { teams };
    const liveTeams = s.teams || teams;
    const fix = [];
    for (let i = 0; i < liveTeams.length; i++)
      for (let j = i + 1; j < liveTeams.length; j++) {
        fix.push({
          home: liveTeams[i].name,
          away: liveTeams[j].name,
          homeGoals: "",
          awayGoals: "",
          played: false,
          scorers: [],
          assists: [],
          mvp: null,
        });
        fix.push({
          home: liveTeams[j].name,
          away: liveTeams[i].name,
          homeGoals: "",
          awayGoals: "",
          played: false,
          scorers: [],
          assists: [],
          mvp: null,
        });
      }
    const day = getDayKey();
    const excluded = liveTeams.flatMap((t) =>
      [
        t.squad?.star?.name,
        ...(t.squad?.squad || []).map((p) => p.name),
      ].filter(Boolean),
    );
    const mList = generateMarket(day, excluded);
    setTeams(liveTeams);
    setFixtures(fix);
    setStarted(true);
    setView(VIEWS.TABLE);
    setMarketDay(day);
    setMarketList(mList);
    const now = Date.now();
    setMarketResetAt(now);
    setBids({});
    save({
      teams: liveTeams,
      fixtures: fix,
      started: true,
      marketDay: day,
      marketList: mList,
      marketResetAt: now,
      bids: {},
    });
  };

  // ── Tournament (single-elimination knockout, admin-only draw) ──
  const drawTournament = async () => {
    if (!isAdmin) return;
    if (teams.length < 2) {
      showToast("Necesitas al menos 2 equipos para sortear el torneo");
      return;
    }
    const bracket = generateBracket(teams.map((t) => t.name));
    setTournamentBracket(bracket);
    setChampionPrize(null);
    save({ tournamentBracket: bracket, championPrize: null });
    showToast("🏆 Torneo sorteado", "success");
  };

  const openTournamentResult = (round, matchIndex) => {
    const match = tournamentBracket[round][matchIndex];
    setTHomeGoals(match.played ? String(match.homeGoals) : "");
    setTAwayGoals(match.played ? String(match.awayGoals) : "");
    setTournamentResultModal({ round, matchIndex });
  };

  const saveTournamentResult = () => {
    const hg = parseInt(tHomeGoals),
      ag = parseInt(tAwayGoals);
    if (isNaN(hg) || isNaN(ag) || hg < 0 || ag < 0) {
      showToast("Introduce un resultado válido");
      return;
    }
    if (hg === ag) {
      showToast("El torneo es a eliminatoria directa: no puede haber empate");
      return;
    }
    const { round, matchIndex } = tournamentResultModal;
    const newBracket = tournamentBracket.map((r) => r.map((m) => ({ ...m })));
    const match = newBracket[round][matchIndex];
    match.homeGoals = hg;
    match.awayGoals = ag;
    match.played = true;
    match.winner = hg > ag ? match.home : match.away;
    const propagated = propagateBracketWinners(newBracket);
    setTournamentBracket(propagated);
    setTournamentResultModal(null);
    save({ tournamentBracket: propagated });
  };

  // ── Tournament champion prize ──
  const claimMoneyPrize = (championTeamName) => {
    const updatedTeams = teams.map((t) =>
      t.name === championTeamName
        ? { ...t, budget: t.budget + TOURNAMENT_PRIZE_MONEY }
        : t,
    );
    setTeams(updatedTeams);
    const prize = { claimed: true, type: "money" };
    setChampionPrize(prize);
    save({ teams: updatedTeams, championPrize: prize });
    showToast(
      `¡${championTeamName} recibe ${fmtM(TOURNAMENT_PRIZE_MONEY)}!`,
      "success",
    );
  };

  const startPlayerPick = () => {
    const usedNames = teams.flatMap((t) => allPlayersOf(t).map((p) => p.name));
    const eligible = MARKET_POOL.filter(
      (p) =>
        p.overall >= PLAYER_PICK_MIN_OVERALL &&
        p.overall <= PLAYER_PICK_MAX_OVERALL &&
        !usedNames.includes(p.name),
    );
    if (eligible.length < 3) {
      showToast(
        "No quedan suficientes jugadores 87-89 libres para el Player Pick. Elige el premio en dinero.",
      );
      return;
    }
    const cards = shuffle(eligible).slice(0, 3);
    const prize = {
      claimed: false,
      type: "playerpick",
      cards,
      revealed: [false, false, false],
      selectedIdx: null,
    };
    setChampionPrize(prize);
    save({ championPrize: prize });
  };

  const startLegendPick = () => {
    const usedNames = teams.flatMap((t) => allPlayersOf(t).map((p) => p.name));
    const eligible = LEGEND_POOL.filter(
      (p) =>
        p.overall <= LEGEND_PRIZE_MAX_OVERALL && !usedNames.includes(p.name),
    );
    if (eligible.length < 1) {
      showToast(
        "No quedan leyendas libres (≤89) para este premio. Elige otra opción.",
      );
      return;
    }
    const cards = [shuffle(eligible)[0]];
    const prize = {
      claimed: false,
      type: "legendpick",
      cards,
      revealed: [false],
      selectedIdx: null,
    };
    setChampionPrize(prize);
    save({ championPrize: prize });
  };

  const revealCard = (idx) => {
    if (
      !championPrize ||
      (championPrize.type !== "playerpick" &&
        championPrize.type !== "legendpick") ||
      championPrize.claimed
    )
      return;
    const newRevealed = [...championPrize.revealed];
    newRevealed[idx] = true;
    const prize = { ...championPrize, revealed: newRevealed };
    setChampionPrize(prize);
    save({ championPrize: prize });
  };

  const selectCard = (idx) => {
    if (!championPrize || !championPrize.revealed[idx] || championPrize.claimed)
      return;
    const prize = { ...championPrize, selectedIdx: idx };
    setChampionPrize(prize);
    save({ championPrize: prize });
  };

  const confirmPlayerPick = (championTeamName) => {
    if (!championPrize || championPrize.selectedIdx === null) return;
    const chosenPlayer = championPrize.cards[championPrize.selectedIdx];
    const team = teams.find((t) => t.name === championTeamName);
    if (!team) return;
    const allP = allPlayersOf(team);
    const newPlayer = {
      ...chosenPlayer,
      id: `pick_${Date.now()}`,
      goals: 0,
      assists: 0,
      mvps: 0,
      clauseValue: clauseBase(chosenPlayer.overall),
      joinedAt: Date.now(),
    };
    if (allP.length >= MAX_SQUAD) {
      setPlayerPickSwapModal({ newPlayer, championTeamName });
      return;
    }
    const updatedTeams = teams.map((t) =>
      t.name === championTeamName
        ? {
            ...t,
            squad: {
              ...t.squad,
              squad: [...(t.squad?.squad || []), newPlayer],
            },
          }
        : t,
    );
    setTeams(updatedTeams);
    const prize = { ...championPrize, claimed: true };
    setChampionPrize(prize);
    save({ teams: updatedTeams, championPrize: prize });
    showToast(`¡${chosenPlayer.name} se une a ${championTeamName}!`, "success");
  };

  const resolvePlayerPickSwap = (removeId) => {
    if (!playerPickSwapModal) return;
    const { newPlayer, championTeamName } = playerPickSwapModal;
    const updatedTeams = teams.map((t) => {
      if (t.name !== championTeamName) return t;
      const isStarRemoved = t.squad?.star?.id === removeId;
      const newSquad = isStarRemoved
        ? t.squad.squad
        : t.squad.squad.filter((p) => p.id !== removeId);
      return {
        ...t,
        squad: {
          star: isStarRemoved ? null : t.squad.star,
          squad: [...newSquad, newPlayer],
        },
      };
    });
    setTeams(updatedTeams);
    const prize = { ...championPrize, claimed: true };
    setChampionPrize(prize);
    setPlayerPickSwapModal(null);
    save({ teams: updatedTeams, championPrize: prize });
    showToast(`¡${newPlayer.name} se une a ${championTeamName}!`, "success");
  };

  // ── Buy a legend (overall >= 89) from the market for a fixed price ──
  const buyLegend = (legendPlayer) => {
    if (!myTeamName) {
      showToast("Necesitas tu propio equipo para comprar");
      return;
    }
    const team = teams.find((t) => t.name === myTeamName);
    if (!team || team.budget < LEGEND_MARKET_PRICE) {
      showToast("Saldo insuficiente");
      setLegendBuyConfirm(null);
      return;
    }
    const newPlayer = {
      ...legendPlayer,
      id: `legend_${Date.now()}`,
      goals: 0,
      assists: 0,
      mvps: 0,
      clauseValue: LEGEND_MARKET_PRICE,
      joinedAt: Date.now(),
    };
    const allP = allPlayersOf(team);
    if (allP.length >= MAX_SQUAD) {
      setLegendBuyConfirm(null);
      setLegendSwapModal({ newPlayer });
      return;
    }
    const updatedTeams = teams.map((t) =>
      t.name === myTeamName
        ? {
            ...t,
            budget: t.budget - LEGEND_MARKET_PRICE,
            squad: {
              ...t.squad,
              squad: [...(t.squad?.squad || []), newPlayer],
            },
          }
        : t,
    );
    setTeams(updatedTeams);
    setLegendBuyConfirm(null);
    save({ teams: updatedTeams });
    showToast(`¡${legendPlayer.name} se une a ${myTeamName}!`, "success");
  };

  const resolveLegendSwap = (removeId) => {
    if (!legendSwapModal) return;
    const { newPlayer } = legendSwapModal;
    const team = teams.find((t) => t.name === myTeamName);
    if (!team || team.budget < LEGEND_MARKET_PRICE) {
      showToast("Saldo insuficiente");
      setLegendSwapModal(null);
      return;
    }
    const updatedTeams = teams.map((t) => {
      if (t.name !== myTeamName) return t;
      const isStarRemoved = t.squad?.star?.id === removeId;
      const newSquad = isStarRemoved
        ? t.squad.squad
        : t.squad.squad.filter((p) => p.id !== removeId);
      return {
        ...t,
        budget: t.budget - LEGEND_MARKET_PRICE,
        squad: {
          star: isStarRemoved ? null : t.squad.star,
          squad: [...newSquad, newPlayer],
        },
      };
    });
    setTeams(updatedTeams);
    setLegendSwapModal(null);
    save({ teams: updatedTeams });
    showToast(`¡${newPlayer.name} se une a ${myTeamName}!`, "success");
  };

  const resetAll = async () => {
    setTeams([]);
    setFixtures([]);
    setStarted(false);
    setDraftDone(false);
    setView(VIEWS.HOME);
    setTeamInput("");
    setMarketDay(null);
    setMarketList([]);
    setBids({});
    setMarketHistory([]);
    setOffers([]);
    setNotifications([]);
    setLeagueCode(null);
    setIsAdmin(false);
    setMyTeamName(null);
    setLeagueNameInput("");
    setJoinCodeInput("");
    setNewTeamNameInput("");
    try {
      await storage.delete(deviceKey);
    } catch (e) {}
  };

  // ── Market resolution ──
  const checkAndRefreshMarket = () => {
    const today = getDayKey();
    if (today !== marketDay) resolveAuctions();
  };
  const resolveAuctions = () => {
    if (!isAdmin) return;
    const now = Date.now();
    const today = getDayKey();
    let updatedTeams = [...teams];
    const newHistory = [...marketHistory];
    for (const player of marketList) {
      const playerBids = bids[player.marketId] || {};
      const entries = Object.entries(playerBids);
      if (entries.length === 0) continue;
      entries.sort((a, b) => b[1] - a[1]);
      const [winner, winAmount] = entries[0];
      const losers = entries.slice(1);
      updatedTeams = updatedTeams.map((t) => {
        const lost = losers.find(([tn]) => tn === t.name);
        if (lost) return { ...t, budget: t.budget + lost[1] };
        return t;
      });
      newHistory.push({
        day: marketDay,
        player: player.name,
        pos: player.pos,
        overall: player.overall,
        winner,
        amount: winAmount,
      });
      const winnerTeam = updatedTeams.find((t) => t.name === winner);
      if (winnerTeam) {
        const allP = allPlayersOf(winnerTeam);
        if (allP.length >= MAX_SQUAD) {
          setSwapModal({
            teamName: winner,
            newPlayer: { ...player, fromMarket: true },
            amount: winAmount,
          });
        } else {
          updatedTeams = updatedTeams.map((t) => {
            if (t.name !== winner) return t;
            return {
              ...t,
              squad: {
                ...t.squad,
                squad: [
                  ...(t.squad?.squad || []),
                  {
                    ...player,
                    id: `mkt_${player.marketId}`,
                    goals: 0,
                    assists: 0,
                    mvps: 0,
                    clauseValue: winAmount,
                    joinedAt: Date.now(),
                  },
                ],
              },
            };
          });
        }
      }
    }
    const excluded = updatedTeams.flatMap((t) =>
      [
        t.squad?.star?.name,
        ...(t.squad?.squad || []).map((p) => p.name),
      ].filter(Boolean),
    );
    const mList = generateMarket(today, excluded);
    setTeams(updatedTeams);
    setMarketDay(today);
    setMarketList(mList);
    setBids({});
    setMarketHistory(newHistory);
    setMarketResetAt(now);
    save({
      teams: updatedTeams,
      marketDay: today,
      marketList: mList,
      bids: {},
      marketHistory: newHistory,
      marketResetAt: now,
    });
  };

  // ── New simplified bid flow ──
  const openBidModal = (player) => {
    if (!myTeamName) {
      showToast("Elige primero tu equipo (arriba)");
      return;
    }
    const myBid = bids[player.marketId]?.[myTeamName] || 0;
    setBidAmountStr(myBid > 0 ? String(myBid) : String(player.baseValue));
    setBidModal(player);
  };
  const getAvailableBudget = (teamName, excludeMarketId = null) => {
    const team = teams.find((t) => t.name === teamName);
    if (!team) return 0;

    const currentBidOnThis = excludeMarketId
      ? bids[excludeMarketId]?.[teamName] || 0
      : 0;

    return team.budget + currentBidOnThis;
  };
  const confirmBid = () => {
    const player = bidModal;
    const amount = parseFloat(bidAmountStr);
    if (!myTeamName || !player) return;
    if (isNaN(amount) || amount <= 0) {
      showToast("Introduce una cantidad válida");
      return;
    }
    if (amount < player.baseValue) {
      showToast(`La puja mínima es ${fmtM(player.baseValue)}`);
      return;
    }
    const currentBidOnThis = bids[player.marketId]?.[myTeamName] || 0;
    const availableExcl = getAvailableBudget(myTeamName, player.marketId);
    if (amount > availableExcl) {
      showToast(`Saldo insuficiente. Disponible: ${fmtM(availableExcl)}`);
      return;
    }
    const newBids = {
      ...bids,
      [player.marketId]: {
        ...(bids[player.marketId] || {}),
        [myTeamName]: amount,
      },
    };
    const updatedTeams = teams.map((t) =>
      t.name !== myTeamName
        ? t
        : { ...t, budget: t.budget + currentBidOnThis - amount },
    );
    setBids(newBids);
    setTeams(updatedTeams);
    setBidModal(null);
    showToast(
      `Puja de ${fmtM(amount)} registrada en ${player.name}`,
      "success",
    );
    save({ bids: newBids, teams: updatedTeams });
  };
  const cancelBid = (marketId) => {
    const currentBid = bids[marketId]?.[myTeamName] || 0;
    if (!currentBid) return;
    const newBids = { ...bids, [marketId]: { ...(bids[marketId] || {}) } };
    delete newBids[marketId][myTeamName];
    const updatedTeams = teams.map((t) =>
      t.name !== myTeamName ? t : { ...t, budget: t.budget + currentBid },
    );
    setBids(newBids);
    setTeams(updatedTeams);
    setBidModal(null);
    showToast("Puja cancelada y saldo devuelto", "success");
    save({ bids: newBids, teams: updatedTeams });
  };
  const discardPlayer = (teamName, player) => {
    const clauseTotal =
      (player.clauseValue ?? clauseBase(player.overall)) +
      (player.clauseInvested || 0) * 2;
    const compensation = clauseTotal / 2;
    const updatedTeams = teams.map((t) => {
      if (t.name !== teamName) return t;
      const isStar = t.squad?.star?.id === player.id;
      return {
        ...t,
        budget: t.budget + compensation,
        squad: {
          star: isStar ? null : t.squad.star,
          squad: t.squad.squad.filter((p) => p.id !== player.id),
        },
      };
    });
    setTeams(updatedTeams);
    save({ teams: updatedTeams });
    showToast(
      `${player.name} descartado. Recibiste ${fmtM(compensation)}`,
      "success",
    );
  };
  const toggleListForSale = (teamName, playerId, listed) => {
    const updatePlayer = (p) =>
      p.id === playerId ? { ...p, listedForSale: listed } : p;
    const updatedTeams = teams.map((t) => {
      if (t.name !== teamName) return t;
      return {
        ...t,
        squad: {
          star: t.squad.star ? updatePlayer(t.squad.star) : t.squad.star,
          squad: t.squad.squad.map(updatePlayer),
        },
      };
    });
    setTeams(updatedTeams);
    save({ teams: updatedTeams });
    showToast(
      listed ? "Jugador puesto en el mercado" : "Jugador retirado del mercado",
      "success",
    );
  };
  const reorderSquad = (teamName, oldIndex, newIndex) => {
    const updatedTeams = teams.map((t) => {
      if (t.name !== teamName) return t;
      const newSquadArr = arrayMove(t.squad.squad, oldIndex, newIndex);
      return { ...t, squad: { ...t.squad, squad: newSquadArr } };
    });
    setTeams(updatedTeams);
    save({ teams: updatedTeams });
  };
  const setLineupFormation = (teamName, formation) => {
    const updatedTeams = teams.map((t) => {
      if (t.name !== teamName) return t;
      return { ...t, lineup: { formation, slots: {} } }; // cambiar formación resetea las posiciones
    });
    setTeams(updatedTeams);
    save({ teams: updatedTeams });
  };

  const assignPlayerToSlot = (teamName, slotId, playerId) => {
    const updatedTeams = teams.map((t) => {
      if (t.name !== teamName) return t;
      const currentLineup = t.lineup || {
        formation: FORMATION_NAMES[0],
        slots: {},
      };
      // Si el jugador ya estaba en otro slot, lo quitamos de ahí primero (no puede estar en dos sitios)
      const cleanedSlots = Object.fromEntries(
        Object.entries(currentLineup.slots).filter(
          ([, pid]) => pid !== playerId,
        ),
      );
      return {
        ...t,
        lineup: {
          ...currentLineup,
          slots: { ...cleanedSlots, [slotId]: playerId },
        },
      };
    });
    setTeams(updatedTeams);
    save({ teams: updatedTeams });
    setLineupSlotModal(null);
  };

  const clearSlot = (teamName, slotId) => {
    const updatedTeams = teams.map((t) => {
      if (t.name !== teamName) return t;
      const currentLineup = t.lineup || {
        formation: FORMATION_NAMES[0],
        slots: {},
      };
      const newSlots = { ...currentLineup.slots };
      delete newSlots[slotId];
      return { ...t, lineup: { ...currentLineup, slots: newSlots } };
    });
    setTeams(updatedTeams);
    save({ teams: updatedTeams });
    setLineupSlotModal(null);
  };
  const swapPlayer = (teamName, removeId, newPlayer, amount) => {
    const updatedTeams = teams.map((t) => {
      if (t.name !== teamName) return t;
      const newSquad = t.squad.squad.filter((p) => p.id !== removeId);
      newSquad.push({
        ...newPlayer,
        id: `mkt_${newPlayer.marketId}`,
        goals: 0,
        assists: 0,
        mvps: 0,
        clauseValue: amount ?? clauseBase(newPlayer.overall),
        joinedAt: Date.now(),
      });
      return { ...t, squad: { ...t.squad, squad: newSquad } };
    });
    setTeams(updatedTeams);
    setSwapModal(null);
    save({ teams: updatedTeams });
  };

  // ── Inter-team transfers ──
  const addNotification = (text, type = "info") => {
    const notif = {
      id: `n_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      type,
      text,
      createdAt: Date.now(),
      read: false,
    };
    const updated = [notif, ...notifications].slice(0, 50);
    setNotifications(updated);
    return updated;
  };

  const findPlayerOwner = (playerId) =>
    teams.find((t) => allPlayersOf(t).some((p) => p.id === playerId));

  const payClause = (sellerTeamName, player, clauseAmount) => {
    if (!myTeamName || myTeamName === sellerTeamName) return;
    if (isNightClauseLock()) {
      showToast(
        "Las cláusulas están desactivadas entre las 18:00 y las 06:00.",
      );
      setClauseConfirm(null);
      return;
    }
    if (isClauseLocked(player)) {
      const hoursLeft = Math.ceil(
        clauseLockRemainingMs(player) / (60 * 60 * 1000),
      );
      showToast(
        `Cláusula bloqueada: este jugador llegó al equipo hace menos de 24h (quedan ~${hoursLeft}h)`,
      );
      setClauseConfirm(null);
      return;
    }
    const buyer = teams.find((t) => t.name === myTeamName);
    if (!buyer || buyer.budget < clauseAmount) {
      showToast("Saldo insuficiente para pagar la cláusula");
      setClauseConfirm(null);
      return;
    }
    const buyerAll = allPlayersOf(buyer);
    if (buyerAll.length >= MAX_SQUAD) {
      showToast("Plantilla llena (23 jugadores)");
      setClauseConfirm(null);
      return;
    }
    const updatedTeams = executeTransfer(
      sellerTeamName,
      myTeamName,
      player,
      clauseAmount,
      clauseAmount,
    );
    setClauseConfirm(null);
    showToast(`¡Cláusula pagada! ${player.name} es tuyo`, "success");
    const newNotifications = addNotification(
      `${myTeamName} pagó la cláusula de ${player.name} (${fmtM(clauseAmount)}) a ${sellerTeamName}.`,
      "clause",
    );
    save({ teams: updatedTeams, notifications: newNotifications });
  };

  const executeTransfer = (
    sellerName,
    buyerName,
    player,
    amount,
    newClauseValue,
  ) => {
    const updatedTeams = teams.map((t) => {
      if (t.name === sellerName) {
        const isStar = t.squad?.star?.id === player.id;
        return {
          ...t,
          budget: t.budget + amount,
          squad: {
            star: isStar ? null : t.squad.star,
            squad: t.squad.squad.filter((p) => p.id !== player.id),
          },
        };
      }
      if (t.name === buyerName) {
        return {
          ...t,
          budget: t.budget - amount,
          squad: {
            ...t.squad,
            squad: [
              ...(t.squad?.squad || []),
              {
                ...player,
                clauseInvested: 0,
                clauseValue: newClauseValue ?? clauseBase(player.overall),
                joinedAt: Date.now(),
              },
            ],
          },
        };
      }
      return t;
    });
    setTeams(updatedTeams);
    return updatedTeams;
  };

  const investInClause = (teamName, playerId) => {
    const key = playerId;
    const amt = parseFloat(clauseInvestInput[key]);
    if (isNaN(amt) || amt <= 0) {
      showToast("Introduce una cantidad válida");
      return;
    }
    const team = teams.find((t) => t.name === teamName);
    if (!team || team.budget < amt) {
      showToast("Saldo insuficiente");
      return;
    }
    const updatedTeams = teams.map((t) => {
      if (t.name !== teamName) return t;
      const updatePlayer = (p) =>
        p.id === playerId
          ? { ...p, clauseInvested: (p.clauseInvested || 0) + amt }
          : p;
      return {
        ...t,
        budget: t.budget - amt,
        squad: {
          star: t.squad.star ? updatePlayer(t.squad.star) : t.squad.star,
          squad: t.squad.squad.map(updatePlayer),
        },
      };
    });
    setTeams(updatedTeams);
    setClauseInvestInput((prev) => ({ ...prev, [key]: "" }));
    showToast("Cláusula incrementada", "success");
    save({ teams: updatedTeams });
  };

  // ── Offers (free-price, accept/reject by the receiving team) ──
  const openOfferModal = (teamName, player) => {
    setOfferModal({ teamName, player });
    setOfferAmountStr(String(player.clauseValue || clauseBase(player.overall)));
  };
  const submitOffer = () => {
    const amount = parseFloat(offerAmountStr);
    if (!myTeamName) {
      showToast("Necesitas tu propio equipo para ofertar");
      return;
    }
    if (isNaN(amount) || amount <= 0) {
      showToast("Introduce una cantidad válida");
      return;
    }
    const buyer = teams.find((t) => t.name === myTeamName);
    if (!buyer || buyer.budget < amount) {
      showToast("Saldo insuficiente");
      return;
    }
    const offer = {
      offerId: `O_${Date.now()}`,
      fromTeam: myTeamName,
      toTeam: offerModal.teamName,
      player: offerModal.player,
      amount,
      status: "pending",
      createdAt: Date.now(),
    };
    const newOffers = [...offers, offer];
    setOffers(newOffers);
    setOfferModal(null);
    showToast(
      `Oferta de ${fmtM(amount)} enviada por ${offerModal.player.name}`,
      "success",
    );
    const newNotifications = addNotification(
      `${myTeamName} ha ofertado ${fmtM(amount)} por ${offerModal.player.name}.`,
      "offer",
    );
    save({ offers: newOffers, notifications: newNotifications });
  };
  const acceptOffer = (offer) => {
    const buyer = teams.find((t) => t.name === offer.fromTeam);
    const seller = teams.find((t) => t.name === offer.toTeam);
    if (!buyer || buyer.budget < offer.amount) {
      showToast("El comprador ya no tiene saldo suficiente");
      return;
    }
    const buyerAll = allPlayersOf(buyer);
    if (buyerAll.length >= MAX_SQUAD) {
      showToast("La plantilla del comprador está llena");
      return;
    }
    const updatedTeams = executeTransfer(
      offer.toTeam,
      offer.fromTeam,
      offer.player,
      offer.amount,
      offer.amount,
    );
    const newOffers = offers.map((o) =>
      o.offerId === offer.offerId ? { ...o, status: "accepted" } : o,
    );
    setOffers(newOffers);
    showToast(
      `Oferta aceptada: ${offer.player.name} fichado por ${offer.fromTeam}`,
      "success",
    );
    const newNotifications = addNotification(
      `${offer.toTeam} aceptó la oferta de ${fmtM(offer.amount)} de ${offer.fromTeam} por ${offer.player.name}.`,
      "offer",
    );
    save({
      offers: newOffers,
      notifications: newNotifications,
      teams: updatedTeams,
    });
  };
  const rejectOffer = (offer) => {
    const newOffers = offers.map((o) =>
      o.offerId === offer.offerId ? { ...o, status: "rejected" } : o,
    );
    setOffers(newOffers);
    showToast("Oferta rechazada", "success");
    const newNotifications = addNotification(
      `${offer.toTeam} rechazó la oferta de ${fmtM(offer.amount)} de ${offer.fromTeam} por ${offer.player.name}.`,
      "offer",
    );
    save({ offers: newOffers, notifications: newNotifications });
  };
  const cancelOffer = (offer) => {
    const newOffers = offers.map((o) =>
      o.offerId === offer.offerId ? { ...o, status: "cancelled" } : o,
    );
    setOffers(newOffers);
    showToast("Oferta cancelada", "success");
    const newNotifications = addNotification(
      `${offer.fromTeam} se arrepintió de hacer la oferta de ${fmtM(offer.amount)} de ${offer.toTeam} por ${offer.player.name}.`,
      "offer",
    );

    save({
      offers: newOffers,
      notifications: newNotifications,
    });
  };

  // ── Results with scorers/assists/mvp ──
  const openResult = (idx) => {
    const f = fixtures[idx];
    setPR(idx);
    setHG(f.played ? String(f.homeGoals) : "");
    setAG(f.played ? String(f.awayGoals) : "");
    setMatchEvents({
      scorers: f.scorers || [],
      assists: f.assists || [],
      mvp: f.mvp || null,
    });
  };
  const addScorer = (team, playerId) => {
    if (!playerId) return;
    setMatchEvents((prev) => ({
      ...prev,
      scorers: [...prev.scorers, { team, playerId }],
    }));
  };
  const removeScorer = (i) =>
    setMatchEvents((prev) => ({
      ...prev,
      scorers: prev.scorers.filter((_, idx) => idx !== i),
    }));
  const addAssist = (team, playerId) => {
    if (!playerId) return;
    setMatchEvents((prev) => ({
      ...prev,
      assists: [...prev.assists, { team, playerId }],
    }));
  };
  const removeAssist = (i) =>
    setMatchEvents((prev) => ({
      ...prev,
      assists: prev.assists.filter((_, idx) => idx !== i),
    }));
  const setMvp = (playerId) =>
    setMatchEvents((prev) => ({
      ...prev,
      mvp: prev.mvp === playerId ? null : playerId,
    }));

  const saveResult = () => {
    const hg = parseInt(homeGoals),
      ag = parseInt(awayGoals);
    if (isNaN(hg) || isNaN(ag) || hg < 0 || ag < 0) {
      showToast("Introduce un resultado válido");
      return;
    }
    const f = fixtures[pendingResult];
    const newFix = fixtures.map((ff, i) =>
      i === pendingResult
        ? {
            ...ff,
            homeGoals: hg,
            awayGoals: ag,
            played: true,
            scorers: matchEvents.scorers,
            assists: matchEvents.assists,
            mvp: matchEvents.mvp,
          }
        : ff,
    );

    const newTeams = teams.map((t) => ({
      ...t,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      gf: 0,
      ga: 0,
      points: 0,
    }));
    for (const ff of newFix) {
      if (!ff.played) continue;
      const h = newTeams.find((t) => t.name === ff.home),
        a = newTeams.find((t) => t.name === ff.away);
      h.played++;
      a.played++;
      h.gf += ff.homeGoals;
      h.ga += ff.awayGoals;
      a.gf += ff.awayGoals;
      a.ga += ff.homeGoals;
      if (ff.homeGoals > ff.awayGoals) {
        h.won++;
        h.points += 3;
        a.lost++;
      } else if (ff.homeGoals < ff.awayGoals) {
        a.won++;
        a.points += 3;
        h.lost++;
      } else {
        h.drawn++;
        h.points++;
        a.drawn++;
        a.points++;
      }
    }

    const wasPlayed = f.played;
    const prevHG = wasPlayed ? f.homeGoals : null,
      prevAG = wasPlayed ? f.awayGoals : null;
    let merged = newTeams.map((t, i) => ({
      ...t,
      squad: teams[i].squad,
      budget: teams[i].budget,
    }));
    if (wasPlayed)
      merged = applyMatchEconomy(merged, f.home, f.away, prevHG, prevAG, true);
    merged = applyMatchEconomy(merged, f.home, f.away, hg, ag, false);
    merged = applyPlayerStats(
      merged,
      f.scorers || [],
      f.assists || [],
      f.mvp,
      true,
    );
    merged = applyPlayerStats(
      merged,
      matchEvents.scorers,
      matchEvents.assists,
      matchEvents.mvp,
      false,
    );

    setFixtures(newFix);
    setTeams(merged);
    setPR(null);
    save({ fixtures: newFix, teams: merged });
  };

  function applyMatchEconomy(teamsArr, homeName, awayName, hg, ag, reverse) {
    const sign = reverse ? -1 : 1;
    return teamsArr.map((t) => {
      if (t.name !== homeName && t.name !== awayName) return t;
      const isHome = t.name === homeName;
      const myGoals = isHome ? hg : ag,
        oppGoals = isHome ? ag : hg;
      let delta = 0;
      if (myGoals > oppGoals) delta += PRIZE_WIN;
      else if (myGoals === oppGoals) delta += PRIZE_DRAW;
      else delta += PRIZE_LOSS;
      delta += myGoals * PRIZE_GOAL_FOR;
      delta += oppGoals * PRIZE_GOAL_AGAINST;
      return { ...t, budget: t.budget + sign * delta };
    });
  }
  function applyPlayerStats(teamsArr, scorers, assists, mvp, reverse) {
    const delta = reverse ? -1 : 1;
    const updatePlayerIn = (team, playerId, field) => {
      const updateP = (p) =>
        p.id === playerId
          ? { ...p, [field]: Math.max(0, (p[field] || 0) + delta) }
          : p;
      return {
        ...team,
        squad: {
          star: team.squad?.star ? updateP(team.squad.star) : team.squad?.star,
          squad: (team.squad?.squad || []).map(updateP),
        },
      };
    };
    let result = [...teamsArr];
    for (const s of scorers)
      result = result.map((t) =>
        t.name === s.team ? updatePlayerIn(t, s.playerId, "goals") : t,
      );
    for (const a of assists)
      result = result.map((t) =>
        t.name === a.team ? updatePlayerIn(t, a.playerId, "assists") : t,
      );
    if (mvp)
      result = result.map((t) => {
        const has = allPlayersOf(t).some((p) => p.id === mvp);
        return has ? updatePlayerIn(t, mvp, "mvps") : t;
      });
    return result;
  }

  const sorted = [...teams].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const gd = b.gf - b.ga - (a.gf - a.ga);
    if (gd !== 0) return gd;
    return b.gf - a.gf;
  });
  const played = fixtures.filter((f) => f.played),
    pending = fixtures.filter((f) => !f.played);
  const sortedPending = [...pending].sort((a, b) => {
    const aMine = a.home === myTeamName || a.away === myTeamName ? 0 : 1;
    const bMine = b.home === myTeamName || b.away === myTeamName ? 0 : 1;
    return aMine - bMine;
  });
  const pct = fixtures.length
    ? Math.round((played.length / fixtures.length) * 100)
    : 0;
  const seasonOver = fixtures.length > 0 && pending.length === 0;
  const getCommitted = (teamName) =>
    Object.values(bids).reduce((sum, tb) => sum + (tb[teamName] || 0), 0);

  const allPlayersWithTeam = teams.flatMap((t) =>
    allPlayersOf(t).map((p) => ({ ...p, teamName: t.name })),
  );
  const pendingIncomingOffersCount = offers.filter(
    (o) => o.toTeam === myTeamName && o.status === "pending",
  ).length;
  const usedPlayerNames = allPlayersWithTeam.map((p) => p.name);
  const availableLegends = LEGEND_POOL.filter(
    (p) =>
      p.overall >= LEGEND_MARKET_MIN_OVERALL &&
      !usedPlayerNames.includes(p.name),
  );
  const topScorers = [...allPlayersWithTeam]
    .filter((p) => p.goals > 0)
    .sort((a, b) => b.goals - a.goals)
    .slice(0, 10);
  const topAssists = [...allPlayersWithTeam]
    .filter((p) => p.assists > 0)
    .sort((a, b) => b.assists - a.assists)
    .slice(0, 10);
  const topMvps = [...allPlayersWithTeam]
    .filter((p) => p.mvps > 0)
    .sort((a, b) => b.mvps - a.mvps)
    .slice(0, 10);

  // ── Zamora ranking: each team's representative goalkeeper (the star if
  // they're a POR, otherwise the highest-overall POR in the squad), ranked by
  // fewest goals conceded by their team. Lowest ga wins the Zamora.
  const zamoraRanking = teams
    .map((t) => {
      const allP = allPlayersOf(t);
      const gks = allP.filter((p) => (p.pos || p.position) === "POR");
      const keeper =
        gks.length > 0
          ? [...gks].sort((a, b) => b.overall - a.overall)[0]
          : null;
      return { teamName: t.name, ga: t.ga, played: t.played, keeper };
    })
    .filter((z) => z.keeper)
    .sort((a, b) => a.ga - b.ga);
  const zamoraWinner = zamoraRanking[0]?.keeper || null;

  const startNewSeason = () => {
    let updatedTeams = [...teams];
    const give = (playerId, amount) => {
      updatedTeams = updatedTeams.map((t) => {
        const has = allPlayersOf(t).some((p) => p.id === playerId);
        return has ? { ...t, budget: t.budget + amount } : t;
      });
    };
    if (topScorers[0]) give(topScorers[0].id, SEASON_PRIZE_TOPSCORER);
    if (topAssists[0]) give(topAssists[0].id, SEASON_PRIZE_TOPASSIST);
    if (topMvps[0]) give(topMvps[0].id, SEASON_PRIZE_MVP);
    if (zamoraWinner) give(zamoraWinner.id, SEASON_PRIZE_ZAMORA);
    sorted.forEach((t, idx) => {
      const prize = finalRankingPrize(idx);
      updatedTeams = updatedTeams.map((u) =>
        u.name === t.name ? { ...u, budget: u.budget + prize } : u,
      );
    });

    const resetPlayerStats = (p) => ({ ...p, goals: 0, assists: 0, mvps: 0 });
    updatedTeams = updatedTeams.map((t) => ({
      ...t,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      gf: 0,
      ga: 0,
      points: 0,
      squad: t.squad
        ? {
            star: t.squad.star ? resetPlayerStats(t.squad.star) : t.squad.star,
            squad: (t.squad.squad || []).map(resetPlayerStats),
          }
        : t.squad,
    }));

    const newFixtures = [];
    for (let i = 0; i < updatedTeams.length; i++)
      for (let j = i + 1; j < updatedTeams.length; j++) {
        newFixtures.push({
          home: updatedTeams[i].name,
          away: updatedTeams[j].name,
          homeGoals: "",
          awayGoals: "",
          played: false,
          scorers: [],
          assists: [],
          mvp: null,
        });
        newFixtures.push({
          home: updatedTeams[j].name,
          away: updatedTeams[i].name,
          homeGoals: "",
          awayGoals: "",
          played: false,
          scorers: [],
          assists: [],
          mvp: null,
        });
      }

    setTeams(updatedTeams);
    setFixtures(newFixtures);
    save({ teams: updatedTeams, fixtures: newFixtures });
    showToast(
      "🆕 ¡Nueva temporada iniciada! Premios repartidos y calendario reiniciado.",
      "success",
    );
  };

  const myTeamObj = teams.find((t) => t.name === myTeamName);

  // ─── Mobile-first styles ────────────────────────────────────────────────
  const bg = "#0a0805"; // negro cálido en vez de azul oscuro
  const gold = "#c9a227"; // dorado principal
  const goldLight = "#e8c252"; // dorado claro (hover/highlight)
  const goldDark = "#8a6f1a"; // dorado oscuro (bordes)
  const card = {
    background: "#15110a",
    border: "1px solid #2e2615",
    borderRadius: 14,
    padding: "14px 16px",
    marginBottom: 10,
  };
  const input = {
    background: "#100d08",
    border: "1px solid #2e2615",
    borderRadius: 10,
    padding: "12px 14px",
    color: "#f0e6d2",
    fontSize: 15,
    outline: "none",
    width: "100%",
  };
  const btn = (col) => ({
    background: col || "linear-gradient(135deg,#c9a227,#8a6f1a)",
    color: col ? "#fff" : "#0a0805",
    border: "none",
    borderRadius: 12,
    padding: "13px 20px",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 15,
    width: "100%",
  });
  const pill = (active) => ({
    background: active ? "linear-gradient(135deg,#c9a227,#8a6f1a)" : "#100d08",
    color: active ? "#0a0805" : "#c9a98a",
    border: "1px solid #2e2615",
    borderRadius: 20,
    padding: "7px 14px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 13,
    whiteSpace: "nowrap",
    display: "flex",
    alignItems: "center",
    gap: 6,
  });

  const NAV_ITEMS = [
    { v: VIEWS.TABLE, icon: "🏆", label: "Liga" },
    { v: VIEWS.FIXTURES, icon: "📅", label: "Partidos" },
    { v: VIEWS.MARKET, icon: "🏪", label: "Mercado" },
    { v: VIEWS.TRANSFERS, icon: "🔄", label: "Traspasos" },
    { v: VIEWS.SQUADS, icon: "👥", label: "Plantillas" },
  ];

  const PlayerRow = ({ p, teamName, mode }) => {
    // mode: "own" (full management) | "other" (read-only + clause/offer)
    const clauseTotal =
      (p.clauseValue ?? clauseBase(p.overall)) + (p.clauseInvested || 0) * 2;
    const team = teams.find((t) => t.name === teamName);
    const isStar = team.squad.star.name === p.name;
    return (
      <div style={{ padding: "10px 0", borderBottom: "1px solid #241e10" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
            marginBottom: mode ? 6 : 0,
          }}
        >
          <span
            style={{
              background: posColor(p.pos || p.position),
              color: "#fff",
              borderRadius: 5,
              padding: "3px 7px",
              fontSize: 11,
              fontWeight: 700,
              minWidth: 38,
              textAlign: "center",
            }}
          >
            {p.pos || p.position}
          </span>
          <span
            style={{ fontWeight: 600, flex: 1, fontSize: 14, minWidth: 100 }}
          >
            {p.name}
          </span>
          {(p.goals > 0 || p.assists > 0 || p.mvps > 0) && (
            <span
              style={{
                fontSize: 10,
                color: "#8a7a5a",
                display: "flex",
                gap: 6,
              }}
            >
              {p.goals > 0 && <span>⚽{p.goals}</span>}
              {p.assists > 0 && <span>🅰️{p.assists}</span>}
              {p.mvps > 0 && <span>🏅{p.mvps}</span>}
            </span>
          )}
          <span
            style={{
              fontWeight: 800,
              color: ratingColor(p.overall),
              fontSize: 16,
              minWidth: 26,
              textAlign: "right",
            }}
          >
            {p.overall}
          </span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 12,
            color: "#8a7a5a",
            marginBottom: mode ? 6 : 0,
            marginLeft: 46,
          }}
        >
          <span>
            <CountryFlag country={p.nat} />
          </span>
          <span>•</span>
          <span>🏟️ {p.club}</span>
        </div>
        {mode === "own" && !isStar && (
          <div
            style={{
              display: "flex",
              gap: 6,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <span
              style={{
                color: "#c0392b",
                fontSize: 11,
                fontWeight: 700,
                marginRight: "auto",
              }}
            >
              Cláusula: {fmtM(clauseTotal)}
              {p.listedForSale && (
                <span style={{ color: "#27ae60" }}> · en venta</span>
              )}
            </span>
            <button
              onClick={() =>
                toggleListForSale(teamName, p.id, !p.listedForSale)
              }
              style={{
                background: "transparent",
                border: "1px solid #c9a227",
                color: "#e8c252",
                borderRadius: 6,
                padding: "4px 10px",
                cursor: "pointer",
                fontSize: 12,
              }}
            >
              {p.listedForSale ? "Quitar del mercado" : "Poner en venta"}
            </button>
            <button
              onClick={() => setDiscardConfirm({ teamName, player: p })}
              style={{
                background: "transparent",
                border: "1px solid #f0c040",
                color: "#f0c040",
                borderRadius: 6,
                padding: "4px 10px",
                cursor: "pointer",
                fontSize: 12,
              }}
            >
              Descartar
            </button>
            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
              <input
                type="number"
                min="0.5"
                step="0.5"
                placeholder="M€"
                value={clauseInvestInput[p.id] || ""}
                onChange={(e) =>
                  setClauseInvestInput((prev) => ({
                    ...prev,
                    [p.id]: e.target.value,
                  }))
                }
                style={{
                  ...input,
                  width: 60,
                  padding: "4px 6px",
                  fontSize: 11,
                }}
              />
              <button
                onClick={() => investInClause(teamName, p.id)}
                style={{
                  background: "#c9a227",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  padding: "4px 8px",
                  cursor: "pointer",
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                ↑Cláusula
              </button>
            </div>
          </div>
        )}
        {mode === "other" &&
          !isStar &&
          (() => {
            const locked = isClauseLocked(p);
            const hoursLeft = locked
              ? Math.ceil(clauseLockRemainingMs(p) / (60 * 60 * 1000))
              : 0;
            return (
              <div
                style={{
                  display: "flex",
                  gap: 6,
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    color: locked ? "#8a7a5a" : "#c0392b",
                    fontSize: 11,
                    fontWeight: 700,
                    marginRight: "auto",
                  }}
                >
                  Cláusula:{" "}
                  {locked ? `🔒 bloqueada (~${hoursLeft}h)` : fmtM(clauseTotal)}
                </span>
                <button
                  onClick={() => openOfferModal(teamName, p)}
                  style={{
                    background: "transparent",
                    border: "1px solid #c9a227",
                    color: "#e8c252",
                    borderRadius: 6,
                    padding: "4px 10px",
                    cursor: "pointer",
                    fontSize: 12,
                  }}
                >
                  Ofertar
                </button>
                <button
                  onClick={() =>
                    !locked &&
                    setClauseConfirm({
                      sellerTeam: teamName,
                      player: p,
                      clauseTotal,
                    })
                  }
                  disabled={locked}
                  style={{
                    background: "transparent",
                    border: `1px solid ${locked ? "#3a5a7a" : "#c0392b"}`,
                    color: locked ? "#3a5a7a" : "#c0392b",
                    borderRadius: 6,
                    padding: "4px 10px",
                    cursor: locked ? "not-allowed" : "pointer",
                    fontSize: 12,
                  }}
                >
                  Pagar cláusula
                </button>
              </div>
            );
          })()}
      </div>
    );
  };

  function SortablePlayerRow({ p, teamName, mode, ...rest }) {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: p.id });
    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
      background: isDragging ? "#0f2138" : "transparent",
    };
    return (
      <div ref={setNodeRef} style={style} {...attributes}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <div
            {...listeners}
            style={{
              padding: "10px 8px 10px 0",
              cursor: "grab",
              color: "#3a5a7a",
              touchAction: "none",
            }}
          >
            ⠿
          </div>
          <div style={{ flex: 1 }}>
            <PlayerRow p={p} teamName={teamName} mode={mode} {...rest} />
          </div>
        </div>
      </div>
    );
  }

  function SquadDndList({ teamName, squad, onReorder }) {
    const sensors = useSensors(
      useSensor(PointerSensor),
      useSensor(TouchSensor, {
        activationConstraint: { delay: 150, tolerance: 5 },
      }),
    );
    const handleDragEnd = (event) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = squad.findIndex((p) => p.id === active.id);
      const newIndex = squad.findIndex((p) => p.id === over.id);
      onReorder(teamName, oldIndex, newIndex, squad); // ← pasamos squad (bench) también
    };
    return (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={squad.map((p) => p.id)}
          strategy={verticalListSortingStrategy}
        >
          {squad.map((p) => (
            <SortablePlayerRow
              key={p.id}
              p={p}
              teamName={teamName}
              mode="own"
            />
          ))}
        </SortableContext>
      </DndContext>
    );
  }

  const getCountryCode = (input) => {
    if (!input) return null;

    const normalized = input.toString().trim().toLowerCase();

    if (FOOTBALL_COUNTRY_MAP[normalized]) {
      return FOOTBALL_COUNTRY_MAP[normalized];
    }

    const iso = countries.getAlpha2Code(input.trim(), "en");

    return iso || null;
  };

  const FOOTBALL_COUNTRY_MAP = {
    england: "GB",
    uk: "GB",
    "united kingdom": "GB",
    scotland: "GB",
    wales: "GB",
    "northern ireland": "GB",
    usa: "US",
    "united states": "US",
    "ivory coast": "CI",
    "south korea": "KR",
    "north korea": "KP",
    russia: "RU",
    iran: "IR",
    eng: "GB",
    esp: "ES",
    fra: "FR",
    ger: "DE",
    ita: "IT",
    bra: "BR",
    arg: "AR",
  };

  const CountryFlag = ({ country }) => {
    const code = getCountryCode(country);

    if (!code) return <span>🌍</span>;

    const Key = code.toUpperCase();

    const Component = Flags[Key];

    if (!Component) return <span>🌍</span>;

    return <Component title={country} style={{ width: 16, height: 12 }} />;
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: bg,
        color: "#e8eaf0",
        fontFamily: "'Outfit',system-ui,sans-serif",
        paddingBottom: started ? 78 : 0,
      }}
    >
      {/* ── Top bar ── */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "linear-gradient(135deg,#100d08,#1f1a0c)",
          borderBottom: "1px solid #2e2615",
          padding: "12px 16px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <img
              src={logoImg}
              alt="logo"
              style={{
                width: 26,
                height: 26,
                objectFit: "contain",
                borderRadius: 6,
              }}
            />
            <span style={{ fontWeight: 800, fontSize: 16, color: "#e8c252" }}>
              IPC
            </span>
            {leagueCode && (
              <span style={{ color: "#8a7a5a", fontSize: 11, marginLeft: 4 }}>
                · {leagueCode}
              </span>
            )}
          </div>
          {started && myTeamObj && (
            <div
              style={{
                ...pill(true),
                background: "#1f1a0c",
                color: "#e0ded6",
                cursor: "default",
              }}
            >
              <Crest emoji={myTeamObj?.crestEmoji} size={18} />
              {myTeamName}
            </div>
          )}
          {leagueCode && (
            <button
              onClick={resetAll}
              style={{
                background: "transparent",
                color: "#c0392b",
                border: "1px solid #c0392b",
                borderRadius: 8,
                padding: "6px 10px",
                cursor: "pointer",
                fontWeight: 700,
                fontSize: 12,
              }}
            >
              ↺
            </button>
          )}
        </div>
        {started && myTeamObj && (
          <div
            style={{
              display: "flex",
              gap: 14,
              marginTop: 8,
              fontSize: 12,
              color: "#c9b88a",
            }}
          >
            <span>
              💰{" "}
              <strong style={{ color: "#27ae60" }}>
                {fmtM(myTeamObj.budget)}
              </strong>
            </span>
            <span>
              📋{" "}
              <strong>
                {allPlayersOf(myTeamObj).length}/{MAX_SQUAD}
              </strong>
            </span>
            <span>
              📊{" "}
              <strong style={{ color: "#f0c040" }}>
                {myTeamObj.points} pts
              </strong>
            </span>
          </div>
        )}
      </div>

      <div style={{ maxWidth: 600, margin: "0 auto", padding: "14px 14px" }}>
        {started && (
          <div style={{ marginBottom: 16 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 11,
                color: "#8a7a5a",
                marginBottom: 4,
              }}
            >
              <span>Progreso de la liga</span>
              <span>
                {played.length}/{fixtures.length}
              </span>
            </div>
            <div style={{ background: "#100d08", borderRadius: 4, height: 4 }}>
              <div
                style={{
                  background: "linear-gradient(90deg,#c9a227,#e8c252)",
                  width: `${pct}%`,
                  height: "100%",
                  borderRadius: 4,
                  transition: "width .4s",
                }}
              />
            </div>
            {seasonOver && (
              <div
                style={{
                  marginTop: 10,
                  background: "linear-gradient(135deg,#2e2615,#2a4060)",
                  border: "1px solid #f0c040",
                  borderRadius: 12,
                  padding: "12px 14px",
                }}
              >
                <div
                  style={{
                    color: "#f0c040",
                    fontWeight: 700,
                    fontSize: 13,
                    marginBottom: 8,
                  }}
                >
                  🏆 ¡Temporada terminada!
                </div>
                <button onClick={startNewSeason} style={btn("#8e44ad")}>
                  Repartir premios e iniciar nueva temporada
                </button>
              </div>
            )}
          </div>
        )}

        {/* ══ LOGIN ══ */}
        {view === VIEWS.LOGIN && (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            {authLoading ? (
              <>
                <img
                  src={logoImg}
                  alt="IPC"
                  style={{
                    width: 120,
                    height: 120,
                    objectFit: "contain",
                    marginBottom: 14,
                    borderRadius: 16,
                  }}
                />{" "}
                <p style={{ color: "#8a7a5a", fontSize: 13 }}>
                  Cargando sesión...
                </p>
              </>
            ) : (
              <>
                <div style={{ fontSize: 40, marginBottom: 14 }}>⚽</div>
                <h2
                  style={{
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: 21,
                    marginBottom: 8,
                  }}
                >
                  IPC
                </h2>
                <p style={{ color: "#8a7a5a", fontSize: 14, marginBottom: 24 }}>
                  Inicia sesión para guardar tus ligas y volver a entrar cuando
                  quieras.
                </p>
                {authError && (
                  <div
                    style={{
                      background: "#5a1a1a",
                      border: "1px solid #c0392b",
                      borderRadius: 10,
                      padding: "10px 14px",
                      color: "#fff",
                      fontSize: 13,
                      marginBottom: 16,
                    }}
                  >
                    ⚠️ {authError}
                  </div>
                )}
                <button
                  onClick={handleGoogleSignIn}
                  style={{
                    ...btn("#fff"),
                    color: "#1a1a1a",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                    maxWidth: 280,
                    margin: "0 auto",
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 18 18">
                    <path
                      fill="#4285F4"
                      d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84c-.21 1.13-.85 2.08-1.81 2.72v2.26h2.92c1.71-1.57 2.69-3.88 2.69-6.62z"
                    />
                    <path
                      fill="#34A853"
                      d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.71H.96v2.33C2.44 15.98 5.48 18 9 18z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M3.97 10.71c-.18-.54-.28-1.11-.28-1.71s.1-1.17.28-1.71V4.96H.96A8.99 8.99 0 0 0 0 9c0 1.45.35 2.83.96 4.04l3.01-2.33z"
                    />
                    <path
                      fill="#EA4335"
                      d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0 5.48 0 2.44 2.02.96 4.96l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"
                    />
                  </svg>
                  Continuar con Google
                </button>
              </>
            )}
          </div>
        )}

        {/* ══ MY_LEAGUES (account's saved leagues selector) ══ */}
        {view === VIEWS.MY_LEAGUES && (
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 6,
              }}
            >
              <h2
                style={{
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 21,
                  margin: 0,
                }}
              >
                Tus Ligas
              </h2>
              <button
                onClick={handleSignOut}
                style={{
                  background: "transparent",
                  border: "1px solid #2e2615",
                  color: "#8a7a5a",
                  borderRadius: 8,
                  padding: "5px 10px",
                  cursor: "pointer",
                  fontSize: 12,
                }}
              >
                Salir
              </button>
            </div>
            <p style={{ color: "#8a7a5a", fontSize: 13, marginBottom: 18 }}>
              {userProfile?.displayName}, elige una liga para continuar.
            </p>
            {(userProfile?.leagues || []).map((l) => (
              <div
                key={l.code}
                onClick={async () => {
                  setLeagueCode(l.code);
                  setMyTeamName(l.teamName);
                  await saveDevice({
                    leagueCode: l.code,
                    myTeamName: l.teamName,
                  });
                  setStorageLoaded(false);
                }}
                style={{
                  ...card,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>
                    {l.teamName}
                  </div>
                  <div style={{ color: "#8a7a5a", fontSize: 12 }}>
                    Código: {l.code}
                  </div>
                </div>
                <span style={{ color: "#8a7a5a", fontSize: 18 }}>›</span>
              </div>
            ))}
            <button
              onClick={() => setView(VIEWS.HOME)}
              style={{
                ...btn("transparent"),
                border: "1px solid #2e2615",
                color: "#8a7a5a",
                marginTop: 10,
              }}
            >
              + Unirme a otra liga / Crear una nueva
            </button>
          </div>
        )}

        {/* ══ HOME (create or join a league) ══ */}
        {view === VIEWS.HOME && !deviceLoaded && (
          <div
            style={{
              textAlign: "center",
              padding: "60px 20px",
              color: "#8a7a5a",
            }}
          >
            <div style={{ fontSize: 24, marginBottom: 10 }}>⚽</div>
            <p style={{ fontSize: 13 }}>Cargando...</p>
          </div>
        )}
        {view === VIEWS.HOME && deviceLoaded && (
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 6,
              }}
            >
              <h2
                style={{
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 21,
                  margin: 0,
                }}
              >
                IPC
              </h2>
              {userProfile?.leagues?.length > 0 && (
                <button
                  onClick={() => setView(VIEWS.MY_LEAGUES)}
                  style={{
                    background: "transparent",
                    border: "1px solid #2e2615",
                    color: "#e8c252",
                    borderRadius: 8,
                    padding: "5px 10px",
                    cursor: "pointer",
                    fontSize: 12,
                  }}
                >
                  ← Tus ligas
                </button>
              )}
            </div>
            <p style={{ color: "#8a7a5a", fontSize: 14, marginBottom: 24 }}>
              Crea una liga nueva o únete a una con el código que te hayan
              compartido.
            </p>
            {homeError && (
              <div
                style={{
                  background: "#5a1a1a",
                  border: "1px solid #c0392b",
                  borderRadius: 10,
                  padding: "10px 14px",
                  color: "#fff",
                  fontSize: 13,
                  marginBottom: 16,
                }}
              >
                ⚠️ {homeError}
              </div>
            )}
            <div style={{ ...card, marginBottom: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 10 }}>
                🆕 Crear Liga
              </div>
              <input
                value={leagueNameInput}
                onChange={(e) => setLeagueNameInput(e.target.value)}
                placeholder="Nombre de la liga..."
                style={{ ...input, marginBottom: 10 }}
              />
              <button
                onClick={createLeague}
                style={btn("linear-gradient(135deg,#c9a227,#e8c252)")}
              >
                Crear y ser admin
              </button>
            </div>
            <div style={card}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 10 }}>
                🔑 Unirme a una Liga
              </div>
              <input
                value={joinCodeInput}
                onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                placeholder="Código de liga (ej. AB3X9P)"
                style={{
                  ...input,
                  marginBottom: 10,
                  textTransform: "uppercase",
                }}
                maxLength={6}
              />
              <button onClick={checkJoinCode} style={btn()}>
                Buscar liga
              </button>
            </div>
            <button
              onClick={handleSignOut}
              style={{
                background: "transparent",
                border: "none",
                color: "#8a7a5a",
                cursor: "pointer",
                fontSize: 12,
                marginTop: 16,
                textDecoration: "underline",
              }}
            >
              Cerrar sesión
            </button>
          </div>
        )}

        {/* ══ SETUP (create my own team inside the league) ══ */}
        {view === VIEWS.SETUP && (
          <div>
            <h2
              style={{
                color: "#fff",
                fontWeight: 700,
                fontSize: 21,
                marginBottom: 6,
              }}
            >
              Crea tu equipo
            </h2>
            <p style={{ color: "#8a7a5a", fontSize: 14, marginBottom: 6 }}>
              Código de liga:{" "}
              <strong style={{ color: "#f0c040", letterSpacing: 1 }}>
                {leagueCode}
              </strong>{" "}
              {isAdmin && (
                <span style={{ color: "#27ae60" }}>(eres admin)</span>
              )}
            </p>
            <p style={{ color: "#8a7a5a", fontSize: 13, marginBottom: 18 }}>
              Al crear tu equipo se te asignará automáticamente una estrella
              (86) y una plantilla de 17 jugadores más. Empiezas con{" "}
              <strong style={{ color: "#27ae60" }}>100M€</strong>.
            </p>
            {homeError && (
              <div
                style={{
                  background: "#5a1a1a",
                  border: "1px solid #c0392b",
                  borderRadius: 10,
                  padding: "10px 14px",
                  color: "#fff",
                  fontSize: 13,
                  marginBottom: 16,
                }}
              >
                ⚠️ {homeError}
              </div>
            )}
            {teams.length > 0 && (
              <div style={{ marginBottom: 18 }}>
                <div
                  style={{
                    color: "#c9b88a",
                    fontSize: 12,
                    fontWeight: 700,
                    marginBottom: 8,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  Equipos ya unidos ({teams.length})
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {teams.map((t) => (
                    <div
                      key={t.name}
                      style={{
                        background: "#100d08",
                        border: "1px solid #2e2615",
                        borderRadius: 20,
                        padding: "5px 12px",
                        fontSize: 12,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <Crest emoji={t.crestEmoji} size={16} />
                      {t.name}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <input
                value={newTeamNameInput}
                onChange={(e) => setNewTeamNameInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createMyTeam()}
                placeholder="Nombre de tu equipo..."
                style={input}
              />
              <button
                onClick={createMyTeam}
                style={{
                  ...btn("linear-gradient(135deg,#c9a227,#e8c252)"),
                  width: "auto",
                  padding: "12px 18px",
                }}
              >
                🎲 Crear
              </button>
            </div>
            <button
              onClick={() => setView(VIEWS.HOME)}
              style={{
                ...btn("transparent"),
                border: "1px solid #2e2615",
                color: "#8a7a5a",
              }}
            >
              ← Volver
            </button>
          </div>
        )}

        {/* ══ WAITING ROOM ══ */}
        {view === VIEWS.WAITING && (
          <div>
            <h2
              style={{
                color: "#fff",
                fontWeight: 700,
                fontSize: 21,
                marginBottom: 6,
              }}
            >
              Sala de espera
            </h2>
            <p style={{ color: "#8a7a5a", fontSize: 14, marginBottom: 6 }}>
              Código de liga:{" "}
              <strong style={{ color: "#f0c040", letterSpacing: 1 }}>
                {leagueCode}
              </strong>
            </p>
            <p style={{ color: "#8a7a5a", fontSize: 13, marginBottom: 18 }}>
              Comparte este código con el resto de jugadores.{" "}
              {isAdmin
                ? "Inicia la liga cuando todos los equipos estén listos."
                : "Esperando a que el admin inicie la liga..."}
            </p>

            <div
              style={{
                color: "#c9b88a",
                fontSize: 12,
                fontWeight: 700,
                marginBottom: 8,
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              Equipos ({teams.length})
            </div>
            {teams.map((t, i) => (
              <div
                key={t.name}
                style={{
                  ...card,
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <Crest emoji={t.crestEmoji} size={32} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>
                    {t.name}
                    {t.name === myTeamName && (
                      <span style={{ color: "#27ae60", fontSize: 11 }}>
                        {" "}
                        (tú)
                      </span>
                    )}
                  </div>
                  {t.squad?.star && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        marginTop: 3,
                        flexWrap: "wrap",
                      }}
                    >
                      <span
                        style={{
                          background: posColor(t.squad.star.pos),
                          color: "#fff",
                          borderRadius: 4,
                          padding: "2px 6px",
                          fontSize: 10,
                          fontWeight: 700,
                        }}
                      >
                        {t.squad.star.pos}
                      </span>
                      <span style={{ fontSize: 12, color: "#c9b88a" }}>
                        ⭐ {t.squad.star.name}
                      </span>
                    </div>
                  )}
                </div>
                {t.squad?.star && (
                  <span
                    style={{ fontWeight: 800, color: "#f0c040", fontSize: 18 }}
                  >
                    {t.squad.star.overall}
                  </span>
                )}
              </div>
            ))}

            {isAdmin ? (
              <div style={{ marginTop: 16 }}>
                <button
                  onClick={startTournament}
                  disabled={teams.length < 2}
                  style={{
                    ...btn(
                      teams.length >= 2
                        ? "linear-gradient(135deg,#c9a227,#e8c252)"
                        : "#241e10",
                    ),
                    color: teams.length >= 2 ? "#fff" : "#3a5a7a",
                    cursor: teams.length >= 2 ? "pointer" : "not-allowed",
                  }}
                >
                  🏆 Iniciar Liga ({teams.length} equipos)
                </button>
                {teams.length < 2 && (
                  <p
                    style={{
                      color: "#8a7a5a",
                      fontSize: 11,
                      marginTop: 8,
                      textAlign: "center",
                    }}
                  >
                    Esperando al menos 2 equipos para empezar
                  </p>
                )}
              </div>
            ) : (
              <div
                style={{
                  marginTop: 16,
                  textAlign: "center",
                  color: "#8a7a5a",
                  fontSize: 12,
                }}
              >
                <div style={{ fontSize: 20, marginBottom: 6 }}>⏳</div>
              </div>
            )}
          </div>
        )}

        {/* ══ TABLE ══ */}
        {view === VIEWS.TABLE && (
          <div>
            <h2
              style={{
                color: "#fff",
                fontWeight: 700,
                fontSize: 21,
                marginBottom: 6,
              }}
            >
              Clasificación
            </h2>
            <p style={{ color: "#8a7a5a", fontSize: 12, marginBottom: 14 }}>
              Toca un equipo para ver su plantilla.
            </p>
            {sorted.map((t, i) => (
              <div
                key={t.name}
                onClick={() => {
                  if (t.name === myTeamName) setView(VIEWS.SQUADS);
                  else {
                    setViewingTeam(t.name);
                    setView(VIEWS.SQUADS);
                  }
                }}
                style={{
                  ...card,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  background:
                    i === 0 ? "rgba(39,174,96,0.08)" : card.background,
                  borderColor: t.name === myTeamName ? "#c9a227" : "#2e2615",
                  cursor: "pointer",
                }}
              >
                <span
                  style={{
                    color: i === 0 ? "#27ae60" : "#8a7a5a",
                    fontWeight: 800,
                    fontSize: 15,
                    minWidth: 20,
                  }}
                >
                  {i + 1}
                </span>
                <Crest emoji={t.crestEmoji} size={28} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: 14,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {i === 0 && "🥇 "}
                    {t.name}
                    {t.name === myTeamName && (
                      <span style={{ color: "#27ae60", fontSize: 11 }}>
                        {" "}
                        (tú)
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: "#8a7a5a" }}>
                    {t.played}PJ · {t.won}G {t.drawn}E {t.lost}P · {t.gf}-{t.ga}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div
                    style={{ fontWeight: 800, color: "#f0c040", fontSize: 17 }}
                  >
                    {t.points}
                  </div>
                </div>
              </div>
            ))}
            <div
              style={{
                marginTop: 14,
                fontSize: 11,
                color: "#3a5a7a",
                lineHeight: 1.6,
              }}
            >
              💰 Victoria +{fmtM(PRIZE_WIN)} · Empate +{fmtM(PRIZE_DRAW)} ·
              Derrota +{fmtM(PRIZE_LOSS)} · Gol +{fmtM(PRIZE_GOAL_FOR)} · Gol
              recibido {fmtM(PRIZE_GOAL_AGAINST)}
            </div>
          </div>
        )}

        {/* ══ FIXTURES ══ */}
        {view === VIEWS.FIXTURES && (
          <div>
            <h2
              style={{
                color: "#fff",
                fontWeight: 700,
                fontSize: 21,
                marginBottom: 14,
              }}
            >
              Partidos
            </h2>
            {pending.length > 0 && (
              <div
                style={{
                  color: "#c9b88a",
                  fontSize: 12,
                  fontWeight: 700,
                  marginBottom: 8,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                Pendientes ({pending.length})
              </div>
            )}
            {sortedPending.map((f) => {
              const idx = fixtures.indexOf(f);
              const homeTeam = teams.find((t) => t.name === f.home);
              const awayTeam = teams.find((t) => t.name === f.away);
              const homeIncomplete = hasIncompleteSquad(homeTeam);
              const awayIncomplete = hasIncompleteSquad(awayTeam);
              const blocked = homeIncomplete || awayIncomplete;
              return (
                <div key={idx} style={card}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 10,
                    }}
                  >
                    <Crest emoji={homeTeam?.crestEmoji} size={24} />
                    <span style={{ fontWeight: 700, fontSize: 14, flex: 1 }}>
                      {f.home}
                    </span>
                    <span style={{ color: "#8a7a5a", fontSize: 11 }}>vs</span>
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: 14,
                        flex: 1,
                        textAlign: "right",
                      }}
                    >
                      {f.away}
                    </span>
                    <Crest emoji={awayTeam?.crestEmoji} size={24} />
                  </div>
                  {blocked && (
                    <p
                      style={{
                        color: "#f0c040",
                        fontSize: 11,
                        marginBottom: 8,
                      }}
                    >
                      ⚠️ {homeIncomplete && f.home}
                      {homeIncomplete && awayIncomplete && " y "}
                      {awayIncomplete && f.away} no{" "}
                      {homeIncomplete && awayIncomplete ? "tienen" : "tiene"}{" "}
                      los {MIN_SQUAD_TO_PLAY} jugadores mínimos para jugar.
                    </p>
                  )}
                  <button
                    onClick={() => !blocked && openResult(idx)}
                    disabled={blocked}
                    style={{
                      ...btn(blocked ? "#1a2030" : undefined),
                      color: blocked ? "#4a5a6a" : "#443b03",
                      cursor: blocked ? "not-allowed" : "pointer",
                    }}
                  >
                    {blocked ? "🔒 Bloqueado" : "+ Añadir resultado"}
                  </button>
                </div>
              );
            })}
            {pending.length === 0 && (
              <p
                style={{ color: "#27ae60", fontWeight: 600, marginBottom: 18 }}
              >
                ✅ ¡Todos los partidos jugados!
              </p>
            )}

            {played.length > 0 && (
              <div
                style={{
                  color: "#c9b88a",
                  fontSize: 12,
                  fontWeight: 700,
                  margin: "18px 0 8px",
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                Jugados ({played.length})
              </div>
            )}
            {[...played].reverse().map((f) => {
              const idx = fixtures.indexOf(f);
              return (
                <div key={idx} style={card} onClick={() => openResult(idx)}>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <Crest
                      emoji={teams.find((t) => t.name === f.home)?.crestEmoji}
                      size={22}
                    />
                    <span
                      style={{
                        fontWeight: 600,
                        fontSize: 13,
                        flex: 1,
                        color:
                          f.homeGoals > f.awayGoals ? "#27ae60" : "#e8eaf0",
                      }}
                    >
                      {f.home}
                    </span>
                    <div
                      style={{
                        background: "#0a0805",
                        border: "1px solid #2e2615",
                        borderRadius: 6,
                        padding: "3px 10px",
                        fontWeight: 800,
                        fontSize: 14,
                        color: "#f0c040",
                      }}
                    >
                      {f.homeGoals}-{f.awayGoals}
                    </div>
                    <span
                      style={{
                        fontWeight: 600,
                        fontSize: 13,
                        flex: 1,
                        textAlign: "right",
                        color:
                          f.awayGoals > f.homeGoals ? "#27ae60" : "#e8eaf0",
                      }}
                    >
                      {f.away}
                    </span>
                    <Crest
                      emoji={teams.find((t) => t.name === f.away)?.crestEmoji}
                      size={22}
                    />
                  </div>
                  {(f.scorers?.length > 0 || f.mvp) && (
                    <div
                      style={{
                        marginTop: 8,
                        paddingTop: 8,
                        borderTop: "1px solid #241e10",
                        fontSize: 11,
                        color: "#8a7a5a",
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 8,
                      }}
                    >
                      {f.scorers?.length > 0 && (
                        <span>
                          ⚽{" "}
                          {f.scorers
                            .map((s) => {
                              const t = teams.find((tm) => tm.name === s.team);
                              return allPlayersOf(t).find(
                                (pp) => pp.id === s.playerId,
                              )?.name;
                            })
                            .filter(Boolean)
                            .join(", ")}
                        </span>
                      )}
                      {f.mvp && (
                        <span style={{ color: "#f0c040" }}>
                          🏅{" "}
                          {(() => {
                            for (const t of teams) {
                              const p = allPlayersOf(t).find(
                                (pp) => pp.id === f.mvp,
                              );
                              if (p) return p.name;
                            }
                            return "";
                          })()}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ══ SQUADS ══ */}
        {view === VIEWS.SQUADS &&
          (() => {
            const isOwn = !viewingTeam || viewingTeam === myTeamName;
            const t = isOwn
              ? myTeamObj
              : teams.find((x) => x.name === viewingTeam);
            if (!t?.squad)
              return (
                <p
                  style={{
                    color: "#8a7a5a",
                    fontSize: 13,
                    textAlign: "center",
                    marginTop: 30,
                  }}
                >
                  Sin equipo todavía.
                </p>
              );
            const allP = allPlayersOf(t);
            const lineup = t.lineup || {
              formation: FORMATION_NAMES[0],
              slots: {},
            };
            const placedIds = Object.values(lineup.slots).filter((pid) =>
              allP.some((p) => p.id === pid),
            );

            return (
              <div>
                {!isOwn && (
                  <button
                    onClick={() => {
                      setViewingTeam(null);
                      setView(VIEWS.TABLE);
                    }}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#e8c252",
                      cursor: "pointer",
                      fontSize: 13,
                      marginBottom: 10,
                      padding: 0,
                    }}
                  >
                    ← Volver a clasificación
                  </button>
                )}
                <h2
                  style={{
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: 21,
                    marginBottom: 6,
                  }}
                >
                  {isOwn ? "Tu equipo" : t.name}
                </h2>
                {!isOwn && (
                  <p
                    style={{ color: "#8a7a5a", fontSize: 12, marginBottom: 14 }}
                  >
                    Solo puedes ofertar o pagar la cláusula. Esta plantilla no
                    es tuya.
                  </p>
                )}

                <div style={card}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 14,
                    }}
                  >
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 10 }}
                    >
                      {isOwn ? (
                        <EmojiCrestPicker
                          emoji={t.crestEmoji}
                          size={32}
                          onChange={(emoji) => updateTeamEmoji(t.name, emoji)}
                        />
                      ) : (
                        <Crest emoji={t.crestEmoji} size={32} />
                      )}
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>
                          {t.name}
                        </div>
                        <div style={{ color: "#8a7a5a", fontSize: 11 }}>
                          {allP.length}/{MAX_SQUAD} jugadores
                        </div>
                      </div>
                    </div>
                    <span
                      style={{
                        color: "#27ae60",
                        fontWeight: 700,
                        fontSize: 14,
                      }}
                    >
                      {fmtM(t.budget)}
                    </span>
                  </div>

                  <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                    <button
                      onClick={() => setSquadTab("lineup")}
                      style={{ flex: 1, ...pill(squadTab === "lineup") }}
                    >
                      ⚽ Alineación
                    </button>
                    <button
                      onClick={() => setSquadTab("squad")}
                      style={{ flex: 1, ...pill(squadTab === "squad") }}
                    >
                      👥 Plantilla
                    </button>
                  </div>

                  {squadTab === "lineup" &&
                    (() => {
                      const bench = allP.filter(
                        (p) => !placedIds.includes(p.id),
                      );
                      return (
                        <div>
                          {isOwn && (
                            <div
                              style={{
                                display: "flex",
                                gap: 6,
                                flexWrap: "wrap",
                                marginBottom: 12,
                              }}
                            >
                              {FORMATION_NAMES.map((f) => (
                                <button
                                  key={f}
                                  onClick={() => setLineupFormation(t.name, f)}
                                  style={pill(lineup.formation === f)}
                                >
                                  {f}
                                </button>
                              ))}
                            </div>
                          )}
                          <LineupField
                            team={t}
                            onSlotTap={
                              isOwn
                                ? (slotId) =>
                                    setLineupSlotModal({
                                      teamName: t.name,
                                      slotId,
                                    })
                                : () => {}
                            }
                          />
                          <div
                            style={{
                              color: "#8a7a5a",
                              fontSize: 11,
                              fontWeight: 700,
                              marginBottom: 4,
                            }}
                          >
                            SUPLENTES ({bench.length})
                          </div>
                          {bench.length === 0 && (
                            <p
                              style={{
                                color: "#3a5a7a",
                                fontSize: 12,
                                marginBottom: 8,
                              }}
                            >
                              Todos los jugadores están en el campo.
                            </p>
                          )}
                          {bench.map((p, i) => (
                            <PlayerRow
                              key={i}
                              p={p}
                              teamName={t.name}
                              mode={isOwn ? "own" : "other"}
                            />
                          ))}
                        </div>
                      );
                    })()}

                  {squadTab === "squad" && (
                    <div>
                      {t.squad.star && (
                        <div
                          style={{
                            background: "#0a1520",
                            borderRadius: 10,
                            padding: "10px 12px",
                            marginBottom: 10,
                          }}
                        >
                          <div
                            style={{
                              color: "#f0c040",
                              fontSize: 11,
                              fontWeight: 700,
                              marginBottom: 6,
                            }}
                          >
                            ⭐ ESTRELLA
                          </div>
                          <PlayerRow
                            p={t.squad.star}
                            teamName={t.name}
                            mode={isOwn ? "own" : "other"}
                          />
                        </div>
                      )}
                      <div
                        style={{
                          color: "#8a7a5a",
                          fontSize: 11,
                          fontWeight: 700,
                          marginBottom: 4,
                        }}
                      >
                        PLANTILLA
                      </div>
                      {isOwn ? (
                        <SquadDndList
                          teamName={t.name}
                          squad={t.squad.squad}
                          onReorder={reorderSquad}
                        />
                      ) : (
                        t.squad.squad.map((p, i) => (
                          <PlayerRow
                            key={i}
                            p={p}
                            teamName={t.name}
                            mode="other"
                          />
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

        {/* ══ MARKET ══ */}
        {view === VIEWS.MARKET && (
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginBottom: 4,
              }}
            >
              <h2
                style={{
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 21,
                  margin: 0,
                }}
              >
                🏪 Mercado
              </h2>
              <span
                style={{
                  color: "#f0c040",
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: "monospace",
                }}
              >
                ⏱ {fmtCountdown(marketCountdownMs)}
              </span>
            </div>
            <p style={{ color: "#8a7a5a", fontSize: 12, marginBottom: 14 }}>
              Toca un jugador para pujar. Verás cuántas pujas tiene, pero no
              quién las hizo.
            </p>

            {availableLegends.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div
                  style={{
                    color: "#c0392b",
                    fontSize: 12,
                    fontWeight: 700,
                    marginBottom: 8,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  🏆 Leyendas disponibles ({fmtM(LEGEND_MARKET_PRICE)} cada una)
                </div>

                <div
                  style={{
                    ...card,
                    background: "linear-gradient(135deg,#1a0d10,#15110a)",
                    border: "1px solid #c0392b",
                    textAlign: "center",
                    padding: "20px 16px",
                  }}
                >
                  <div
                    style={{ fontSize: 13, color: "#8a7a5a", marginBottom: 12 }}
                  >
                    {availableLegends.length} leyenda
                    {availableLegends.length !== 1 ? "s" : ""} disponible
                    {availableLegends.length !== 1 ? "s" : ""}
                  </div>
                  <button
                    onClick={() => {
                      const random =
                        availableLegends[
                          Math.floor(Math.random() * availableLegends.length)
                        ];
                      setLegendBuyConfirm(random);
                    }}
                    style={{
                      ...btn("#c0392b"),
                      padding: "10px 20px",
                      fontSize: 13,
                    }}
                  >
                    🎲 Obtener leyenda aleatoria — {fmtM(LEGEND_MARKET_PRICE)}
                  </button>
                </div>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {marketList.map((player) => {
                const myBid = myTeamName
                  ? bids[player.marketId]?.[myTeamName] || 0
                  : 0;
                const totalBids = Object.keys(
                  bids[player.marketId] || {},
                ).length;
                return (
                  <div
                    key={player.marketId}
                    onClick={() => openBidModal(player)}
                    style={{
                      ...card,
                      display: "flex",
                      gap: 12,
                      alignItems: "center",
                      cursor: "pointer",
                    }}
                  >
                    <div
                      style={{
                        background: ratingColor(player.overall),
                        borderRadius: 10,
                        minWidth: 48,
                        height: 48,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 800,
                        fontSize: 19,
                        color: "#000",
                        flexShrink: 0,
                      }}
                    >
                      {player.overall}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          marginBottom: 3,
                        }}
                      >
                        <span
                          style={{
                            background: posColor(player.pos),
                            color: "#fff",
                            borderRadius: 4,
                            padding: "2px 6px",
                            fontSize: 10,
                            fontWeight: 700,
                          }}
                        >
                          {player.pos}
                        </span>
                        <span
                          style={{
                            fontWeight: 700,
                            fontSize: 14,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {player.name}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: "#8a7a5a" }}>
                        {player.club}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          gap: 10,
                          fontSize: 11,
                          marginTop: 4,
                        }}
                      >
                        <span style={{ color: "#f0c040" }}>
                          Min. {fmtM(player.baseValue)}
                        </span>
                        <span style={{ color: "#8a7a5a" }}>
                          👥 {totalBids} {totalBids === 1 ? "puja" : "pujas"}
                        </span>
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      {myBid > 0 ? (
                        <div
                          style={{
                            background: "#1a5f3a",
                            borderRadius: 8,
                            padding: "6px 10px",
                          }}
                        >
                          <div style={{ fontSize: 10, color: "#8fd9a8" }}>
                            Tu puja
                          </div>
                          <div
                            style={{
                              fontWeight: 700,
                              color: "#27ae60",
                              fontSize: 14,
                            }}
                          >
                            {fmtM(myBid)}
                          </div>
                        </div>
                      ) : (
                        <span style={{ fontSize: 20, color: "#8a7a5a" }}>
                          ›
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {isAdmin && (
              <button
                onClick={resolveAuctions}
                style={{
                  ...btn("#8e44ad"),
                  marginTop: 16,
                  fontSize: 13,
                  padding: "10px",
                }}
              >
                ⚡ Forzar resolución del mercado
              </button>
            )}

            {(() => {
              const listedPlayers = teams.flatMap((t) =>
                allPlayersOf(t)
                  .filter((p) => p.listedForSale)
                  .map((p) => ({ ...p, ownerTeam: t.name })),
              );
              if (listedPlayers.length === 0) return null;
              return (
                <div style={{ marginTop: 24 }}>
                  <h3
                    style={{
                      color: "#fff",
                      fontWeight: 700,
                      fontSize: 15,
                      marginBottom: 6,
                    }}
                  >
                    🔄 En venta por otros equipos
                  </h3>
                  <p
                    style={{ color: "#8a7a5a", fontSize: 12, marginBottom: 10 }}
                  >
                    Haz una oferta; el equipo propietario decide si la acepta.
                  </p>
                  {listedPlayers.map((p, i) => (
                    <div
                      key={i}
                      style={{
                        ...card,
                        display: "flex",
                        gap: 12,
                        alignItems: "center",
                      }}
                    >
                      <div
                        style={{
                          background: ratingColor(p.overall),
                          borderRadius: 10,
                          minWidth: 42,
                          height: 42,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 800,
                          fontSize: 16,
                          color: "#000",
                          flexShrink: 0,
                        }}
                      >
                        {p.overall}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <span
                            style={{
                              background: posColor(p.pos),
                              color: "#fff",
                              borderRadius: 4,
                              padding: "2px 6px",
                              fontSize: 10,
                              fontWeight: 700,
                            }}
                          >
                            {p.pos}
                          </span>
                          <span style={{ fontWeight: 700, fontSize: 14 }}>
                            {p.name}
                          </span>
                        </div>
                        <div style={{ fontSize: 11, color: "#8a7a5a" }}>
                          de {p.ownerTeam}
                        </div>
                      </div>
                      <div>
                        {p.ownerTeam !== myTeamName && (
                          <button
                            onClick={() => openOfferModal(p.ownerTeam, p)}
                            style={btn("#c9a227")}
                          >
                            Ofertar
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}

            {marketHistory.length > 0 && (
              <div style={{ marginTop: 24 }}>
                <h3
                  style={{
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: 15,
                    marginBottom: 10,
                  }}
                >
                  📜 Fichajes recientes
                </h3>
                {[...marketHistory]
                  .reverse()
                  .slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)
                  .map((h, i) => (
                    <div
                      key={i}
                      style={{
                        ...card,
                        padding: "10px 14px",
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <span
                        style={{
                          background: ratingColor(h.overall),
                          borderRadius: 6,
                          minWidth: 30,
                          height: 30,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 800,
                          fontSize: 12,
                          color: "#000",
                        }}
                      >
                        {h.overall}
                      </span>
                      <span style={{ fontWeight: 600, flex: 1, fontSize: 13 }}>
                        {h.player}
                      </span>
                      <span
                        style={{
                          color: "#27ae60",
                          fontWeight: 700,
                          fontSize: 12,
                        }}
                      >
                        {h.winner}
                      </span>
                      <span
                        style={{
                          color: "#f0c040",
                          fontWeight: 700,
                          fontSize: 12,
                        }}
                      >
                        {fmtM(h.amount)}
                      </span>
                    </div>
                  ))}

                <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                  <button
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Anterior
                  </button>

                  <span>
                    Página {page} de {totalPages}
                  </span>

                  <button
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ TRANSFERS (notifications + offers + history) ══ */}
        {view === VIEWS.TRANSFERS &&
          (() => {
            const incomingOffers = offers.filter(
              (o) => o.toTeam === myTeamName && o.status === "pending",
            );
            const outgoingOffers = offers.filter(
              (o) => o.fromTeam === myTeamName && o.status === "pending",
            );
            const resolvedOffers = offers
              .filter(
                (o) =>
                  (o.fromTeam === myTeamName || o.toTeam === myTeamName) &&
                  o.status !== "pending",
              )
              .sort((a, b) => b.createdAt - a.createdAt)
              .slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
            return (
              <div>
                <h2
                  style={{
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: 21,
                    marginBottom: 14,
                  }}
                >
                  🔄 Traspasos
                </h2>

                {incomingOffers.length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    <div
                      style={{
                        color: "#f0c040",
                        fontSize: 12,
                        fontWeight: 700,
                        marginBottom: 8,
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                      }}
                    >
                      Ofertas recibidas ({incomingOffers.length})
                    </div>
                    {incomingOffers.map((o) => (
                      <div
                        key={o.offerId}
                        style={{
                          ...card,
                          display: "flex",
                          gap: 10,
                          alignItems: "center",
                        }}
                      >
                        <div
                          style={{
                            background: ratingColor(o.player.overall),
                            borderRadius: 8,
                            minWidth: 42,
                            height: 42,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 800,
                            fontSize: 16,
                            color: "#000",
                          }}
                        >
                          {o.player.overall}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>
                            {o.player.name}
                          </div>
                          <div style={{ fontSize: 11, color: "#8a7a5a" }}>
                            {o.fromTeam} ofrece{" "}
                            <span style={{ color: "#27ae60", fontWeight: 700 }}>
                              {fmtM(o.amount)}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => acceptOffer(o)}
                          style={{
                            ...btn("#27ae60"),
                            width: "auto",
                            padding: "7px 12px",
                            fontSize: 12,
                          }}
                        >
                          Aceptar
                        </button>
                        <button
                          onClick={() => rejectOffer(o)}
                          style={{
                            ...btn("transparent"),
                            width: "auto",
                            border: "1px solid #c0392b",
                            color: "#c0392b",
                            padding: "7px 12px",
                            fontSize: 12,
                          }}
                        >
                          Rechazar
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {outgoingOffers.length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    <div
                      style={{
                        color: "#c9b88a",
                        fontSize: 12,
                        fontWeight: 700,
                        marginBottom: 8,
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                      }}
                    >
                      Tus ofertas pendientes ({outgoingOffers.length})
                    </div>
                    {outgoingOffers.map((o) => (
                      <div
                        key={o.offerId}
                        style={{
                          ...card,
                          display: "flex",
                          gap: 10,
                          alignItems: "flex-start",
                        }}
                      >
                        <div
                          style={{
                            background: ratingColor(o.player.overall),
                            borderRadius: 8,
                            minWidth: 42,
                            height: 42,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 800,
                            fontSize: 16,
                            color: "#000",
                          }}
                        >
                          {o.player.overall}
                        </div>

                        <div
                          style={{
                            flex: 1,
                            display: "flex",
                            flexDirection: "column",
                            gap: 8,
                            minWidth: 0,
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 14 }}>
                              {o.player.name}
                            </div>

                            <div style={{ fontSize: 11, color: "#8a7a5a" }}>
                              A {o.toTeam} · ofreciste{" "}
                              <span
                                style={{ color: "#f0c040", fontWeight: 700 }}
                              >
                                {fmtM(o.amount)}
                              </span>
                            </div>
                          </div>

                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              flexWrap: "wrap",
                              gap: 8,
                            }}
                          >
                            <span
                              style={{
                                color: "#8a7a5a",
                                fontSize: 11,
                                fontStyle: "italic",
                              }}
                            >
                              Esperando respuesta...
                            </span>

                            <button
                              onClick={() => cancelOffer(o)}
                              style={{
                                ...btn("#b95a1b"),
                                width: "auto",
                                padding: "6px 12px",
                                fontSize: 12,
                              }}
                            >
                              Cancelar oferta
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div
                  style={{
                    color: "#c9b88a",
                    fontSize: 12,
                    fontWeight: 700,
                    marginBottom: 8,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  🔔 Notificaciones
                </div>
                {notifications.length === 0 ? (
                  <p
                    style={{ color: "#8a7a5a", fontSize: 13, marginBottom: 20 }}
                  >
                    Sin notificaciones todavía.
                  </p>
                ) : (
                  <>
                    {visibleNotifications.map((n) => (
                      <div key={n.id} style={{ ...card, padding: "10px 14px" }}>
                        <div style={{ fontSize: 13 }}>{n.text}</div>
                        <div
                          style={{
                            fontSize: 10,
                            color: "#8a7a5a",
                            marginTop: 4,
                          }}
                        >
                          {new Date(n.createdAt).toLocaleString()}
                        </div>
                      </div>
                    ))}

                    <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                      <button
                        disabled={page === 1}
                        onClick={() => setPage((p) => p - 1)}
                      >
                        Anterior
                      </button>

                      <span>
                        Página {page} de {totalPages}
                      </span>

                      <button
                        disabled={page === totalPages}
                        onClick={() => setPage((p) => p + 1)}
                      >
                        Siguiente
                      </button>
                    </div>
                  </>
                )}

                {resolvedOffers.length > 0 && (
                  <div style={{ marginTop: 20 }}>
                    <div
                      style={{
                        color: "#c9b88a",
                        fontSize: 12,
                        fontWeight: 700,
                        marginBottom: 8,
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                      }}
                    >
                      Historial de ofertas
                    </div>
                    {resolvedOffers.map((o) => (
                      <div
                        key={o.offerId}
                        style={{
                          ...card,
                          padding: "10px 14px",
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <span
                          style={{
                            background: ratingColor(o.player.overall),
                            borderRadius: 6,
                            minWidth: 30,
                            height: 30,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 800,
                            fontSize: 12,
                            color: "#000",
                          }}
                        >
                          {o.player.overall}
                        </span>
                        <span
                          style={{ fontWeight: 600, flex: 1, fontSize: 13 }}
                        >
                          {o.player.name}
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            color:
                              o.status === "accepted" ? "#27ae60" : "#c0392b",
                            fontWeight: 700,
                          }}
                        >
                          {o.status === "accepted" ? "Aceptada" : "Rechazada"}
                        </span>
                        <span
                          style={{
                            color: "#f0c040",
                            fontWeight: 700,
                            fontSize: 12,
                          }}
                        >
                          {fmtM(o.amount)}
                        </span>
                      </div>
                    ))}

                    <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                      <button
                        disabled={page === 1}
                        onClick={() => setPage((p) => p - 1)}
                      >
                        Anterior
                      </button>

                      <span>
                        Página {page} de {totalPages}
                      </span>

                      <button
                        disabled={page === totalPages}
                        onClick={() => setPage((p) => p + 1)}
                      >
                        Siguiente
                      </button>
                    </div>
                  </div>
                )}

                {marketHistory.length > 0 && (
                  <div style={{ marginTop: 20 }}>
                    <div
                      style={{
                        color: "#c9b88a",
                        fontSize: 12,
                        fontWeight: 700,
                        marginBottom: 8,
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                      }}
                    >
                      Fichajes del mercado diario
                    </div>
                    {[...marketHistory]
                      .reverse()
                      .slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)
                      .map((h, i) => (
                        <div
                          key={i}
                          style={{
                            ...card,
                            padding: "10px 14px",
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                          }}
                        >
                          <span
                            style={{
                              background: ratingColor(h.overall),
                              borderRadius: 6,
                              minWidth: 30,
                              height: 30,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: 800,
                              fontSize: 12,
                              color: "#000",
                            }}
                          >
                            {h.overall}
                          </span>
                          <span
                            style={{ fontWeight: 600, flex: 1, fontSize: 13 }}
                          >
                            {h.player}
                          </span>
                          <span
                            style={{
                              color: "#27ae60",
                              fontWeight: 700,
                              fontSize: 12,
                            }}
                          >
                            {h.winner}
                          </span>
                          <span
                            style={{
                              color: "#f0c040",
                              fontWeight: 700,
                              fontSize: 12,
                            }}
                          >
                            {fmtM(h.amount)}
                          </span>
                        </div>
                      ))}

                    <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                      <button
                        disabled={page === 1}
                        onClick={() => setPage((p) => p - 1)}
                      >
                        Anterior
                      </button>

                      <span>
                        Página {page} de {totalPages}
                      </span>

                      <button
                        disabled={page === totalPages}
                        onClick={() => setPage((p) => p + 1)}
                      >
                        Siguiente
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

        {/* ══ STATS ══ */}
        {view === VIEWS.STATS && (
          <div>
            <h2
              style={{
                color: "#fff",
                fontWeight: 700,
                fontSize: 21,
                marginBottom: 14,
              }}
            >
              📊 Estadísticas
            </h2>
            <StatBlock
              title="⚽ Máximos Goleadores"
              data={topScorers}
              field="goals"
              color="#c0392b"
            />
            <StatBlock
              title="🅰️ Máximos Asistentes"
              data={topAssists}
              field="assists"
              color="#27ae60"
            />
            <StatBlock
              title="🏅 Más MVPs"
              data={topMvps}
              field="mvps"
              color="#f0c040"
            />
            <div
              style={{
                background: "#15110a",
                border: "1px solid #2e2615",
                borderRadius: 14,
                padding: "14px 16px",
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 14,
                  marginBottom: 10,
                }}
              >
                🧤 Trofeo Zamora
              </div>
              {zamoraRanking.length === 0 ? (
                <p style={{ color: "#8a7a5a", fontSize: 13 }}>Sin datos aún.</p>
              ) : (
                zamoraRanking.map((z, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "7px 0",
                      borderBottom: "1px solid #241e10",
                    }}
                  >
                    <span
                      style={{
                        color: i === 0 ? "#e8c252" : "#8a7a5a",
                        fontWeight: 800,
                        minWidth: 18,
                        fontSize: 13,
                      }}
                    >
                      {i + 1}
                    </span>
                    <span style={{ fontWeight: 600, flex: 1, fontSize: 13 }}>
                      {z.keeper.name}
                    </span>
                    <span style={{ color: "#8a7a5a", fontSize: 11 }}>
                      {z.teamName}
                    </span>
                    <span
                      style={{
                        fontWeight: 800,
                        color: "#e8c252",
                        fontSize: 15,
                        minWidth: 50,
                        textAlign: "right",
                      }}
                    >
                      {z.ga} encajados
                    </span>
                  </div>
                ))
              )}
            </div>
            <p
              style={{
                marginTop: 14,
                fontSize: 11,
                color: "#3a5a7a",
                lineHeight: 1.6,
              }}
            >
              🏆 Fin de temporada: 1º {fmtM(finalRankingPrize(0))} · 2º{" "}
              {fmtM(finalRankingPrize(1))} · 3º {fmtM(finalRankingPrize(2))}{" "}
              (cada puesto -30%) · Máx. goleador +{fmtM(SEASON_PRIZE_TOPSCORER)}{" "}
              · Máx. asistente +{fmtM(SEASON_PRIZE_TOPASSIST)} · Mejor jugador +
              {fmtM(SEASON_PRIZE_MVP)} · Zamora +{fmtM(SEASON_PRIZE_ZAMORA)}
            </p>
          </div>
        )}

        {/* ══ TOURNAMENT ══ */}
        {view === VIEWS.TOURNAMENT && (
          <div>
            <h2
              style={{
                color: "#fff",
                fontWeight: 700,
                fontSize: 21,
                marginBottom: 6,
              }}
            >
              🏅 Torneo
            </h2>
            <p style={{ color: "#8a7a5a", fontSize: 12, marginBottom: 16 }}>
              Eliminatoria directa (solo ida), independiente de la liga regular.
              No afecta presupuesto ni estadísticas.
            </p>

            {!tournamentBracket && (
              <div style={{ textAlign: "center", padding: "30px 20px" }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>🏅</div>
                <p style={{ color: "#8a7a5a", fontSize: 13, marginBottom: 16 }}>
                  Todavía no se ha sorteado ningún torneo.
                </p>
                {isAdmin ? (
                  <button
                    onClick={drawTournament}
                    style={btn("linear-gradient(135deg,#c9a227,#e8c252)")}
                  >
                    🎲 Sortear Torneo
                  </button>
                ) : (
                  <p style={{ color: "#8a7a5a", fontSize: 12 }}>
                    Solo el admin puede sortear el torneo.
                  </p>
                )}
              </div>
            )}

            {tournamentBracket &&
              (() => {
                const totalRounds = tournamentBracket.length;
                const roundName = (idx) => {
                  const remaining = totalRounds - idx;
                  if (remaining === 1) return "Final";
                  if (remaining === 2) return "Semifinal";
                  if (remaining === 3) return "Cuartos";
                  if (remaining === 4) return "Octavos";
                  return `Ronda ${idx + 1}`;
                };
                const finalMatch = tournamentBracket[totalRounds - 1][0];
                const champion = finalMatch?.winner;
                return (
                  <div>
                    {champion && (
                      <div
                        style={{
                          background: "linear-gradient(135deg,#2e2615,#2a4060)",
                          border: "1px solid #f0c040",
                          borderRadius: 12,
                          padding: "14px 16px",
                          marginBottom: 16,
                          textAlign: "center",
                        }}
                      >
                        <div style={{ fontSize: 24, marginBottom: 6 }}>🏆</div>
                        <div
                          style={{
                            color: "#f0c040",
                            fontWeight: 800,
                            fontSize: 16,
                            marginBottom: championPrize?.claimed ? 0 : 14,
                          }}
                        >
                          {champion} es el campeón
                        </div>

                        {!championPrize && (
                          <div>
                            <p
                              style={{
                                color: "#c9b88a",
                                fontSize: 12,
                                marginBottom: 10,
                              }}
                            >
                              Elige el premio:
                            </p>
                            <div
                              style={{
                                display: "flex",
                                gap: 8,
                                flexWrap: "wrap",
                                justifyContent: "center",
                              }}
                            >
                              <button
                                onClick={() => claimMoneyPrize(champion)}
                                style={{ ...btn("#27ae60"), fontSize: 13 }}
                              >
                                💰 {fmtM(TOURNAMENT_PRIZE_MONEY)}
                              </button>
                              <button
                                onClick={startPlayerPick}
                                style={{ ...btn("#8e44ad"), fontSize: 13 }}
                              >
                                🎴 Player Pick
                              </button>
                              <button
                                onClick={startLegendPick}
                                style={{ ...btn("#c0392b"), fontSize: 13 }}
                              >
                                🏆 Leyenda
                              </button>
                            </div>
                          </div>
                        )}

                        {championPrize?.type === "money" &&
                          championPrize.claimed && (
                            <p
                              style={{
                                color: "#27ae60",
                                fontWeight: 700,
                                fontSize: 14,
                              }}
                            >
                              💰 Premio cobrado: {fmtM(TOURNAMENT_PRIZE_MONEY)}
                            </p>
                          )}

                        {(championPrize?.type === "playerpick" ||
                          championPrize?.type === "legendpick") &&
                          !championPrize.claimed && (
                            <div>
                              <p
                                style={{
                                  color: "#c9b88a",
                                  fontSize: 12,
                                  marginBottom: 12,
                                }}
                              >
                                {championPrize.cards.length > 1
                                  ? "Toca una carta para revelarla, luego selecciónala y confirma."
                                  : "Toca la carta para revelar tu leyenda y confirma."}
                              </p>
                              <div
                                style={{
                                  display: "flex",
                                  gap: 10,
                                  justifyContent: "center",
                                  marginBottom: 14,
                                }}
                              >
                                {championPrize.cards.map((p, idx) => {
                                  const isRevealed =
                                    championPrize.revealed[idx];
                                  const isSelected =
                                    championPrize.selectedIdx === idx;
                                  return (
                                    <div
                                      key={idx}
                                      onClick={() =>
                                        isRevealed
                                          ? selectCard(idx)
                                          : revealCard(idx)
                                      }
                                      style={{
                                        width: 90,
                                        height: 130,
                                        borderRadius: 10,
                                        cursor: "pointer",
                                        background: isRevealed
                                          ? "#15110a"
                                          : championPrize.type === "legendpick"
                                            ? "linear-gradient(135deg,#c0392b,#15110a)"
                                            : "linear-gradient(135deg,#c9a227,#15110a)",
                                        border: isSelected
                                          ? "2px solid #f0c040"
                                          : "1px solid #2e2615",
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        padding: 8,
                                        transition: "transform 0.15s",
                                        transform: isSelected
                                          ? "scale(1.05)"
                                          : "scale(1)",
                                      }}
                                    >
                                      {!isRevealed ? (
                                        <>
                                          <span style={{ fontSize: 28 }}>
                                            {championPrize.type === "legendpick"
                                              ? "🏆"
                                              : "🎴"}
                                          </span>
                                          <span
                                            style={{
                                              fontSize: 10,
                                              color: "#c9b88a",
                                              marginTop: 6,
                                            }}
                                          >
                                            Toca para revelar
                                          </span>
                                        </>
                                      ) : (
                                        <>
                                          <span
                                            style={{
                                              background: posColor(p.pos),
                                              color: "#fff",
                                              borderRadius: 4,
                                              padding: "2px 6px",
                                              fontSize: 10,
                                              fontWeight: 700,
                                              marginBottom: 6,
                                            }}
                                          >
                                            {p.pos}
                                          </span>
                                          <span
                                            style={{
                                              fontWeight: 700,
                                              fontSize: 12,
                                              textAlign: "center",
                                              lineHeight: 1.2,
                                              marginBottom: 4,
                                            }}
                                          >
                                            {p.name}
                                          </span>
                                          <span
                                            style={{
                                              fontWeight: 800,
                                              color: ratingColor(p.overall),
                                              fontSize: 18,
                                            }}
                                          >
                                            {p.overall}
                                          </span>
                                          {isSelected && (
                                            <span
                                              style={{
                                                color: "#f0c040",
                                                fontSize: 10,
                                                marginTop: 4,
                                              }}
                                            >
                                              ✓ Elegido
                                            </span>
                                          )}
                                        </>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                              {championPrize.selectedIdx !== null && (
                                <button
                                  onClick={() => confirmPlayerPick(champion)}
                                  style={{
                                    ...btn(
                                      "linear-gradient(135deg,#c9a227,#e8c252)",
                                    ),
                                    fontSize: 13,
                                  }}
                                >
                                  Confirmar selección
                                </button>
                              )}
                            </div>
                          )}

                        {(championPrize?.type === "playerpick" ||
                          championPrize?.type === "legendpick") &&
                          championPrize.claimed && (
                            <p
                              style={{
                                color: "#27ae60",
                                fontWeight: 700,
                                fontSize: 14,
                              }}
                            >
                              {championPrize.type === "legendpick"
                                ? "🏆"
                                : "🎴"}{" "}
                              {
                                championPrize.cards[championPrize.selectedIdx]
                                  .name
                              }{" "}
                              se unió al equipo
                            </p>
                          )}
                      </div>
                    )}
                    <div
                      style={{
                        display: "flex",
                        gap: 14,
                        overflowX: "auto",
                        paddingBottom: 10,
                      }}
                    >
                      {tournamentBracket.map((round, ri) => (
                        <div
                          key={ri}
                          style={{
                            minWidth: 170,
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-around",
                            gap: Math.max(10, 16 * (ri + 1)),
                          }}
                        >
                          <div
                            style={{
                              color: "#c9b88a",
                              fontSize: 11,
                              fontWeight: 700,
                              textAlign: "center",
                              marginBottom: 4,
                              textTransform: "uppercase",
                              letterSpacing: 0.5,
                            }}
                          >
                            {roundName(ri)}
                          </div>
                          {round.map((m, mi) => {
                            const t1 = teams.find((t) => t.name === m.home);
                            const t2 = teams.find((t) => t.name === m.away);
                            const isBye = m.home === null || m.away === null;
                            const squadsBlocked =
                              !isBye &&
                              (hasIncompleteSquad(t1) ||
                                hasIncompleteSquad(t2));
                            const clickable =
                              !isBye && m.home && m.away && !squadsBlocked;
                            return (
                              <div
                                key={m.id}
                                onClick={() => {
                                  if (clickable) openTournamentResult(ri, mi);
                                }}
                                style={{
                                  background: "#15110a",
                                  border: `1px solid ${m.winner ? "#27ae60" : "#2e2615"}`,
                                  borderRadius: 10,
                                  padding: "8px 10px",
                                  cursor: clickable ? "pointer" : "default",
                                  opacity: squadsBlocked && !m.played ? 0.6 : 1,
                                }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 6,
                                    marginBottom: 4,
                                    opacity:
                                      m.winner && m.winner !== m.home
                                        ? 0.45
                                        : 1,
                                  }}
                                >
                                  <Crest emoji={t1?.crestEmoji} size={16} />
                                  <span
                                    style={{
                                      fontSize: 12,
                                      fontWeight:
                                        m.winner === m.home ? 700 : 500,
                                      flex: 1,
                                      whiteSpace: "nowrap",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                    }}
                                  >
                                    {m.home || "BYE"}
                                  </span>
                                  {m.played && (
                                    <span
                                      style={{
                                        fontSize: 12,
                                        fontWeight: 700,
                                        color: "#f0c040",
                                      }}
                                    >
                                      {m.homeGoals}
                                    </span>
                                  )}
                                </div>
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 6,
                                    opacity:
                                      m.winner && m.winner !== m.away
                                        ? 0.45
                                        : 1,
                                  }}
                                >
                                  <Crest emoji={t2?.crestEmoji} size={16} />
                                  <span
                                    style={{
                                      fontSize: 12,
                                      fontWeight:
                                        m.winner === m.away ? 700 : 500,
                                      flex: 1,
                                      whiteSpace: "nowrap",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                    }}
                                  >
                                    {m.away || (isBye ? "" : "?")}
                                  </span>
                                  {m.played && (
                                    <span
                                      style={{
                                        fontSize: 12,
                                        fontWeight: 700,
                                        color: "#f0c040",
                                      }}
                                    >
                                      {m.awayGoals}
                                    </span>
                                  )}
                                </div>
                                {isBye && (
                                  <div
                                    style={{
                                      fontSize: 10,
                                      color: "#8a7a5a",
                                      textAlign: "center",
                                      marginTop: 4,
                                    }}
                                  >
                                    bye
                                  </div>
                                )}
                                {squadsBlocked && !m.played && (
                                  <div
                                    style={{
                                      fontSize: 9,
                                      color: "#f0c040",
                                      textAlign: "center",
                                      marginTop: 4,
                                    }}
                                  >
                                    🔒
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                    {isAdmin && (
                      <button
                        onClick={drawTournament}
                        style={{
                          ...btn("transparent"),
                          border: "1px solid #c0392b",
                          color: "#c0392b",
                          marginTop: 16,
                          fontSize: 12,
                          padding: "9px",
                        }}
                      >
                        🔄 Volver a sortear (reinicia el torneo)
                      </button>
                    )}
                  </div>
                );
              })()}
          </div>
        )}
      </div>

      {/* ── Bottom navigation ── */}
      {started && (
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            background: "#100d08",
            borderTop: "1px solid #2e2615",
            display: "flex",
            zIndex: 60,
            paddingBottom: "env(safe-area-inset-bottom, 0px)",
          }}
        >
          {NAV_ITEMS.map((item) => (
            <button
              key={item.v}
              onClick={() => {
                if (item.v === VIEWS.SQUADS) setViewingTeam(null);
                setView(item.v);
                if (item.v === VIEWS.MARKET) checkAndRefreshMarket();
              }}
              style={{
                flex: 1,
                background: "none",
                border: "none",
                padding: "9px 4px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
                cursor: "pointer",
                color: view === item.v ? "#1a9fe0" : "#8a7a5a",
              }}
            >
              <span style={{ fontSize: 19, position: "relative" }}>
                {item.icon}
                {item.v === VIEWS.TRANSFERS &&
                  pendingIncomingOffersCount > 0 && (
                    <span
                      style={{
                        position: "absolute",
                        top: -4,
                        right: -8,
                        background: "#c0392b",
                        color: "#fff",
                        borderRadius: "50%",
                        minWidth: 15,
                        height: 15,
                        fontSize: 9,
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "0 3px",
                        lineHeight: 1,
                      }}
                    >
                      {pendingIncomingOffersCount > 9
                        ? "9+"
                        : pendingIncomingOffersCount}
                    </span>
                  )}
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: view === item.v ? 700 : 500,
                }}
              >
                {item.label}
              </span>
            </button>
          ))}
          <button
            onClick={() => setView(VIEWS.TOURNAMENT)}
            style={{
              flex: 1,
              background: "none",
              border: "none",
              padding: "9px 4px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
              cursor: "pointer",
              color: view === VIEWS.TOURNAMENT ? "#1a9fe0" : "#8a7a5a",
            }}
          >
            <span style={{ fontSize: 19 }}>🏅</span>
            <span
              style={{
                fontSize: 10,
                fontWeight: view === VIEWS.TOURNAMENT ? 700 : 500,
              }}
            >
              Torneo
            </span>
          </button>
          <button
            onClick={() => setView(VIEWS.STATS)}
            style={{
              flex: 1,
              background: "none",
              border: "none",
              padding: "9px 4px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
              cursor: "pointer",
              color: view === VIEWS.STATS ? "#1a9fe0" : "#8a7a5a",
            }}
          >
            <span style={{ fontSize: 19 }}>📊</span>
            <span
              style={{
                fontSize: 10,
                fontWeight: view === VIEWS.STATS ? 700 : 500,
              }}
            >
              Stats
            </span>
          </button>
        </div>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: started ? 92 : 20,
            left: 16,
            right: 16,
            zIndex: 300,
            display: "flex",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: toast.type === "success" ? "#1a5f3a" : "#5a1a1a",
              border: `1px solid ${toast.type === "success" ? "#27ae60" : "#c0392b"}`,
              borderRadius: 10,
              padding: "10px 18px",
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              maxWidth: 380,
              textAlign: "center",
              boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            }}
          >
            {toast.type === "success" ? "✅ " : "⚠️ "}
            {toast.text}
          </div>
        </div>
      )}

      {/* ── Bid Modal (simplified) ── */}
      {bidModal &&
        (() => {
          const player = bidModal;
          const myBid = bids[player.marketId]?.[myTeamName] || 0;
          const totalBids = Object.keys(bids[player.marketId] || {}).length;
          const available = getAvailableBudget(myTeamName, player.marketId);
          const amount = parseFloat(bidAmountStr) || 0;
          const quickAmounts = [
            player.baseValue,
            Math.round(player.baseValue * 1.5 * 10) / 10,
            Math.round(player.baseValue * 2 * 10) / 10,
          ];
          return (
            <div
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.8)",
                zIndex: 280,
                display: "flex",
                alignItems: "flex-end",
              }}
              onClick={() => setBidModal(null)}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  background: "#15110a",
                  borderTop: "1px solid #2e2615",
                  borderRadius: "20px 20px 0 0",
                  width: "100%",
                  maxWidth: 600,
                  margin: "0 auto",
                  padding: "10px 18px 28px",
                  maxHeight: "85vh",
                  overflowY: "auto",
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 4,
                    background: "#2e2615",
                    borderRadius: 2,
                    margin: "6px auto 16px",
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    marginBottom: 16,
                  }}
                >
                  <div
                    style={{
                      background: ratingColor(player.overall),
                      borderRadius: 10,
                      minWidth: 52,
                      height: 52,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 800,
                      fontSize: 21,
                      color: "#000",
                    }}
                  >
                    {player.overall}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        marginBottom: 3,
                      }}
                    >
                      <span
                        style={{
                          background: posColor(player.pos),
                          color: "#fff",
                          borderRadius: 4,
                          padding: "2px 6px",
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        {player.pos}
                      </span>
                      <span style={{ fontWeight: 700, fontSize: 16 }}>
                        {player.name}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: "#8a7a5a" }}>
                      {player.nat} · {player.club}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 14,
                    fontSize: 13,
                    marginBottom: 18,
                    flexWrap: "wrap",
                  }}
                >
                  <span style={{ color: "#8a7a5a" }}>
                    👥 {totalBids}{" "}
                    {totalBids === 1 ? "puja activa" : "pujas activas"}
                  </span>
                  <span style={{ color: "#27ae60" }}>
                    💰 Disponible: <strong>{fmtM(available + myBid)}</strong>
                  </span>
                </div>

                <div
                  style={{
                    color: "#c9b88a",
                    fontSize: 12,
                    fontWeight: 700,
                    marginBottom: 8,
                  }}
                >
                  Tu puja (mín. {fmtM(player.baseValue)})
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 12,
                  }}
                >
                  <button
                    onClick={() =>
                      setBidAmountStr(
                        String(
                          Math.max(
                            player.baseValue,
                            Math.round((amount - 1) * 10) / 10,
                          ),
                        ),
                      )
                    }
                    style={{
                      background: "#2e2615",
                      border: "none",
                      color: "#fff",
                      borderRadius: 10,
                      width: 40,
                      height: 40,
                      fontSize: 18,
                      cursor: "pointer",
                    }}
                  >
                    −
                  </button>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={bidAmountStr}
                    onChange={(e) => setBidAmountStr(e.target.value)}
                    style={{
                      ...input,
                      textAlign: "center",
                      fontSize: 22,
                      fontWeight: 800,
                      color: "#f0c040",
                      flex: 1,
                    }}
                  />
                  <button
                    onClick={() =>
                      setBidAmountStr(
                        String(Math.round((amount + 1) * 10) / 10),
                      )
                    }
                    style={{
                      background: "#2e2615",
                      border: "none",
                      color: "#fff",
                      borderRadius: 10,
                      width: 40,
                      height: 40,
                      fontSize: 18,
                      cursor: "pointer",
                    }}
                  >
                    +
                  </button>
                </div>

                <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                  {quickAmounts.map((qa, i) => (
                    <button
                      key={i}
                      onClick={() => setBidAmountStr(String(qa))}
                      style={{
                        flex: 1,
                        background: "#100d08",
                        border: "1px solid #2e2615",
                        color: "#c9b88a",
                        borderRadius: 8,
                        padding: "8px 4px",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      {fmtM(qa)}
                    </button>
                  ))}
                </div>

                {myBid > 0 && (
                  <button
                    onClick={() => cancelBid(player.marketId)}
                    style={{
                      ...btn("transparent"),
                      border: "1px solid #c0392b",
                      color: "#c0392b",
                      marginBottom: 10,
                    }}
                  >
                    Cancelar mi puja actual ({fmtM(myBid)})
                  </button>
                )}
                <button
                  onClick={confirmBid}
                  style={btn("linear-gradient(135deg,#c9a227,#e8c252)")}
                >
                  {myBid > 0 ? "Actualizar puja" : "Confirmar puja"}
                </button>
              </div>
            </div>
          );
        })()}

      {/* ── Result Modal ── */}
      {pendingResult !== null && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.82)",
            zIndex: 200,
            display: "flex",
            alignItems: "flex-end",
          }}
          onClick={() => setPR(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#15110a",
              borderTop: "1px solid #2e2615",
              borderRadius: "20px 20px 0 0",
              width: "100%",
              maxWidth: 600,
              margin: "0 auto",
              padding: "10px 18px 28px",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <div
              style={{
                width: 36,
                height: 4,
                background: "#2e2615",
                borderRadius: 2,
                margin: "6px auto 16px",
              }}
            />
            <h3
              style={{
                color: "#fff",
                textAlign: "center",
                fontWeight: 700,
                marginBottom: 16,
                fontSize: 16,
              }}
            >
              Resultado del partido
            </h3>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 20,
              }}
            >
              {[
                {
                  label: "LOCAL",
                  name: fixtures[pendingResult]?.home,
                  val: homeGoals,
                  set: setHG,
                },
                {
                  label: "VISITANTE",
                  name: fixtures[pendingResult]?.away,
                  val: awayGoals,
                  set: setAG,
                },
              ].map(({ label, name, val, set }, i) => (
                <div key={i} style={{ flex: 1, textAlign: "center" }}>
                  <div
                    style={{ color: "#8a7a5a", fontSize: 11, marginBottom: 5 }}
                  >
                    {label}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      marginBottom: 10,
                    }}
                  >
                    <Crest
                      emoji={teams.find((t) => t.name === name)?.crestEmoji}
                      size={20}
                    />
                    <span style={{ fontWeight: 700, fontSize: 13 }}>
                      {name}
                    </span>
                  </div>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    value={val}
                    onChange={(e) => set(e.target.value)}
                    style={{
                      width: 64,
                      textAlign: "center",
                      background: "#0a0805",
                      border: "1px solid #2e2615",
                      borderRadius: 10,
                      padding: 12,
                      color: "#f0c040",
                      fontWeight: 800,
                      fontSize: 24,
                      outline: "none",
                    }}
                  />
                </div>
              ))}
            </div>
            <EventPicker
              label="⚽ Goleadores"
              teams={[
                fixtures[pendingResult]?.home,
                fixtures[pendingResult]?.away,
              ]}
              allTeams={teams}
              events={matchEvents.scorers}
              onAdd={addScorer}
              onRemove={removeScorer}
            />
            <EventPicker
              label="🅰️ Asistentes (opcional)"
              teams={[
                fixtures[pendingResult]?.home,
                fixtures[pendingResult]?.away,
              ]}
              allTeams={teams}
              events={matchEvents.assists}
              onAdd={addAssist}
              onRemove={removeAssist}
            />
            <div style={{ marginBottom: 18 }}>
              <div
                style={{
                  color: "#f0c040",
                  fontSize: 12,
                  fontWeight: 700,
                  marginBottom: 8,
                }}
              >
                🏅 Hombre del partido
              </div>
              {[
                fixtures[pendingResult]?.home,
                fixtures[pendingResult]?.away,
              ].map((teamName) => {
                const t = teams.find((x) => x.name === teamName);
                const allP = allPlayersOf(t);
                return (
                  <div key={teamName} style={{ marginBottom: 8 }}>
                    <div
                      style={{
                        color: "#8a7a5a",
                        fontSize: 11,
                        marginBottom: 4,
                      }}
                    >
                      {teamName}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                      {allP.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => setMvp(p.id)}
                          style={{
                            background:
                              matchEvents.mvp === p.id ? "#f0c040" : "#100d08",
                            color:
                              matchEvents.mvp === p.id ? "#000" : "#c9b88a",
                            border: "1px solid #2e2615",
                            borderRadius: 8,
                            padding: "5px 10px",
                            cursor: "pointer",
                            fontSize: 12,
                            fontWeight: 600,
                          }}
                        >
                          {p.name}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setPR(null)}
                style={{
                  ...btn("transparent"),
                  border: "1px solid #2e2615",
                  color: "#8a7a5a",
                }}
              >
                Cancelar
              </button>
              <button
                onClick={saveResult}
                style={btn("linear-gradient(135deg,#c9a227,#e8c252)")}
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Tournament Result Modal ── */}
      {tournamentResultModal &&
        (() => {
          const match =
            tournamentBracket[tournamentResultModal.round][
              tournamentResultModal.matchIndex
            ];
          return (
            <div
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.82)",
                zIndex: 200,
                display: "flex",
                alignItems: "flex-end",
              }}
              onClick={() => setTournamentResultModal(null)}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  background: "#15110a",
                  borderTop: "1px solid #2e2615",
                  borderRadius: "20px 20px 0 0",
                  width: "100%",
                  maxWidth: 600,
                  margin: "0 auto",
                  padding: "10px 18px 28px",
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 4,
                    background: "#2e2615",
                    borderRadius: 2,
                    margin: "6px auto 16px",
                  }}
                />
                <h3
                  style={{
                    color: "#fff",
                    textAlign: "center",
                    fontWeight: 700,
                    marginBottom: 6,
                    fontSize: 16,
                  }}
                >
                  Resultado del torneo
                </h3>
                <p
                  style={{
                    color: "#8a7a5a",
                    fontSize: 11,
                    textAlign: "center",
                    marginBottom: 16,
                  }}
                >
                  No afecta presupuesto ni estadísticas. No puede haber empate.
                </p>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    marginBottom: 20,
                  }}
                >
                  {[
                    {
                      label: "LOCAL",
                      name: match.home,
                      val: tHomeGoals,
                      set: setTHomeGoals,
                    },
                    {
                      label: "VISITANTE",
                      name: match.away,
                      val: tAwayGoals,
                      set: setTAwayGoals,
                    },
                  ].map(({ label, name, val, set }, i) => (
                    <div key={i} style={{ flex: 1, textAlign: "center" }}>
                      <div
                        style={{
                          color: "#8a7a5a",
                          fontSize: 11,
                          marginBottom: 5,
                        }}
                      >
                        {label}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                          marginBottom: 10,
                        }}
                      >
                        <Crest
                          emoji={teams.find((t) => t.name === name)?.crestEmoji}
                          size={20}
                        />
                        <span style={{ fontWeight: 700, fontSize: 13 }}>
                          {name}
                        </span>
                      </div>
                      <input
                        type="number"
                        inputMode="numeric"
                        min="0"
                        value={val}
                        onChange={(e) => set(e.target.value)}
                        style={{
                          width: 64,
                          textAlign: "center",
                          background: "#0a0805",
                          border: "1px solid #2e2615",
                          borderRadius: 10,
                          padding: 12,
                          color: "#f0c040",
                          fontWeight: 800,
                          fontSize: 24,
                          outline: "none",
                        }}
                      />
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => setTournamentResultModal(null)}
                    style={{
                      ...btn("transparent"),
                      border: "1px solid #2e2615",
                      color: "#8a7a5a",
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={saveTournamentResult}
                    style={btn("linear-gradient(135deg,#c9a227,#e8c252)")}
                  >
                    Guardar
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

      {/* ── Swap Modal ── */}
      {swapModal &&
        (() => {
          const t = teams.find((x) => x.name === swapModal.teamName);
          const allP = allPlayersOf(t);
          return (
            <div
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.82)",
                zIndex: 230,
                display: "flex",
                alignItems: "flex-end",
              }}
            >
              <div
                style={{
                  background: "#15110a",
                  borderTop: "1px solid #2e2615",
                  borderRadius: "20px 20px 0 0",
                  width: "100%",
                  maxWidth: 600,
                  margin: "0 auto",
                  padding: "20px 18px 28px",
                  maxHeight: "85vh",
                  overflowY: "auto",
                }}
              >
                <h3
                  style={{
                    color: "#fff",
                    fontWeight: 700,
                    marginBottom: 6,
                    fontSize: 16,
                  }}
                >
                  Plantilla llena
                </h3>
                <p style={{ color: "#8a7a5a", fontSize: 13, marginBottom: 16 }}>
                  <strong style={{ color: "#f0c040" }}>
                    {swapModal.newPlayer.name}
                  </strong>{" "}
                  fue fichado pero la plantilla está al límite ({MAX_SQUAD}).
                  Elige a quién liberar:
                </p>
                {allP
                  .filter((p) => p.id !== t?.squad?.star?.id)
                  .map((p, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "10px 0",
                        borderBottom: "1px solid #241e10",
                      }}
                    >
                      <span
                        style={{
                          background: posColor(p.pos || p.position),
                          color: "#fff",
                          borderRadius: 4,
                          padding: "2px 6px",
                          fontSize: 11,
                          fontWeight: 700,
                          minWidth: 36,
                          textAlign: "center",
                        }}
                      >
                        {p.pos || p.position}
                      </span>
                      <span style={{ flex: 1, fontWeight: 600, fontSize: 14 }}>
                        {p.name}
                      </span>
                      <span style={{ color: "#8a7a5a", fontSize: 12 }}>
                        {p.overall}
                      </span>
                      <button
                        onClick={() =>
                          swapPlayer(
                            swapModal.teamName,
                            p.id,
                            swapModal.newPlayer,
                            swapModal.amount,
                          )
                        }
                        style={{
                          background: "#c0392b",
                          border: "none",
                          color: "#fff",
                          borderRadius: 7,
                          padding: "6px 12px",
                          cursor: "pointer",
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
                        Fichar
                      </button>
                    </div>
                  ))}
                <button
                  onClick={() => setSwapModal(null)}
                  style={{
                    ...btn("transparent"),
                    border: "1px solid #2e2615",
                    color: "#8a7a5a",
                    marginTop: 14,
                  }}
                >
                  Cancelar fichaje
                </button>
              </div>
            </div>
          );
        })()}

      {lineupSlotModal &&
        (() => {
          const t = teams.find((x) => x.name === lineupSlotModal.teamName);
          if (!t) return null;
          const allP = allPlayersOf(t);
          const lineup = t.lineup || {
            formation: FORMATION_NAMES[0],
            slots: {},
          };
          const currentPlayerId = lineup.slots[lineupSlotModal.slotId];
          const slotInfo = (FORMATIONS[lineup.formation] || []).find(
            (s) => s.id === lineupSlotModal.slotId,
          );
          return (
            <div
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.82)",
                zIndex: 230,
                display: "flex",
                alignItems: "flex-end",
              }}
              onClick={() => setLineupSlotModal(null)}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  background: "#15110a",
                  borderTop: "1px solid #2e2615",
                  borderRadius: "20px 20px 0 0",
                  width: "100%",
                  maxWidth: 600,
                  margin: "0 auto",
                  padding: "10px 18px 28px",
                  maxHeight: "75vh",
                  overflowY: "auto",
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 4,
                    background: "#2e2615",
                    borderRadius: 2,
                    margin: "6px auto 16px",
                  }}
                />
                <h3
                  style={{
                    color: "#fff",
                    fontWeight: 700,
                    marginBottom: 4,
                    fontSize: 16,
                  }}
                >
                  Elegir jugador — {slotInfo?.label}
                </h3>
                <p style={{ color: "#8a7a5a", fontSize: 12, marginBottom: 14 }}>
                  Toca un jugador para colocarlo en esta posición.
                </p>
                {currentPlayerId && (
                  <button
                    onClick={() =>
                      clearSlot(
                        lineupSlotModal.teamName,
                        lineupSlotModal.slotId,
                      )
                    }
                    style={{
                      ...btn("transparent"),
                      border: "1px solid #c0392b",
                      color: "#c0392b",
                      marginBottom: 14,
                    }}
                  >
                    Quitar jugador de esta posición
                  </button>
                )}
                {allP.map((p) => {
                  const isHere = p.id === currentPlayerId;
                  const isElsewhere =
                    !isHere && Object.values(lineup.slots).includes(p.id);
                  return (
                    <div
                      key={p.id}
                      onClick={() =>
                        assignPlayerToSlot(
                          lineupSlotModal.teamName,
                          lineupSlotModal.slotId,
                          p.id,
                        )
                      }
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "10px 0",
                        borderBottom: "1px solid #241e10",
                        cursor: "pointer",
                        opacity: isElsewhere ? 0.5 : 1,
                      }}
                    >
                      <span
                        style={{
                          background: posColor(p.pos || p.position),
                          color: "#fff",
                          borderRadius: 4,
                          padding: "2px 6px",
                          fontSize: 11,
                          fontWeight: 700,
                          minWidth: 36,
                          textAlign: "center",
                        }}
                      >
                        {p.pos || p.position}
                      </span>
                      <span style={{ flex: 1, fontWeight: 600, fontSize: 14 }}>
                        {p.name}
                        {isHere && (
                          <span style={{ color: "#27ae60", fontSize: 11 }}>
                            {" "}
                            (aquí)
                          </span>
                        )}
                        {isElsewhere && (
                          <span style={{ color: "#f0c040", fontSize: 11 }}>
                            {" "}
                            (en otra posición)
                          </span>
                        )}
                      </span>
                      <span
                        style={{
                          fontWeight: 800,
                          color: ratingColor(p.overall),
                        }}
                      >
                        {p.overall}
                      </span>
                    </div>
                  );
                })}
                <button
                  onClick={() => setLineupSlotModal(null)}
                  style={{
                    ...btn("transparent"),
                    border: "1px solid #2e2615",
                    color: "#8a7a5a",
                    marginTop: 14,
                  }}
                >
                  Cerrar
                </button>
              </div>
            </div>
          );
        })()}

      {/* ── Player Pick Swap Modal (champion's squad is full) ── */}
      {playerPickSwapModal &&
        (() => {
          const t = teams.find(
            (x) => x.name === playerPickSwapModal.championTeamName,
          );
          const allP = allPlayersOf(t);
          return (
            <div
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.82)",
                zIndex: 230,
                display: "flex",
                alignItems: "flex-end",
              }}
            >
              <div
                style={{
                  background: "#15110a",
                  borderTop: "1px solid #2e2615",
                  borderRadius: "20px 20px 0 0",
                  width: "100%",
                  maxWidth: 600,
                  margin: "0 auto",
                  padding: "20px 18px 28px",
                  maxHeight: "85vh",
                  overflowY: "auto",
                }}
              >
                <h3
                  style={{
                    color: "#fff",
                    fontWeight: 700,
                    marginBottom: 6,
                    fontSize: 16,
                  }}
                >
                  Plantilla llena
                </h3>
                <p style={{ color: "#8a7a5a", fontSize: 13, marginBottom: 16 }}>
                  Para añadir a{" "}
                  <strong style={{ color: "#f0c040" }}>
                    {playerPickSwapModal.newPlayer.name}
                  </strong>{" "}
                  ({playerPickSwapModal.newPlayer.overall}) tu plantilla está al
                  límite ({MAX_SQUAD}). Elige a quién descartar:
                </p>
                {allP
                  .filter((p) => p.id !== t?.squad?.star?.id)
                  .map((p, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "10px 0",
                        borderBottom: "1px solid #241e10",
                      }}
                    >
                      <span
                        style={{
                          background: posColor(p.pos || p.position),
                          color: "#fff",
                          borderRadius: 4,
                          padding: "2px 6px",
                          fontSize: 11,
                          fontWeight: 700,
                          minWidth: 36,
                          textAlign: "center",
                        }}
                      >
                        {p.pos || p.position}
                      </span>
                      <span style={{ flex: 1, fontWeight: 600, fontSize: 14 }}>
                        {p.name}
                      </span>
                      <span style={{ color: "#8a7a5a", fontSize: 12 }}>
                        {p.overall}
                      </span>
                      <button
                        onClick={() => resolvePlayerPickSwap(p.id)}
                        style={{
                          background: "#c0392b",
                          border: "none",
                          color: "#fff",
                          borderRadius: 7,
                          padding: "6px 12px",
                          cursor: "pointer",
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
                        Descartar y fichar
                      </button>
                    </div>
                  ))}
                <button
                  onClick={() => setPlayerPickSwapModal(null)}
                  style={{
                    ...btn("transparent"),
                    border: "1px solid #2e2615",
                    color: "#8a7a5a",
                    marginTop: 14,
                  }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          );
        })()}

      {/* ── Sell Modal ── */}
      {/* ── Offer Modal ── */}
      {offerModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.8)",
            zIndex: 240,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            style={{
              background: "#15110a",
              border: "1px solid #2e2615",
              borderRadius: 16,
              padding: 24,
              maxWidth: 360,
              width: "100%",
            }}
          >
            <h3
              style={{
                color: "#fff",
                fontWeight: 700,
                marginBottom: 12,
                fontSize: 16,
              }}
            >
              Hacer oferta
            </h3>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 14,
              }}
            >
              <span
                style={{
                  background: posColor(offerModal.player.pos),
                  color: "#fff",
                  borderRadius: 4,
                  padding: "2px 6px",
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                {offerModal.player.pos}
              </span>
              <span style={{ fontWeight: 700, fontSize: 15 }}>
                {offerModal.player.name}
              </span>
              <span
                style={{
                  color: ratingColor(offerModal.player.overall),
                  fontWeight: 800,
                }}
              >
                {offerModal.player.overall}
              </span>
            </div>
            <p style={{ color: "#8a7a5a", fontSize: 12, marginBottom: 8 }}>
              De: <strong>{offerModal.teamName}</strong>. El precio es libre, el
              equipo rival puede aceptarla o rechazarla.
            </p>
            <input
              type="number"
              inputMode="decimal"
              min="0.5"
              step="0.5"
              placeholder="Importe en M€"
              value={offerAmountStr}
              onChange={(e) => setOfferAmountStr(e.target.value)}
              style={{ ...input, marginBottom: 16, fontSize: 15 }}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setOfferModal(null)}
                style={{
                  ...btn("transparent"),
                  border: "1px solid #2e2615",
                  color: "#8a7a5a",
                }}
              >
                Cancelar
              </button>
              <button onClick={submitOffer} style={btn()}>
                Enviar oferta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Discard Confirm ── */}
      {discardConfirm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.8)",
            zIndex: 240,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            style={{
              background: "#15110a",
              border: "1px solid #2e2615",
              borderRadius: 16,
              padding: 24,
              maxWidth: 340,
              textAlign: "center",
            }}
          >
            <p style={{ marginBottom: 8, fontWeight: 600, fontSize: 15 }}>
              ¿Descartar a{" "}
              <strong style={{ color: "#f0c040" }}>
                {discardConfirm.player.name}
              </strong>
              ?
            </p>
            <p
              style={{
                color: "#27ae60",
                fontWeight: 700,
                fontSize: 18,
                marginBottom: 8,
              }}
            >
              Recibirás{" "}
              {fmtM(
                ((discardConfirm.player.clauseValue ??
                  clauseBase(discardConfirm.player.overall)) +
                  (discardConfirm.player.clauseInvested || 0) * 2) /
                  2,
              )}
            </p>
            <p style={{ color: "#8a7a5a", fontSize: 12, marginBottom: 20 }}>
              Mitad de su valor de cláusula actual.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setDiscardConfirm(null)}
                style={{
                  ...btn("transparent"),
                  border: "1px solid #2e2615",
                  color: "#8a7a5a",
                }}
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  discardPlayer(discardConfirm.teamName, discardConfirm.player);
                  setDiscardConfirm(null);
                }}
                style={btn("#f0c040")}
              >
                Descartar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Clause Confirm ── */}
      {clauseConfirm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.8)",
            zIndex: 240,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            style={{
              background: "#15110a",
              border: "1px solid #2e2615",
              borderRadius: 16,
              padding: 24,
              maxWidth: 340,
              textAlign: "center",
            }}
          >
            <p style={{ marginBottom: 8, fontWeight: 600, fontSize: 15 }}>
              ¿Pagar la cláusula de{" "}
              <strong style={{ color: "#f0c040" }}>
                {clauseConfirm.player.name}
              </strong>{" "}
              ({clauseConfirm.sellerTeam})?
            </p>
            <p
              style={{
                color: "#c0392b",
                fontWeight: 700,
                fontSize: 20,
                marginBottom: 8,
              }}
            >
              {fmtM(clauseConfirm.clauseTotal)}
            </p>
            <p style={{ color: "#8a7a5a", fontSize: 12, marginBottom: 20 }}>
              El equipo rival no puede negarse.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setClauseConfirm(null)}
                style={{
                  ...btn("transparent"),
                  border: "1px solid #2e2615",
                  color: "#8a7a5a",
                }}
              >
                Cancelar
              </button>
              <button
                onClick={() =>
                  payClause(
                    clauseConfirm.sellerTeam,
                    clauseConfirm.player,
                    clauseConfirm.clauseTotal,
                  )
                }
                style={btn("#c0392b")}
              >
                Pagar y fichar
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── Legend Buy Confirm Modal ── */}
      {legendBuyConfirm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.8)",
            zIndex: 240,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            style={{
              background: "#15110a",
              border: "1px solid #c0392b",
              borderRadius: 16,
              padding: 24,
              maxWidth: 340,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 10 }}>🏆</div>
            <p
              style={{
                marginBottom: 6,
                fontWeight: 700,
                fontSize: 16,
                color: "#fff",
              }}
            >
              ¡Leyenda disponible!
            </p>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                marginBottom: 14,
              }}
            >
              <span
                style={{
                  background: posColor(legendBuyConfirm.pos),
                  color: "#fff",
                  borderRadius: 4,
                  padding: "2px 8px",
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {legendBuyConfirm.pos}
              </span>
              <span style={{ fontWeight: 700, fontSize: 17, color: "#fff" }}>
                {legendBuyConfirm.name}
              </span>
              <span
                style={{
                  fontWeight: 800,
                  fontSize: 18,
                  color: ratingColor(legendBuyConfirm.overall),
                }}
              >
                {legendBuyConfirm.overall}
              </span>
            </div>
            <p
              style={{
                color: "#c0392b",
                fontWeight: 800,
                fontSize: 20,
                marginBottom: 6,
              }}
            >
              {fmtM(LEGEND_MARKET_PRICE)}
            </p>
            <p style={{ color: "#8a7a5a", fontSize: 12, marginBottom: 20 }}>
              El jugador se unirá a <strong>{myTeamName}</strong>. Esta
              operación no se puede deshacer.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => buyLegend(legendBuyConfirm)}
                style={btn("#c0392b")}
              >
                Confirmar compra
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helper subcomponents ────────────────────────────────────────────────────
function Crest({ emoji, size = 28 }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 6,
        background: "#2e2615",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        fontSize: size * 0.6,
        lineHeight: 1,
      }}
    >
      {emoji || "⚽"}
    </div>
  );
}

// Lets the user pick a team crest using their device's native emoji
// keyboard, instead of uploading an image (no file size, no Firestore
// 1MB-per-document risk). Tapping the crest opens a tiny text input;
// typing/selecting an emoji there and tapping away (blur) or pressing
// Enter saves it.
function EmojiCrestPicker({ emoji, size = 32, onChange }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(emoji || "");
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus();
  }, [editing]);

  const commit = () => {
    setEditing(false);
    if (draft && draft !== emoji) onChange(draft);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
        }}
        placeholder="⚽"
        style={{
          width: size + 20,
          height: size,
          borderRadius: 6,
          textAlign: "center",
          background: "#100d08",
          border: "1px solid #c9a227",
          color: "#e8eaf0",
          fontSize: size * 0.55,
          outline: "none",
        }}
      />
    );
  }
  return (
    <button
      onClick={() => {
        setDraft(emoji || "");
        setEditing(true);
      }}
      style={{
        background: "none",
        border: "none",
        padding: 0,
        cursor: "pointer",
      }}
    >
      <Crest emoji={emoji} size={size} />
    </button>
  );
}

function StatBlock({ title, data, field, color }) {
  return (
    <div
      style={{
        background: "#15110a",
        border: "1px solid #2e2615",
        borderRadius: 14,
        padding: "14px 16px",
        marginBottom: 12,
      }}
    >
      <div
        style={{
          color: "#fff",
          fontWeight: 700,
          fontSize: 14,
          marginBottom: 10,
        }}
      >
        {title}
      </div>
      {data.length === 0 ? (
        <p style={{ color: "#8a7a5a", fontSize: 13 }}>Sin datos aún.</p>
      ) : (
        data.map((p, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "7px 0",
              borderBottom: "1px solid #241e10",
            }}
          >
            <span
              style={{
                color: i === 0 ? color : "#8a7a5a",
                fontWeight: 800,
                minWidth: 18,
                fontSize: 13,
              }}
            >
              {i + 1}
            </span>
            <span style={{ fontWeight: 600, flex: 1, fontSize: 13 }}>
              {p.name}
            </span>
            <span style={{ color: "#8a7a5a", fontSize: 11 }}>{p.teamName}</span>
            <span
              style={{
                fontWeight: 800,
                color,
                fontSize: 15,
                minWidth: 22,
                textAlign: "right",
              }}
            >
              {p[field]}
            </span>
          </div>
        ))
      )}
    </div>
  );
}

function LineupField({ team, onSlotTap }) {
  const lineup = team.lineup || { formation: FORMATION_NAMES[0], slots: {} };
  const slots = FORMATIONS[lineup.formation] || FORMATIONS[FORMATION_NAMES[0]];
  const allP = allPlayersOf(team);
  const validIds = new Set(allP.map((p) => p.id));

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: "2/3",
        background: "linear-gradient(180deg,#1a5f3a,#0d3a22)",
        borderRadius: 14,
        border: "1px solid #2e2615",
        overflow: "hidden",
        marginBottom: 14,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: 0,
          right: 0,
          height: 1,
          background: "rgba(255,255,255,0.15)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: 60,
          height: 60,
          marginLeft: -30,
          marginTop: -30,
          border: "1px solid rgba(255,255,255,0.15)",
          borderRadius: "50%",
        }}
      />

      {slots.map((slot) => {
        const rawPlayerId = lineup.slots[slot.id];
        const playerId =
          rawPlayerId && validIds.has(rawPlayerId) ? rawPlayerId : null; // ← descarta huérfanos
        const player = playerId ? allP.find((p) => p.id === playerId) : null;
        return (
          <div
            key={slot.id}
            onClick={() => onSlotTap(slot.id)}
            style={{
              position: "absolute",
              left: `${slot.x}%`,
              top: `${slot.y}%`,
              transform: "translate(-50%,-50%)",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
              width: 64,
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: player
                  ? ratingColor(player.overall)
                  : "rgba(255,255,255,0.12)",
                border: player
                  ? "2px solid #fff"
                  : "2px dashed rgba(255,255,255,0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                fontSize: 14,
                color: player ? "#000" : "rgba(255,255,255,0.6)",
              }}
            >
              {player ? player.overall : "+"}
            </div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "#fff",
                textAlign: "center",
                background: "rgba(0,0,0,0.55)",
                borderRadius: 4,
                padding: "1px 5px",
                whiteSpace: "nowrap",
                maxWidth: 64,
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {player ? player.name.split(" ").slice(-1)[0] : slot.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EventPicker({ label, teams, allTeams, events, onAdd, onRemove }) {
  const [selTeam, setSelTeam] = useState(teams[0]);
  const [selPlayer, setSelPlayer] = useState("");
  const t = allTeams.find((x) => x.name === selTeam);
  const allP = t
    ? [t.squad?.star, ...(t.squad?.squad || [])].filter(Boolean)
    : [];
  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          color: "#e8c252",
          fontSize: 12,
          fontWeight: 700,
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      <div
        style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}
      >
        <select
          value={selTeam}
          onChange={(e) => {
            setSelTeam(e.target.value);
            setSelPlayer("");
          }}
          style={{
            background: "#100d08",
            border: "1px solid #2e2615",
            borderRadius: 8,
            padding: "8px 10px",
            color: "#e8eaf0",
            fontSize: 13,
          }}
        >
          {teams.map((tn) => (
            <option key={tn} value={tn}>
              {tn}
            </option>
          ))}
        </select>
        <select
          value={selPlayer}
          onChange={(e) => setSelPlayer(e.target.value)}
          style={{
            background: "#100d08",
            border: "1px solid #2e2615",
            borderRadius: 8,
            padding: "8px 10px",
            color: "#e8eaf0",
            fontSize: 13,
            flex: 1,
            minWidth: 120,
          }}
        >
          <option value="">Seleccionar jugador...</option>
          {allP.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <button
          onClick={() => {
            onAdd(selTeam, selPlayer);
            setSelPlayer("");
          }}
          disabled={!selPlayer}
          style={{
            background: selPlayer ? "#c9a227" : "#241e10",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "8px 14px",
            cursor: selPlayer ? "pointer" : "not-allowed",
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          +
        </button>
      </div>
      {events.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {events.map((ev, i) => {
            const team = allTeams.find((x) => x.name === ev.team);
            const player = team
              ? [team.squad?.star, ...(team.squad?.squad || [])]
                  .filter(Boolean)
                  .find((p) => p.id === ev.playerId)
              : null;
            return (
              <div
                key={i}
                style={{
                  background: "#100d08",
                  border: "1px solid #2e2615",
                  borderRadius: 14,
                  padding: "5px 10px",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 12,
                }}
              >
                {player?.name || "?"}{" "}
                <span style={{ color: "#8a7a5a" }}>({ev.team})</span>
                <button
                  onClick={() => onRemove(i)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#c0392b",
                    cursor: "pointer",
                    fontWeight: 700,
                  }}
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
