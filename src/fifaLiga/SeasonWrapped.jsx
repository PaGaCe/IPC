import { useState } from "react";
import { fmtM, playerValue } from "./domain";
import {
  SlideIntro, SlideChampion, SlidePlayer, SlideBiggestGame,
  SlideRevalorizado, SlideTabla, SlideMyPosition,
  SlideMyResult, SlideOutro,
} from "./SeasonWrappedSlides";

export default function SeasonWrapped({
  teams,
  fixtures,
  myTeamName,
  sorted,
  topScorers,
  topAssists,
  topMvps,
  zamoraRanking,
  topRevalorizados,
  onClose,
}) {
  const [slide, setSlide] = useState(0);

  const myTeam = teams.find((t) => t.name === myTeamName);
  const myPosition = sorted.findIndex((t) => t.name === myTeamName) + 1;
  const myFixtures = fixtures.filter(
    (f) => f.played && (f.home === myTeamName || f.away === myTeamName),
  );

  const myWins = myFixtures.filter((f) => {
    const isHome = f.home === myTeamName;
    return isHome ? f.homeGoals > f.awayGoals : f.awayGoals > f.homeGoals;
  });
  const myLosses = myFixtures.filter((f) => {
    const isHome = f.home === myTeamName;
    return isHome ? f.homeGoals < f.awayGoals : f.awayGoals < f.homeGoals;
  });
  const bestWin = myWins.sort((a, b) => {
    const diffA = Math.abs(a.homeGoals - a.awayGoals);
    const diffB = Math.abs(b.homeGoals - b.awayGoals);
    return diffB - diffA;
  })[0];
  const worstLoss = myLosses.sort((a, b) => {
    const diffA = Math.abs(a.homeGoals - a.awayGoals);
    const diffB = Math.abs(b.homeGoals - b.awayGoals);
    return diffB - diffA;
  })[0];

  const myPlayers = myTeam
    ? [myTeam.squad?.star, ...(myTeam.squad?.squad || [])].filter(Boolean)
    : [];
  const myMvpPlayer = [...myPlayers].sort(
    (a, b) => (b.mvps || 0) - (a.mvps || 0),
  )[0];
  const myTopScorer = [...myPlayers].sort(
    (a, b) => (b.goals || 0) - (a.goals || 0),
  )[0];
  const myTopRevalorizado = [...myPlayers].sort((a, b) => {
    const revA =
      (a.marketValue || playerValue(a.overall, a.pos)) -
      playerValue(a.overall, a.pos);
    const revB =
      (b.marketValue || playerValue(b.overall, b.pos)) -
      playerValue(b.overall, b.pos);
    return revB - revA;
  })[0];

  const biggestGame = [...fixtures]
    .filter((f) => f.played)
    .sort((a, b) => {
      const diffA = Math.abs(a.homeGoals - a.awayGoals);
      const diffB = Math.abs(b.homeGoals - b.awayGoals);
      return diffB - diffA;
    })[0];

  const champion = sorted[0];

  const slides = [
    { id: "intro" },
    { id: "champion" },
    { id: "topscorer" },
    { id: "topassist" },
    { id: "topmvp" },
    { id: "zamora" },
    { id: "biggestgame" },
    { id: "revalorizado" },
    { id: "tabla" },
    { id: "myposition" },
    { id: "mybestwin" },
    { id: "myworstloss" },
    { id: "mymvp" },
    { id: "mytopscorer" },
    { id: "myrevalorizado" },
    { id: "outro" },
  ];

  const totalSlides = slides.length;
  const current = slides[slide];
  const isPersonal = slide >= 9;

  const goNext = () => {
    if (slide < totalSlides - 1) setSlide((s) => s + 1);
  };
  const goPrev = () => {
    if (slide > 0) setSlide((s) => s - 1);
  };

  return (
    <div
      onClick={goNext}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 500,
        background: isPersonal
          ? "linear-gradient(135deg,#0d1a0d,#1a2e0d,#0a1505)"
          : "linear-gradient(135deg,#0d0a05,#1f1a0c,#2e2615)",
        display: "flex",
        flexDirection: "column",
        fontFamily: "'Outfit',system-ui,sans-serif",
        transition: "background 0.5s ease",
      }}
    >
      {/* Barra de progreso */}
      <div style={{ display: "flex", gap: 4, padding: "16px 16px 8px" }}>
        {slides.map((_, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 3,
              borderRadius: 2,
              background: i <= slide ? "#c9a227" : "rgba(255,255,255,0.2)",
              transition: "background 0.3s",
            }}
          />
        ))}
      </div>

      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "4px 16px 0",
        }}
      >
        <span style={{ fontSize: 11, color: "#c9b88a", fontWeight: 600 }}>
          {isPersonal
            ? `🎯 Tu temporada · ${myTeamName}`
            : "🏆 Liga IPC · Temporada"}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          style={{
            background: "transparent",
            border: "none",
            color: "#8a7a5a",
            fontSize: 20,
            cursor: "pointer",
            padding: 4,
          }}
        >
          ✕
        </button>
      </div>

      {/* Slide content */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px 24px",
          textAlign: "center",
        }}
      >
        {current.id === "intro" && <SlideIntro />}
        {current.id === "champion" && <SlideChampion team={champion} />}
        {current.id === "topscorer" && (
          <SlidePlayer
            emoji="⚽"
            label="Máximo Goleador"
            player={topScorers[0]}
            statLabel="goles"
            statValue={topScorers[0]?.goals}
          />
        )}
        {current.id === "topassist" && (
          <SlidePlayer
            emoji="🅰️"
            label="Máximo Asistente"
            player={topAssists[0]}
            statLabel="asistencias"
            statValue={topAssists[0]?.assists}
          />
        )}
        {current.id === "topmvp" && (
          <SlidePlayer
            emoji="🏅"
            label="MVP de la temporada"
            player={topMvps[0]}
            statLabel="MVPs"
            statValue={topMvps[0]?.mvps}
          />
        )}
        {current.id === "zamora" && (
          <SlidePlayer
            emoji="🧤"
            label="Trofeo Zamora"
            player={zamoraRanking[0]?.keeper}
            statLabel="goles encajados"
            statValue={zamoraRanking[0]?.ga}
            teamName={zamoraRanking[0]?.teamName}
          />
        )}
        {current.id === "biggestgame" && (
          <SlideBiggestGame game={biggestGame} />
        )}
        {current.id === "revalorizado" && (
          <SlideRevalorizado player={topRevalorizados[0]} />
        )}
        {current.id === "tabla" && <SlideTabla sorted={sorted} />}
        {current.id === "myposition" && (
          <SlideMyPosition
            team={myTeam}
            position={myPosition}
            total={sorted.length}
          />
        )}
        {current.id === "mybestwin" && (
          <SlideMyResult
            label="Tu mejor victoria 🎉"
            game={bestWin}
            myTeamName={myTeamName}
            positive={true}
          />
        )}
        {current.id === "myworstloss" && (
          <SlideMyResult
            label="Tu peor derrota 😢"
            game={worstLoss}
            myTeamName={myTeamName}
            positive={false}
          />
        )}
        {current.id === "mymvp" && (
          <SlidePlayer
            emoji="🏅"
            label="Tu MVP de temporada"
            player={myMvpPlayer}
            statLabel="MVPs"
            statValue={myMvpPlayer?.mvps}
          />
        )}
        {current.id === "mytopscorer" && (
          <SlidePlayer
            emoji="⚽"
            label="Tu máximo goleador"
            player={myTopScorer}
            statLabel="goles"
            statValue={myTopScorer?.goals}
          />
        )}
        {current.id === "myrevalorizado" && (
          <SlideRevalorizado
            player={myTopRevalorizado}
            label="Tu jugador más revalorizado"
          />
        )}
        {current.id === "outro" && <SlideOutro />}
      </div>

      {/* Navegación */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          display: "flex",
          justifyContent: "space-between",
          padding: "0 24px 32px",
          gap: 12,
        }}
      >
        <button
          onClick={goPrev}
          disabled={slide === 0}
          style={{
            flex: 1,
            background: slide === 0 ? "#100d08" : "#2e2615",
            color: slide === 0 ? "#3a3020" : "#c9b88a",
            border: "1px solid #2e2615",
            borderRadius: 10,
            padding: "12px",
            cursor: slide === 0 ? "not-allowed" : "pointer",
            fontWeight: 700,
            fontSize: 14,
          }}
        >
          ← Anterior
        </button>
        {slide < totalSlides - 1 ? (
          <button
            onClick={goNext}
            style={{
              flex: 1,
              background: "linear-gradient(135deg,#c9a227,#8a6f1a)",
              color: "#0a0805",
              border: "none",
              borderRadius: 10,
              padding: "12px",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            Siguiente →
          </button>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            style={{
              flex: 1,
              background: "linear-gradient(135deg,#c9a227,#8a6f1a)",
              color: "#0a0805",
              border: "none",
              borderRadius: 10,
              padding: "12px",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            ¡Cerrar! 🏆
          </button>
        )}
      </div>
    </div>
  );
}

