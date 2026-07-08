import { useState, useCallback, useEffect, useRef } from "react";
import { storage } from "./firebaseStorage";
import logoImg from "./src/assets/logo.webp";
import {
  signInWithGoogle,
  signOutUser,
  onAuthChange,
  ensureUserProfile,
  addLeagueToProfile,
  removeLeagueFromProfile,
} from "./firebaseAuth";
import { MARKET_POOL, LEGEND_POOL } from "./src/fifaLiga/pools";
import { arrayMove } from "@dnd-kit/sortable";
import {
  clubLogos,
  VIEWS,
  MAX_SQUAD,
  PRIZE_WIN,
  PRIZE_DRAW,
  PRIZE_LOSS,
  PRIZE_GOAL_FOR,
  PRIZE_GOAL_AGAINST,
  SEASON_PRIZE_TOPSCORER,
  SEASON_PRIZE_TOPASSIST,
  SEASON_PRIZE_MVP,
  SEASON_PRIZE_ZAMORA,
  TOURNAMENT_PRIZE_MONEY,
  PLAYER_PICK_MIN_OVERALL,
  PLAYER_PICK_MAX_OVERALL,
  LEGEND_PRIZE_MAX_OVERALL,
  LEGEND_MARKET_MIN_OVERALL,
  LEGEND_MARKET_PRICE,
  FORMATIONS,
  FORMATION_NAMES,
  MIN_SQUAD_TO_PLAY,
  ITEMS_PER_PAGE,
  genLeagueCode,
  finalRankingPrize,
  playerValue,
  clauseBase,
  calcMarketValue,
  isNightClauseLock,
  isClauseLocked,
  clauseLockRemainingMs,
  shuffle,
  generateBracket,
  propagateBracketWinners,
  generateSquad,
  generateMarket,
  fmtM,
  posColor,
  ratingColor,
  initTeam,
  getDayKey,
  msUntilNextMarketRefresh,
  fmtCountdown,
  allPlayersOf,
  hasIncompleteSquad,
} from "./src/fifaLiga/domain";
import {
  Crest,
  EmojiCrestPicker,
  StatBlock,
  LineupField,
  EventPickerStyled,
  Pagination,
} from "./src/fifaLiga/components";
import SeasonWrapped from "./src/fifaLiga/SeasonWrapped";
import { PlayerRow } from "./src/fifaLiga/views/PlayerRow";
import { SquadDndList, LegendRevealModal } from "./src/fifaLiga/components";
import { bg, gold, goldLight, goldDark, card, input, btn, pill, NAV_ITEMS } from "./src/fifaLiga/styles";

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
  const [fixturesTab, setFixturesTab] = useState("pending"); // "pending" | "played"
  const [fixturesTeamFilter, setFixturesTeamFilter] = useState("all");

  const [marketDay, setMarketDay] = useState(null);
  const [marketResetAt, setMarketResetAt] = useState(null);
  const [marketCountdownMs, setMarketCountdownMs] = useState(
    msUntilNextMarketRefresh(),
  );
  const [marketBadge, setMarketBadge] = useState(false);
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
  const [legendReveal, setLegendReveal] = useState(null); // { player, step }
  const [legendRatingDisplay, setLegendRatingDisplay] = useState(0);

  const [offers, setOffers] = useState([]); // [{offerId, fromTeam, toTeam, player, amount, status, createdAt}]
  const [notifications, setNotifications] = useState([]); // [{id, type, text, createdAt, read}]
  const [pageNotifications, setPageNotifications] = useState(1);
  const [pageMarketHistory, setPageMarketHistory] = useState(1);
  const [pageResolvedOffers, setPageResolvedOffers] = useState(1);
  const [pageTransferHistory, setPageTransferHistory] = useState(1);

  // MyLeague wrap form state
  const [wrappedAvailable, setWrappedAvailable] = useState(false);
  const [seasonWrap, setSeasonWrap] = useState(false);
  const [wrappedOpen, setWrappedOpen] = useState(false);
  const [wrappedSlide, setWrappedSlide] = useState(0);

  const totalPagesNotifications = Math.max(
    1,
    Math.ceil(notifications.length / ITEMS_PER_PAGE),
  );
  const visibleNotifications = notifications.slice(
    (pageNotifications - 1) * ITEMS_PER_PAGE,
    pageNotifications * ITEMS_PER_PAGE,
  );
  const [clauseConfirm, setClauseConfirm] = useState(null);
  const [clauseAlerts, setClauseAlerts] = useState([]);
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
    if (s.clauseAlerts !== undefined) setClauseAlerts(s.clauseAlerts);
    if (s.notifications) setNotifications(s.notifications);
    if (s.tournamentBracket !== undefined)
      setTournamentBracket(s.tournamentBracket);
    if (s.championPrize !== undefined) setChampionPrize(s.championPrize);
    if (s.wrappedAvailable !== undefined)
      setWrappedAvailable(s.wrappedAvailable);
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

  useEffect(() => {
    if (!started || teams.length === 0) return;
    const needsUpdate = teams.some((t) =>
      allPlayersOf(t).some(
        (p) =>
          p.marketValue === undefined &&
          (p.goals > 0 || p.assists > 0 || p.mvps > 0),
      ),
    );
    if (!needsUpdate) return;
    const updatedTeams = teams.map((t) => ({
      ...t,
      squad: t.squad
        ? {
            star: t.squad.star ? recalcPlayerValue(t.squad.star) : t.squad.star,
            squad: (t.squad.squad || []).map(recalcPlayerValue),
          }
        : t.squad,
    }));
    setTeams(updatedTeams);
    save({ teams: updatedTeams });
  }, [started, teams.length]);

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
        clauseAlerts,
        notifications,
        tournamentBracket,
        championPrize,
        wrappedAvailable,
        seasonWrap,
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
      clauseAlerts,
      notifications,
      tournamentBracket,
      championPrize,
      wrappedAvailable,
      seasonWrap,
    ],
  );
  // ── Legend reveal animation: auto-advance the step every second until done ──
  useEffect(() => {
    if (!legendReveal) return;

    if (legendReveal.step >= 5) return;

    const delays = [700, 900, 900, 1200, 500];

    const timer = setTimeout(() => {
      setLegendReveal((prev) => ({
        ...prev,
        step: prev.step + 1,
      }));
    }, delays[legendReveal.step]);

    return () => clearTimeout(timer);
  }, [legendReveal]);

  useEffect(() => {
    if (!legendReveal) return;

    if (legendReveal.step !== 3) return;

    const target = legendReveal.player.overall;

    const interval = setInterval(() => {
      setLegendRatingDisplay((v) => {
        if (v >= target) {
          clearInterval(interval);

          return target;
        }

        return v + 1;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [legendReveal]);

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
      clauseAlerts: [],
      notifications: [],
      tournamentBracket: null,
      championPrize: null,
      wrappedAvailable: false,
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
      clauseValue: clauseBase(chosenPlayer.overall, chosenPlayer.pos),
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
    setLegendBuyConfirm(null);

    startLegendReveal(legendPlayer);
  };

  const finishLegendPurchase = (legendPlayer) => {
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

  const startLegendReveal = (player) => {
    setLegendRatingDisplay(Math.max(player.overall - 8, 75));

    setLegendReveal({
      player,
      step: 0,
    });
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

  // ── Market resolution ──
  const checkAndRefreshMarket = () => {
    const now = Date.now();
    const elapsed = marketResetAt ? now - marketResetAt : Infinity;
    const MARKET_INTERVAL_MS = 12 * 60 * 60 * 1000;
    if (elapsed >= MARKET_INTERVAL_MS) resolveAuctions();
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
    setMarketBadge(true);
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
      (player.clauseValue ?? clauseBase(player.overall, player.pos)) +
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
        clauseValue: amount ?? clauseBase(newPlayer.overall, newPlayer.pos),
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
    // ── Nueva alerta para el vendedor ──
    const newAlert = {
      id: `ca_${Date.now()}`,
      teamName: sellerTeamName,
      playerName: player.name,
      amount: clauseAmount,
      buyerTeam: myTeamName,
    };
    const newClauseAlerts = [...clauseAlerts, newAlert];
    setClauseAlerts(newClauseAlerts);
    save({
      teams: updatedTeams,
      notifications: newNotifications,
      clauseAlerts: newClauseAlerts,
    });
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
                clauseValue:
                  newClauseValue ?? clauseBase(player.overall, player.pos),
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
    setOfferAmountStr(
      String(player.clauseValue || clauseBase(player.overall, player.pos)),
    );
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

    // Recalcular marketValue y clauseValue tras actualizar stats
    result = result.map((t) => ({
      ...t,
      squad: t.squad
        ? {
            star: t.squad.star ? recalcPlayerValue(t.squad.star) : t.squad.star,
            squad: (t.squad.squad || []).map(recalcPlayerValue),
          }
        : t.squad,
    }));

    return result;
  }

  function recalcPlayerValue(player) {
    const newMarketValue = calcMarketValue(player);
    const currentClause =
      player.clauseValue ?? clauseBase(player.overall, player.pos);
    // Si el marketValue supera la cláusula actual, la cláusula sube al marketValue
    const newClauseValue =
      newMarketValue >= currentClause ? newMarketValue : currentClause;
    return {
      ...player,
      marketValue: newMarketValue,
      clauseValue: newClauseValue,
    };
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
  const topRevalorizados = teams
    .flatMap((t) =>
      allPlayersOf(t).map((p) => ({
        ...p,
        teamName: t.name,
        revalorizacion:
          Math.round(
            ((p.marketValue || playerValue(p.overall, p.pos)) -
              playerValue(p.overall, p.pos)) *
              10,
          ) / 10,
      })),
    )
    .filter((p) => p.revalorizacion > 0)
    .sort((a, b) => b.revalorizacion - a.revalorizacion)
    .slice(0, 10);

  const topParticipaciones = [...allPlayersWithTeam]
    .map((p) => ({ ...p, participaciones: (p.goals || 0) + (p.assists || 0) }))
    .filter((p) => p.participaciones > 0)
    .sort((a, b) => b.participaciones - a.participaciones)
    .slice(0, 10);

  const mayoresGoleadas = [...fixtures]
    .filter((f) => f.played)
    .map((f) => ({
      ...f,
      diff: Math.abs(f.homeGoals - f.awayGoals),
      total: f.homeGoals + f.awayGoals,
    }))
    .sort((a, b) => b.diff - a.diff || b.total - a.total)
    .slice(0, 5);

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
    const seasonWrap = {
      teams,
      fixtures,
      topScorers,
      topAssists,
      topMvps,
      zamoraRanking,
      topRevalorizados,
      sorted,
    };
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
    setWrappedAvailable(true);
    setSeasonWrap(seasonWrap);

    save({
      teams: updatedTeams,
      fixtures: newFixtures,
      wrappedAvailable: true,
      seasonWrap,
    });
    showToast(
      "🆕 ¡Nueva temporada iniciada! Premios repartidos y calendario reiniciado.",
      "success",
    );
  };

  const myTeamObj = teams.find((t) => t.name === myTeamName);

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
          {wrappedAvailable && started && (
            <button
              onClick={() => {
                setWrappedSlide(0);
                setWrappedOpen(true);
              }}
              style={{
                background: "linear-gradient(135deg,#c9a227,#8a6f1a)",
                color: "#0a0805",
                border: "none",
                borderRadius: 8,
                padding: "6px 10px",
                cursor: "pointer",
                fontWeight: 700,
                fontSize: 12,
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              🎬 Resumen
            </button>
          )}
          {leagueCode && (
            <button
              onClick={() =>
                setView(
                  userProfile?.leagues?.length > 0
                    ? VIEWS.MY_LEAGUES
                    : VIEWS.HOME,
                )
              }
              style={{
                background: "transparent",
                color: "#c9a227",
                border: "1px solid #c9a227",
                borderRadius: 8,
                padding: "6px 10px",
                cursor: "pointer",
                fontWeight: 700,
                fontSize: 12,
              }}
            >
              ← Ligas
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

<LoginView view={view} authLoading={authLoading} authError={authError} handleGoogleSignIn={handleGoogleSignIn} />

        {/* ══ MY_LEAGUES<MyLeaguesView view={view} userProfile={userProfile} handleSignOut={handleSignOut} setView={setView} setLeagueCode={setLeagueCode} setMyTeamName={setMyTeamName} saveDevice={saveDevice} setStorageLoaded={setStorageLoaded} />

        {/* ══ HOME<HomeView view={view} deviceLoaded={deviceLoaded} userProfile={userProfile} homeError={homeError} leagueNameInput={leagueNameInput} setLeagueNameInput={setLeagueNameInput} joinCodeInput={joinCodeInput} setJoinCodeInput={setJoinCodeInput} setView={setView} createLeague={createLeague} checkJoinCode={checkJoinCode} handleSignOut={handleSignOut} />

        {/* ══ SETUP<SetupView view={view} leagueCode={leagueCode} isAdmin={isAdmin} homeError={homeError} teams={teams} newTeamNameInput={newTeamNameInput} setNewTeamNameInput={setNewTeamNameInput} setView={setView} createMyTeam={createMyTeam} />

        {/* ══ WAITING<WaitingView view={view} leagueCode={leagueCode} isAdmin={isAdmin} teams={teams} myTeamName={myTeamName} startTournament={startTournament} />

        {/* ══ TABLE ══ */}<TableView view={view} sorted={sorted} myTeamName={myTeamName} setView={setView} setViewingTeam={setViewingTeam} />

        {/* ══ FIXTURES ══ */}<FixturesView view={view} fixtureWeek={fixtureWeek} setFixtureWeek={setFixtureWeek} myTeamName={myTeamName} teams={teams} loadFixtures={loadFixtures} canSimulate={canSimulate} adminOverride={adminOverride} isAdmin={isAdmin} skipFixtureWeek={skipFixtureWeek} simulateWeek={simulateWeek} submittingWeek={submittingWeek} adjudicatedWeeks={adjudicatedWeeks} currentWeek={currentWeek} afterSaveAndRefresh={afterSaveAndRefresh} handleBidTransferResult={handleBidTransferResult} setToast={setToast} />

        {/* ══ SQUADS ══ */}<SquadsView view={view} viewingTeam={viewingTeam} myTeamName={myTeamName} teams={teams} setViewingTeam={setViewingTeam} />

        {/* ══ MARKET ══ */}<MarketView view={view} myTeamName={myTeamName} teams={teams} marketType={marketType} setMarketType={setMarketType} marketPlayers={marketPlayers} buyNowMarket={buyNowMarket} toggleListForSale={toggleListForSale} setDiscardConfirm={setDiscardConfirm} openOfferModal={openOfferModal} setClauseConfirm={setClauseConfirm} clauseInvestInput={clauseInvestInput} setClauseInvestInput={setClauseInvestInput} investInClause={investInClause} />

        {/* ══ STATS ══ */}<StatsView view={view} teams={teams} myTeamName={myTeamName} statsCache={statsCache} computeStats={computeStats} />

<TournamentView view={view} />

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
                if (item.v === VIEWS.MARKET) {
                  checkAndRefreshMarket();
                  setMarketBadge(false);
                }
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
                {item.v === VIEWS.SQUADS &&
                  clauseAlerts.filter((a) => a.teamName === myTeamName).length >
                    0 && (
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
                      {
                        clauseAlerts.filter((a) => a.teamName === myTeamName)
                          .length
                      }
                    </span>
                  )}
                {item.v === VIEWS.MARKET && marketBadge && (
                  <span
                    style={{
                      position: "absolute",
                      top: -4,
                      right: -8,
                      background: "#c9a227",
                      color: "#0a0805",
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
                    !
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

<Toast toast={toast} started={started} />

      {/* ── Bid Modal<BidModal bidModal={bidModal} bids={bids} myTeamName={myTeamName} getAvailableBudget={getAvailableBudget} bidAmountStr={bidAmountStr} setBidAmountStr={setBidAmountStr} setBidModal={setBidModal} cancelBid={cancelBid} confirmBid={confirmBid} />

      {/* ── Result Modal ── */}<ResultModal pendingResult={pendingResult} teams={teams} allPlayersOf={allPlayersOf} fixtures={fixtures} homeGoals={homeGoals} setHG={setHG} awayGoals={awayGoals} setAG={setAG} matchEvents={matchEvents} setMvp={setMvp} addScorer={addScorer} removeScorer={removeScorer} addAssist={addAssist} removeAssist={removeAssist} saveResult={saveResult} setPR={setPR} />

      {/* ── Tournament Result Modal ── */}<TournamentResultModal tournamentResultModal={tournamentResultModal} tournamentBracket={tournamentBracket} tHomeGoals={tHomeGoals} setTHomeGoals={setTHomeGoals} tAwayGoals={tAwayGoals} setTAwayGoals={setTAwayGoals} teams={teams} saveTournamentResult={saveTournamentResult} setTournamentResultModal={setTournamentResultModal} />

      {/* ── Swap Modal ── */}<SwapModal swapModal={swapModal} teams={teams} allPlayersOf={allPlayersOf} swapPlayer={swapPlayer} setSwapModal={setSwapModal} />

      {/* ── Clause paid modal ── */}<ClausePaidModal view={view} myTeamName={myTeamName} clauseAlerts={clauseAlerts} setClauseAlerts={setClauseAlerts} save={save} />

      {/* ── Player Pick Swap Modal<PlayerPickSwapModal playerPickSwapModal={playerPickSwapModal} teams={teams} allPlayersOf={allPlayersOf} resolvePlayerPickSwap={resolvePlayerPickSwap} setPlayerPickSwapModal={setPlayerPickSwapModal} />

      {/* ── Sell Modal ── */}
<OfferModal offerModal={offerModal} offerAmountStr={offerAmountStr} setOfferAmountStr={setOfferAmountStr} setOfferModal={setOfferModal} submitOffer={submitOffer} />

      {/* ── Discard Confirm ── */}<DiscardConfirmModal discardConfirm={discardConfirm} setDiscardConfirm={setDiscardConfirm} discardPlayer={discardPlayer} />

      {/* ── Clause Confirm ── */}<ClauseConfirmModal clauseConfirm={clauseConfirm} setClauseConfirm={setClauseConfirm} payClause={payClause} />

      {/* ── Legend Buy Confirm Modal ── */}<LegendBuyConfirmModal legendBuyConfirm={legendBuyConfirm} myTeamName={myTeamName} buyLegend={buyLegend} />

      {/* ── Legend Reveal Modal ── */}      {/* ── Legend Reveal Modal ── */}
      {legendReveal && (
        <LegendRevealModal
          reveal={legendReveal}
          rating={legendRatingDisplay}
          onContinue={() => {
            finishLegendPurchase(legendReveal.player);

            setLegendReveal(null);
          }}
        />
      )}
      {wrappedOpen && (
        <SeasonWrapped
          teams={seasonWrap.teams}
          fixtures={seasonWrap.fixtures}
          myTeamName={myTeamName}
          sorted={seasonWrap.sorted}
          topScorers={seasonWrap.topScorers}
          topAssists={seasonWrap.topAssists}
          topMvps={seasonWrap.topMvps}
          zamoraRanking={seasonWrap.zamoraRanking}
          topRevalorizados={seasonWrap.topRevalorizados}
          onClose={() => setWrappedOpen(false)}
        />
      )}
    </div>
  );
}
