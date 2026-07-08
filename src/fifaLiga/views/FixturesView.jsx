import { VIEWS, WEEKS, fmtM } from "../domain";
import { card, gold, goldLight } from "../styles";
import { Crest, Dinked } from "../components";

export default function FixturesView({ view, fixtureWeek, setFixtureWeek, myTeamName, teams, loadFixtures, canSimulate, adminOverride, isAdmin, skipFixtureWeek, simulateWeek, submittingWeek, adjudicatedWeeks, currentWeek, afterSaveAndRefresh, handleBidTransferResult, setToast }) {
  if (view !== VIEWS.FIXTURES) return null;
  const fixtures = loadFixtures();
  return (
    <div>
      <h2 style={{ color: "#fff", fontWeight: 700, fontSize: 21, marginBottom: 4 }}>Partidos</h2>
      {(() => {
        const myTeam = teams.find((t) => t.name === myTeamName);
        const allPlayed = myTeam && myTeam.results && myTeam.results.length === WEEKS.length;
        if (allPlayed) return <p style={{ color: "#27ae60", fontSize: 13 }}>✅ Todos los partidos jugados.</p>;
        const pending = WEEKS.slice(currentWeek - 1).flatMap((w) => {
          const wf = fixtures[w];
          if (!wf) return [];
          return wf.filter((f) => f.home === myTeamName || f.away === myTeamName);
        });
        return <p style={{ color: "#8a7a5a", fontSize: 13 }}>{pending.length} partidos pendientes</p>;
      })()}
      {WEEKS.map((w) => {
        const wf = fixtures[w];
        if (!wf || wf.length === 0) return null;
        const adjudicated = adjudicatedWeeks.includes(w);
        const isCurrent = w === currentWeek;
        const disabled = !adjudicated && !canSimulate(w);
        return (
          <div key={w} style={{ marginBottom: 14, ...(isCurrent ? { borderLeft: "3px solid #c9a227", paddingLeft: 10 } : {}) }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <div style={{ color: "#c9b88a", fontWeight: 700, fontSize: 12 }}>
                Semana {w}{adjudicated && " ✅"}{!adjudicated && w < currentWeek && " ⏳"}
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                {!adjudicated && (isAdmin || adminOverride) && (
                  <button onClick={() => skipFixtureWeek(w)} style={{ background: "#1a1a1a", border: "1px solid #2e2615", color: "#8a7a5a", borderRadius: 6, padding: "3px 8px", cursor: "pointer", fontSize: 10 }}>
                    Saltar
                  </button>
                )}
              </div>
            </div>
            {(fixtureWeek === w || !adjudicated) ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {wf.map((f, i) => {
                  const homeTeam = teams.find((t) => t.name === f.home);
                  const awayTeam = teams.find((t) => t.name === f.away);
                  const isUserTeam = f.home === myTeamName || f.away === myTeamName;
                  return (
                    <div key={i} style={{ ...card, opacity: adjudicated ? 0.5 : 1, background: isUserTeam ? "rgba(201,162,39,0.06)" : card.background }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Crest emoji={homeTeam?.crestEmoji} size={24} />
                        <span style={{ flex: 1, fontWeight: 700, fontSize: 13, textAlign: "right", color: f.home === myTeamName ? "#c9a227" : "#fff" }}>{f.home}</span>
                        {adjudicated ? (
                          <span style={{ fontWeight: 800, fontSize: 16, color: "#f0c040" }}>{f.homeScore}-{f.awayScore}</span>
                        ) : (
                          <span style={{ color: "#3a5a7a", fontSize: 12 }}>vs</span>
                        )}
                        <span style={{ flex: 1, fontWeight: 700, fontSize: 13, color: f.away === myTeamName ? "#c9a227" : "#fff" }}>{f.away}</span>
                        <Crest emoji={awayTeam?.crestEmoji} size={24} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p style={{ color: "#3a5a7a", fontSize: 11 }} onClick={() => setFixtureWeek(w)}>🔓 {wf.length} partidos — toca para ver</p>
            )}
            {isCurrent && !adjudicated && (
              <div style={{ marginTop: 8 }}>
                <button onClick={() => simulateWeek(w)} disabled={submittingWeek} style={{ background: "linear-gradient(135deg,#c9a227,#e8c252)", color: "#fff", border: "none", borderRadius: 10, padding: "10px 18px", cursor: submittingWeek ? "not-allowed" : "pointer", fontWeight: 700, width: "100%", opacity: submittingWeek ? 0.5 : 1 }}>
                  {submittingWeek ? "Simulando..." : `▶️ Simular Semana ${w}`}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
