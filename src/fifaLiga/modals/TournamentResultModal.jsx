import { btn } from "../styles";
import { Crest } from "../components";

export default function TournamentResultModal({ tournamentResultModal, tournamentBracket, tHomeGoals, setTHomeGoals, tAwayGoals, setTAwayGoals, teams, saveTournamentResult, setTournamentResultModal }) {
  if (!tournamentResultModal) return null;
  const match = tournamentBracket[tournamentResultModal.round][tournamentResultModal.matchIndex];
  if (!match) return null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.82)", zIndex: 200, display: "flex", alignItems: "flex-end" }}
      onClick={() => setTournamentResultModal(null)}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#15110a", borderTop: "1px solid #2e2615", borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 600, margin: "0 auto", padding: "10px 18px 28px" }}>
        <div style={{ width: 36, height: 4, background: "#2e2615", borderRadius: 2, margin: "6px auto 16px" }} />
        <h3 style={{ color: "#fff", textAlign: "center", fontWeight: 700, marginBottom: 6, fontSize: 16 }}>Resultado del torneo</h3>
        <p style={{ color: "#8a7a5a", fontSize: 11, textAlign: "center", marginBottom: 16 }}>No afecta presupuesto ni estadísticas. No puede haber empate.</p>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          {[{ label: "LOCAL", name: match.home, val: tHomeGoals, set: setTHomeGoals },
            { label: "VISITANTE", name: match.away, val: tAwayGoals, set: setTAwayGoals },
          ].map(({ label, name, val, set }, i) => (
            <div key={i} style={{ flex: 1, textAlign: "center" }}>
              <div style={{ color: "#8a7a5a", fontSize: 11, marginBottom: 5 }}>{label}</div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 10 }}>
                <Crest emoji={teams.find((t) => t.name === name)?.crestEmoji} size={20} />
                <span style={{ fontWeight: 700, fontSize: 13 }}>{name}</span>
              </div>
              <input type="number" inputMode="numeric" min="0" value={val} onChange={(e) => set(e.target.value)}
                style={{ width: 64, textAlign: "center", background: "#0a0805", border: "1px solid #2e2615", borderRadius: 10, padding: 12, color: "#f0c040", fontWeight: 800, fontSize: 24, outline: "none" }} />
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setTournamentResultModal(null)} style={{ ...btn("transparent"), border: "1px solid #2e2615", color: "#8a7a5a" }}>Cancelar</button>
          <button onClick={saveTournamentResult} style={btn("linear-gradient(135deg,#c9a227,#e8c252)")}>Guardar</button>
        </div>
      </div>
    </div>
  );
}
