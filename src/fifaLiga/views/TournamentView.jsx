import { VIEWS, hasIncompleteSquad, fmtM, TOURNAMENT_PRIZE_MONEY, posColor, ratingColor } from "../domain";
import { Crest } from "../components";
import { btn, card } from "../styles";

export default function TournamentView({
  tournamentBracket,
  isAdmin,
  championPrize,
  teams,
  drawTournament,
  openTournamentResult,
  claimMoneyPrize,
  startPlayerPick,
  startLegendPick,
  revealCard,
  selectCard,
  confirmPlayerPick,
}) {
  if (!tournamentBracket) {
    return (
      <div>
        <h2 style={{ color: "#fff", fontWeight: 700, fontSize: 21, marginBottom: 6 }}>🏅 Torneo</h2>
        <p style={{ color: "#8a7a5a", fontSize: 12, marginBottom: 16 }}>
          Eliminatoria directa (solo ida), independiente de la liga regular. No afecta presupuesto ni estadísticas.
        </p>
        <div style={{ textAlign: "center", padding: "30px 20px" }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>🏅</div>
          <p style={{ color: "#8a7a5a", fontSize: 13, marginBottom: 16 }}>
            Todavía no se ha sorteado ningún torneo.
          </p>
          {isAdmin ? (
            <button onClick={drawTournament} style={btn("linear-gradient(135deg,#c9a227,#e8c252)")}>
              🎲 Sortear Torneo
            </button>
          ) : (
            <p style={{ color: "#8a7a5a", fontSize: 12 }}>Solo el admin puede sortear el torneo.</p>
          )}
        </div>
      </div>
    );
  }

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
      <h2 style={{ color: "#fff", fontWeight: 700, fontSize: 21, marginBottom: 6 }}>🏅 Torneo</h2>
      <p style={{ color: "#8a7a5a", fontSize: 12, marginBottom: 16 }}>
        Eliminatoria directa (solo ida), independiente de la liga regular. No afecta presupuesto ni estadísticas.
      </p>

      {champion && (
        <div style={{
          background: "linear-gradient(135deg,#2e2615,#2a4060)",
          border: "1px solid #f0c040",
          borderRadius: 12,
          padding: "14px 16px",
          marginBottom: 16,
          textAlign: "center",
        }}>
          <div style={{ fontSize: 24, marginBottom: 6 }}>🏆</div>
          <div style={{ color: "#f0c040", fontWeight: 800, fontSize: 16, marginBottom: championPrize?.claimed ? 0 : 14 }}>
            {champion} es el campeón
          </div>

          {!championPrize && (
            <div>
              <p style={{ color: "#c9b88a", fontSize: 12, marginBottom: 10 }}>Elige el premio:</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
                <button onClick={() => claimMoneyPrize(champion)} style={{ ...btn("#27ae60"), fontSize: 13 }}>
                  💰 {fmtM(TOURNAMENT_PRIZE_MONEY)}
                </button>
                <button onClick={startPlayerPick} style={{ ...btn("#8e44ad"), fontSize: 13 }}>
                  🎴 Player Pick
                </button>
                <button onClick={startLegendPick} style={{ ...btn("#c0392b"), fontSize: 13 }}>
                  🏆 Leyenda
                </button>
              </div>
            </div>
          )}

          {championPrize?.type === "money" && championPrize.claimed && (
            <p style={{ color: "#27ae60", fontWeight: 700, fontSize: 14 }}>
              💰 Premio cobrado: {fmtM(TOURNAMENT_PRIZE_MONEY)}
            </p>
          )}

          {(championPrize?.type === "playerpick" || championPrize?.type === "legendpick") && !championPrize.claimed && (
            <div>
              <p style={{ color: "#c9b88a", fontSize: 12, marginBottom: 12 }}>
                {championPrize.cards.length > 1
                  ? "Toca una carta para revelarla, luego selecciónala y confirma."
                  : "Toca la carta para revelar tu leyenda y confirma."}
              </p>
              <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 14 }}>
                {championPrize.cards.map((p, idx) => {
                  const isRevealed = championPrize.revealed[idx];
                  const isSelected = championPrize.selectedIdx === idx;
                  return (
                    <div
                      key={idx}
                      onClick={() => isRevealed ? selectCard(idx) : revealCard(idx)}
                      style={{
                        width: 90, height: 130, borderRadius: 10, cursor: "pointer",
                        background: isRevealed ? "#15110a" : championPrize.type === "legendpick"
                          ? "linear-gradient(135deg,#c0392b,#15110a)" : "linear-gradient(135deg,#c9a227,#15110a)",
                        border: isSelected ? "2px solid #f0c040" : "1px solid #2e2615",
                        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                        padding: 8, transition: "transform 0.15s", transform: isSelected ? "scale(1.05)" : "scale(1)",
                      }}
                    >
                      {!isRevealed ? (
                        <>
                          <span style={{ fontSize: 28 }}>{championPrize.type === "legendpick" ? "🏆" : "🎴"}</span>
                          <span style={{ fontSize: 10, color: "#c9b88a", marginTop: 6 }}>Toca para revelar</span>
                        </>
                      ) : (
                        <>
                          <span style={{ background: posColor(p.pos), color: "#fff", borderRadius: 4, padding: "2px 6px", fontSize: 10, fontWeight: 700, marginBottom: 6 }}>{p.pos}</span>
                          <span style={{ fontWeight: 700, fontSize: 12, textAlign: "center", lineHeight: 1.2, marginBottom: 4 }}>{p.name}</span>
                          <span style={{ fontWeight: 800, color: ratingColor(p.overall), fontSize: 18 }}>{p.overall}</span>
                          {isSelected && <span style={{ color: "#f0c040", fontSize: 10, marginTop: 4 }}>✓ Elegido</span>}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
              {championPrize.selectedIdx !== null && (
                <button onClick={() => confirmPlayerPick(champion)} style={{ ...btn("linear-gradient(135deg,#c9a227,#e8c252)"), fontSize: 13 }}>
                  Confirmar selección
                </button>
              )}
            </div>
          )}

          {(championPrize?.type === "playerpick" || championPrize?.type === "legendpick") && championPrize.claimed && (
            <p style={{ color: "#27ae60", fontWeight: 700, fontSize: 14 }}>
              {championPrize.type === "legendpick" ? "🏆" : "🎴"} {championPrize.cards[championPrize.selectedIdx].name} se unió al equipo
            </p>
          )}
        </div>
      )}

      <div style={{ display: "flex", gap: 14, overflowX: "auto", paddingBottom: 10 }}>
        {tournamentBracket.map((round, ri) => (
          <div key={ri} style={{ minWidth: 170, display: "flex", flexDirection: "column", justifyContent: "space-around", gap: Math.max(10, 16 * (ri + 1)) }}>
            <div style={{ color: "#c9b88a", fontSize: 11, fontWeight: 700, textAlign: "center", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>
              {roundName(ri)}
            </div>
            {round.map((m, mi) => {
              const t1 = teams.find((t) => t.name === m.home);
              const t2 = teams.find((t) => t.name === m.away);
              const isBye = m.home === null || m.away === null;
              const squadsBlocked = !isBye && (hasIncompleteSquad(t1) || hasIncompleteSquad(t2));
              const clickable = !isBye && m.home && m.away && !squadsBlocked;
              return (
                <div
                  key={m.id}
                  onClick={() => { if (clickable) openTournamentResult(ri, mi); }}
                  style={{
                    background: "#15110a", border: `1px solid ${m.winner ? "#27ae60" : "#2e2615"}`, borderRadius: 10,
                    padding: "8px 10px", cursor: clickable ? "pointer" : "default", opacity: squadsBlocked && !m.played ? 0.6 : 1,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, opacity: m.winner && m.winner !== m.home ? 0.45 : 1 }}>
                    <Crest emoji={t1?.crestEmoji} size={16} />
                    <span style={{ fontSize: 12, fontWeight: m.winner === m.home ? 700 : 500, flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {m.home || "BYE"}
                    </span>
                    {m.played && <span style={{ fontSize: 12, fontWeight: 700, color: "#f0c040" }}>{m.homeGoals}</span>}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, opacity: m.winner && m.winner !== m.away ? 0.45 : 1 }}>
                    <Crest emoji={t2?.crestEmoji} size={16} />
                    <span style={{ fontSize: 12, fontWeight: m.winner === m.away ? 700 : 500, flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {m.away || (isBye ? "" : "?")}
                    </span>
                    {m.played && <span style={{ fontSize: 12, fontWeight: 700, color: "#f0c040" }}>{m.awayGoals}</span>}
                  </div>
                  {isBye && <div style={{ fontSize: 10, color: "#8a7a5a", textAlign: "center", marginTop: 4 }}>bye</div>}
                  {squadsBlocked && !m.played && <div style={{ fontSize: 9, color: "#f0c040", textAlign: "center", marginTop: 4 }}>🔒</div>}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {isAdmin && (
        <button onClick={drawTournament} style={{ ...btn("transparent"), border: "1px solid #c0392b", color: "#c0392b", marginTop: 16, fontSize: 12, padding: "9px" }}>
          🔄 Volver a sortear (reinicia el torneo)
        </button>
      )}
    </div>
  );
}
