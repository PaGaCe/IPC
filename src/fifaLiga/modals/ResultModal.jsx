import { posColor, fmtM } from "../domain";
import { btn, input } from "../styles";
import { Crest, EventPickerStyled } from "../components";

export default function ResultModal({ pendingResult, teams, allPlayersOf, fixtures, homeGoals, setHG, awayGoals, setAG, matchEvents, setMvp, addScorer, removeScorer, addAssist, removeAssist, saveResult, setPR }) {
  if (pendingResult === null) return null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.82)", zIndex: 200, display: "flex", alignItems: "flex-end" }}
      onClick={() => setPR(null)}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#15110a", borderTop: "1px solid #2e2615", borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 600, margin: "0 auto", padding: "10px 18px 28px", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ width: 36, height: 4, background: "#2e2615", borderRadius: 2, margin: "6px auto 16px" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24 }}>
          {[{ name: fixtures[pendingResult]?.home, val: homeGoals, set: setHG, isHome: true },
            { name: fixtures[pendingResult]?.away, val: awayGoals, set: setAG, isHome: false },
          ].map(({ name, val, set, isHome }, i) => {
            const hg = parseInt(homeGoals) || 0;
            const ag = parseInt(awayGoals) || 0;
            const isWinning = isHome ? hg > ag : ag > hg;
            const isDraw = hg === ag && homeGoals !== "" && awayGoals !== "";
            return (
              <div key={i} style={{ flex: 1, textAlign: "center" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 8 }}>
                  <Crest emoji={teams.find((t) => t.name === name)?.crestEmoji} size={20} />
                  <span style={{ fontWeight: 700, fontSize: 13, color: isWinning ? "#c9a227" : isDraw ? "#f0e6d2" : "#8a7a5a" }}>{name}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <button onClick={() => set(String(Math.max(0, (parseInt(val) || 0) - 1)))}
                    style={{ background: "#2e2615", border: "none", color: "#fff", borderRadius: 8, width: 34, height: 34, fontSize: 18, cursor: "pointer", fontWeight: 700 }}>−</button>
                  <div style={{ width: 56, height: 56, display: "flex", alignItems: "center", justifyContent: "center", background: isWinning ? "rgba(201,162,39,0.15)" : "#100d08", border: `2px solid ${isWinning ? "#c9a227" : "#2e2615"}`, borderRadius: 12, fontWeight: 800, fontSize: 28, color: isWinning ? "#c9a227" : "#f0e6d2", transition: "all 0.2s" }}>
                    {val === "" ? "-" : val}
                  </div>
                  <button onClick={() => set(String((parseInt(val) || 0) + 1))}
                    style={{ background: "#2e2615", border: "none", color: "#fff", borderRadius: 8, width: 34, height: 34, fontSize: 18, cursor: "pointer", fontWeight: 700 }}>+</button>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ background: "rgba(192,57,43,0.08)", border: "1px solid rgba(192,57,43,0.3)", borderRadius: 12, padding: "12px 14px", marginBottom: 12 }}>
          <div style={{ color: "#c0392b", fontSize: 12, fontWeight: 700, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>⚽ Goleadores</div>
          <EventPickerStyled teams={[fixtures[pendingResult]?.home, fixtures[pendingResult]?.away]} allTeams={teams} events={matchEvents.scorers} onAdd={addScorer} onRemove={removeScorer} accentColor="#c0392b" />
        </div>
        <div style={{ background: "rgba(39,174,96,0.08)", border: "1px solid rgba(39,174,96,0.3)", borderRadius: 12, padding: "12px 14px", marginBottom: 12 }}>
          <div style={{ color: "#27ae60", fontSize: 12, fontWeight: 700, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>🅰️ Asistentes <span style={{ color: "#5a5040", fontWeight: 400, fontSize: 11 }}>(opcional)</span></div>
          <EventPickerStyled teams={[fixtures[pendingResult]?.home, fixtures[pendingResult]?.away]} allTeams={teams} events={matchEvents.assists} onAdd={addAssist} onRemove={removeAssist} accentColor="#27ae60" />
        </div>
        <div style={{ background: "rgba(240,192,64,0.08)", border: "1px solid rgba(240,192,64,0.3)", borderRadius: 12, padding: "12px 14px", marginBottom: 16 }}>
          <div style={{ color: "#f0c040", fontSize: 12, fontWeight: 700, marginBottom: 10 }}>🏅 Hombre del partido</div>
          {[fixtures[pendingResult]?.home, fixtures[pendingResult]?.away].map((teamName) => {
            const t = teams.find((x) => x.name === teamName);
            const allP = [...allPlayersOf(t)].sort((a, b) => (b.goals || 0) + (b.assists || 0) + (b.mvps || 0) - (a.goals || 0) - (a.assists || 0) - (a.mvps || 0));
            return (
              <div key={teamName} style={{ marginBottom: 10 }}>
                <div style={{ color: "#8a7a5a", fontSize: 11, fontWeight: 600, marginBottom: 6 }}>{teamName}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {allP.map((p) => (
                    <button key={p.id} onClick={() => setMvp(p.id)}
                      style={{ background: matchEvents.mvp === p.id ? "#f0c040" : "#100d08", color: matchEvents.mvp === p.id ? "#0a0805" : "#c9b88a", border: `1px solid ${matchEvents.mvp === p.id ? "#f0c040" : "#2e2615"}`, borderRadius: 8, padding: "5px 10px", cursor: "pointer", fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ background: posColor(p.pos), borderRadius: 3, padding: "1px 4px", fontSize: 9, color: "#fff", fontWeight: 800 }}>{p.pos}</span>
                      {p.name.split(" ").slice(-1)[0]}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        {homeGoals !== "" && awayGoals !== "" && (
          <div style={{ background: "#100d08", border: "1px solid #2e2615", borderRadius: 12, padding: "12px 14px", marginBottom: 16 }}>
            <div style={{ color: "#8a7a5a", fontSize: 11, fontWeight: 700, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Resumen</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <span style={{ flex: 1, fontWeight: 700, fontSize: 14, color: parseInt(homeGoals) > parseInt(awayGoals) ? "#c9a227" : "#8a7a5a" }}>{fixtures[pendingResult]?.home}</span>
              <span style={{ background: "#2e2615", borderRadius: 8, padding: "4px 12px", fontWeight: 800, fontSize: 18, color: "#f0c040" }}>{homeGoals}-{awayGoals}</span>
              <span style={{ flex: 1, fontWeight: 700, fontSize: 14, textAlign: "right", color: parseInt(awayGoals) > parseInt(homeGoals) ? "#c9a227" : "#8a7a5a" }}>{fixtures[pendingResult]?.away}</span>
            </div>
            {(() => {
              const home = fixtures[pendingResult]?.home;
              const away = fixtures[pendingResult]?.away;
              const homeScorers = matchEvents.scorers.filter((s) => s.team === home);
              const awayScorers = matchEvents.scorers.filter((s) => s.team === away);
              const homeTeam = teams.find((x) => x.name === home);
              const awayTeam = teams.find((x) => x.name === away);
              const getPlayer = (team, id) => allPlayersOf(team).find((p) => p.id === id);
              if (homeScorers.length === 0 && awayScorers.length === 0) return null;
              return (
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 3 }}>
                    {homeScorers.map((s, i) => <span key={i} style={{ fontSize: 11, color: "#f0e6d2" }}>⚽ {getPlayer(homeTeam, s.playerId)?.name || "?"}</span>)}
                  </div>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3 }}>
                    {awayScorers.map((s, i) => <span key={i} style={{ fontSize: 11, color: "#f0e6d2", textAlign: "right" }}>{getPlayer(awayTeam, s.playerId)?.name || "?"} ⚽</span>)}
                  </div>
                </div>
              );
            })()}
            {matchEvents.mvp && (
              <div style={{ marginTop: 6 }}>
                <span style={{ background: "rgba(240,192,64,0.15)", border: "1px solid #f0c040", borderRadius: 6, padding: "2px 8px", fontSize: 11, color: "#f0c040", fontWeight: 700 }}>
                  🏅 {(() => { for (const t of teams) { const p = allPlayersOf(t).find((pp) => pp.id === matchEvents.mvp); if (p) return p.name; } return "?"; })()}
                </span>
              </div>
            )}
          </div>
        )}
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setPR(null)} style={{ ...btn("transparent"), border: "1px solid #2e2615", color: "#8a7a5a" }}>Cancelar</button>
          <button onClick={saveResult} style={btn("linear-gradient(135deg,#c9a227,#e8c252)")}>Guardar</button>
        </div>
      </div>
    </div>
  );
}
