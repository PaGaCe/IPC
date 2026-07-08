import { useState } from "react";
import { fmtM, playerValue } from "./domain";

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

// ── Sub-slides ──
function SlideIntro() {
  return (
    <>
      <div
        style={{ fontSize: 64, marginBottom: 16, animation: "pop 0.6s ease" }}
      >
        ⚽
      </div>
      <div
        style={{
          fontSize: 13,
          color: "#c9a227",
          fontWeight: 700,
          letterSpacing: 3,
          marginBottom: 12,
          textTransform: "uppercase",
        }}
      >
        Temporada terminada
      </div>
      <div
        style={{
          fontSize: 32,
          fontWeight: 800,
          color: "#fff",
          marginBottom: 16,
        }}
      >
        Liga IPC
      </div>
      <div style={{ fontSize: 14, color: "#8a7a5a" }}>
        Repasemos lo mejor de esta temporada
      </div>
      <style>{`@keyframes pop{from{opacity:0;transform:scale(0.5)}to{opacity:1;transform:scale(1)}}`}</style>
    </>
  );
}

function SlideChampion({ team }) {
  if (!team) return null;
  return (
    <>
      <div style={{ fontSize: 56, marginBottom: 12 }}>🥇</div>
      <div
        style={{
          fontSize: 13,
          color: "#c9a227",
          fontWeight: 700,
          letterSpacing: 3,
          marginBottom: 16,
          textTransform: "uppercase",
        }}
      >
        Campeón de Liga
      </div>
      <div
        style={{
          fontSize: 36,
          fontWeight: 800,
          color: "#fff",
          marginBottom: 12,
        }}
      >
        {team.name}
      </div>
      <div
        style={{
          display: "flex",
          gap: 20,
          justifyContent: "center",
          marginTop: 8,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#f0c040" }}>
            {team.points}
          </div>
          <div style={{ fontSize: 11, color: "#8a7a5a" }}>puntos</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#27ae60" }}>
            {team.won}
          </div>
          <div style={{ fontSize: 11, color: "#8a7a5a" }}>victorias</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#c9a227" }}>
            {fmtM(team.budget)}
          </div>
          <div style={{ fontSize: 11, color: "#8a7a5a" }}>presupuesto</div>
        </div>
      </div>
    </>
  );
}

function SlidePlayer({ emoji, label, player, statLabel, statValue, teamName }) {
  if (!player) return <div style={{ color: "#8a7a5a" }}>Sin datos</div>;
  return (
    <>
      <div style={{ fontSize: 52, marginBottom: 12 }}>{emoji}</div>
      <div
        style={{
          fontSize: 13,
          color: "#c9a227",
          fontWeight: 700,
          letterSpacing: 3,
          marginBottom: 16,
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 32,
          fontWeight: 800,
          color: "#fff",
          marginBottom: 8,
        }}
      >
        {player.name}
      </div>
      <div style={{ fontSize: 14, color: "#8a7a5a", marginBottom: 20 }}>
        {teamName || player.teamName}
      </div>
      <div
        style={{
          background: "rgba(201,162,39,0.15)",
          border: "1px solid #c9a227",
          borderRadius: 16,
          padding: "16px 32px",
        }}
      >
        <div style={{ fontSize: 52, fontWeight: 800, color: "#c9a227" }}>
          {statValue ?? 0}
        </div>
        <div style={{ fontSize: 13, color: "#c9b88a" }}>{statLabel}</div>
      </div>
    </>
  );
}

function SlideBiggestGame({ game }) {
  if (!game) return <div style={{ color: "#8a7a5a" }}>Sin datos</div>;
  const diff = Math.abs(game.homeGoals - game.awayGoals);
  const homeWon = game.homeGoals > game.awayGoals;
  return (
    <>
      <div style={{ fontSize: 52, marginBottom: 12 }}>💥</div>
      <div
        style={{
          fontSize: 13,
          color: "#c9a227",
          fontWeight: 700,
          letterSpacing: 3,
          marginBottom: 24,
          textTransform: "uppercase",
        }}
      >
        Mayor Goleada
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          marginBottom: 16,
        }}
      >
        <div style={{ flex: 1, textAlign: "right" }}>
          <div
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: homeWon ? "#fff" : "#8a7a5a",
            }}
          >
            {game.home}
          </div>
        </div>
        <div
          style={{
            background: "#2e2615",
            border: "1px solid #c9a227",
            borderRadius: 12,
            padding: "10px 18px",
          }}
        >
          <div style={{ fontSize: 28, fontWeight: 800, color: "#f0c040" }}>
            {game.homeGoals}-{game.awayGoals}
          </div>
        </div>
        <div style={{ flex: 1, textAlign: "left" }}>
          <div
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: !homeWon ? "#fff" : "#8a7a5a",
            }}
          >
            {game.away}
          </div>
        </div>
      </div>
      <div
        style={{
          background: "rgba(192,57,43,0.2)",
          border: "1px solid #c0392b",
          borderRadius: 10,
          padding: "8px 20px",
          display: "inline-block",
        }}
      >
        <span style={{ color: "#c0392b", fontWeight: 700, fontSize: 14 }}>
          Diferencia: {diff} goles
        </span>
      </div>
    </>
  );
}

function SlideRevalorizado({ player, label }) {
  if (!player) return <div style={{ color: "#8a7a5a" }}>Sin datos</div>;
  const base = playerValue(player.overall, player.pos);
  const current = player.marketValue || base;
  const rev = Math.round((current - base) * 10) / 10;
  return (
    <>
      <div style={{ fontSize: 52, marginBottom: 12 }}>📈</div>
      <div
        style={{
          fontSize: 13,
          color: "#c9a227",
          fontWeight: 700,
          letterSpacing: 3,
          marginBottom: 16,
          textTransform: "uppercase",
        }}
      >
        {label || "Más revalorizado"}
      </div>
      <div
        style={{
          fontSize: 30,
          fontWeight: 800,
          color: "#fff",
          marginBottom: 6,
        }}
      >
        {player.name}
      </div>
      <div style={{ fontSize: 13, color: "#8a7a5a", marginBottom: 20 }}>
        {player.teamName}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          justifyContent: "center",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#8a7a5a" }}>
            {fmtM(base)}
          </div>
          <div style={{ fontSize: 11, color: "#5a5040" }}>valor inicial</div>
        </div>
        <div style={{ fontSize: 24, color: "#27ae60" }}>→</div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#27ae60" }}>
            {fmtM(current)}
          </div>
          <div style={{ fontSize: 11, color: "#27ae60" }}>+{fmtM(rev)}</div>
        </div>
      </div>
    </>
  );
}

function SlideTabla({ sorted }) {
  return (
    <>
      <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
      <div
        style={{
          fontSize: 13,
          color: "#c9a227",
          fontWeight: 700,
          letterSpacing: 3,
          marginBottom: 16,
          textTransform: "uppercase",
        }}
      >
        Clasificación Final
      </div>
      <div style={{ width: "100%", maxWidth: 340 }}>
        {sorted.map((t, i) => (
          <div
            key={t.name}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 12px",
              borderRadius: 10,
              marginBottom: 4,
              background:
                i === 0 ? "rgba(201,162,39,0.15)" : "rgba(255,255,255,0.04)",
              border: i === 0 ? "1px solid #c9a227" : "1px solid transparent",
            }}
          >
            <span
              style={{
                fontWeight: 800,
                fontSize: 14,
                color:
                  i === 0
                    ? "#c9a227"
                    : i === 1
                      ? "#aaa"
                      : i === 2
                        ? "#cd7f32"
                        : "#8a7a5a",
                minWidth: 20,
              }}
            >
              {i + 1}
            </span>
            <span
              style={{
                flex: 1,
                fontWeight: 700,
                fontSize: 14,
                textAlign: "left",
                color: i < 3 ? "#fff" : "#c9b88a",
              }}
            >
              {t.name}
            </span>
            <span style={{ fontWeight: 800, color: "#f0c040", fontSize: 14 }}>
              {t.points}pts
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

function SlideMyPosition({ team, position, total }) {
  if (!team) return null;
  const medals = ["🥇", "🥈", "🥉"];
  const emoji = medals[position - 1] || "📍";
  return (
    <>
      <div style={{ fontSize: 64, marginBottom: 12 }}>{emoji}</div>
      <div
        style={{
          fontSize: 13,
          color: "#27ae60",
          fontWeight: 700,
          letterSpacing: 3,
          marginBottom: 16,
          textTransform: "uppercase",
        }}
      >
        Tu temporada
      </div>
      <div
        style={{
          fontSize: 28,
          fontWeight: 800,
          color: "#fff",
          marginBottom: 20,
        }}
      >
        {team.name}
      </div>
      <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
        <div
          style={{
            textAlign: "center",
            background: "rgba(201,162,39,0.15)",
            border: "1px solid #c9a227",
            borderRadius: 14,
            padding: "14px 20px",
          }}
        >
          <div style={{ fontSize: 36, fontWeight: 800, color: "#c9a227" }}>
            {position}º
          </div>
          <div style={{ fontSize: 11, color: "#8a7a5a" }}>
            de {total} equipos
          </div>
        </div>
        <div
          style={{
            textAlign: "center",
            background: "rgba(255,255,255,0.05)",
            border: "1px solid #2e2615",
            borderRadius: 14,
            padding: "14px 20px",
          }}
        >
          <div style={{ fontSize: 36, fontWeight: 800, color: "#f0c040" }}>
            {team.points}
          </div>
          <div style={{ fontSize: 11, color: "#8a7a5a" }}>puntos</div>
        </div>
        <div
          style={{
            textAlign: "center",
            background: "rgba(39,174,96,0.1)",
            border: "1px solid #27ae60",
            borderRadius: 14,
            padding: "14px 20px",
          }}
        >
          <div style={{ fontSize: 28, fontWeight: 800, color: "#27ae60" }}>
            {team.won}
          </div>
          <div style={{ fontSize: 11, color: "#8a7a5a" }}>victorias</div>
        </div>
      </div>
    </>
  );
}

function SlideMyResult({ label, game, myTeamName, positive }) {
  if (!game)
    return (
      <>
        <div style={{ fontSize: 52, marginBottom: 12 }}>
          {positive ? "🎉" : "😢"}
        </div>
        <div
          style={{
            fontSize: 13,
            color: "#c9a227",
            fontWeight: 700,
            letterSpacing: 3,
            marginBottom: 16,
            textTransform: "uppercase",
          }}
        >
          {label}
        </div>
        <div style={{ color: "#8a7a5a", fontSize: 14 }}>
          Sin datos para mostrar
        </div>
      </>
    );
  const isHome = game.home === myTeamName;
  const myGoals = isHome ? game.homeGoals : game.awayGoals;
  const oppGoals = isHome ? game.awayGoals : game.homeGoals;
  const opponent = isHome ? game.away : game.home;
  return (
    <>
      <div style={{ fontSize: 52, marginBottom: 12 }}>
        {positive ? "🎉" : "😢"}
      </div>
      <div
        style={{
          fontSize: 13,
          color: positive ? "#27ae60" : "#c0392b",
          fontWeight: 700,
          letterSpacing: 3,
          marginBottom: 20,
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 14, color: "#8a7a5a", marginBottom: 12 }}>
        vs {opponent}
      </div>
      <div
        style={{
          background: positive
            ? "rgba(39,174,96,0.15)"
            : "rgba(192,57,43,0.15)",
          border: `1px solid ${positive ? "#27ae60" : "#c0392b"}`,
          borderRadius: 16,
          padding: "20px 40px",
          marginBottom: 12,
        }}
      >
        <div
          style={{
            fontSize: 48,
            fontWeight: 800,
            color: positive ? "#27ae60" : "#c0392b",
          }}
        >
          {myGoals}-{oppGoals}
        </div>
      </div>
    </>
  );
}

function SlideOutro() {
  return (
    <>
      <div style={{ fontSize: 64, marginBottom: 16 }}>🏆</div>
      <div
        style={{
          fontSize: 13,
          color: "#c9a227",
          fontWeight: 700,
          letterSpacing: 3,
          marginBottom: 16,
          textTransform: "uppercase",
        }}
      >
        Hasta la próxima
      </div>
      <div
        style={{
          fontSize: 28,
          fontWeight: 800,
          color: "#fff",
          marginBottom: 8,
        }}
      >
        ¡Gran temporada!
      </div>
      <div style={{ fontSize: 14, color: "#8a7a5a", marginBottom: 32 }}>
        Los premios ya han sido repartidos. ¡A por la siguiente!
      </div>
    </>
  );
}
