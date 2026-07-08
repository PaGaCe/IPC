import { VIEWS } from "../domain";
import { card, btn } from "../styles";
import { Crest } from "../components";

export default function WaitingView({ view, leagueCode, isAdmin, teams, myTeamName, startTournament }) {
  if (view !== VIEWS.WAITING) return null;
  return (
    <div>
      <h2 style={{ color: "#fff", fontWeight: 700, fontSize: 21, marginBottom: 6 }}>Sala de espera</h2>
      <p style={{ color: "#8a7a5a", fontSize: 14, marginBottom: 6 }}>
        Código de liga: <strong style={{ color: "#f0c040", letterSpacing: 1 }}>{leagueCode}</strong>
      </p>
      <p style={{ color: "#8a7a5a", fontSize: 13, marginBottom: 18 }}>
        Comparte este código con el resto de jugadores.{" "}
        {isAdmin ? "Inicia la liga cuando todos los equipos estén listos." : "Esperando a que el admin inicie la liga..."}
      </p>
      <div style={{ color: "#c9b88a", fontSize: 12, fontWeight: 700, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
        Equipos ({teams.length})
      </div>
      {teams.map((t, i) => (
        <div key={t.name} style={{ ...card, display: "flex", alignItems: "center", gap: 12 }}>
          <Crest emoji={t.crestEmoji} size={32} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>
              {t.name}{t.name === myTeamName && <span style={{ color: "#27ae60", fontSize: 11 }}> (tú)</span>}
            </div>
            {t.squad?.star && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3, flexWrap: "wrap" }}>
                <span style={{ background: "#e8c252", color: "#fff", borderRadius: 4, padding: "2px 6px", fontSize: 10, fontWeight: 700 }}>
                  {t.squad.star.pos}
                </span>
                <span style={{ fontSize: 12, color: "#c9b88a" }}>⭐ {t.squad.star.name}</span>
              </div>
            )}
          </div>
          {t.squad?.star && <span style={{ fontWeight: 800, color: "#f0c040", fontSize: 18 }}>{t.squad.star.overall}</span>}
        </div>
      ))}
      {isAdmin ? (
        <div style={{ marginTop: 16 }}>
          <button onClick={startTournament} disabled={teams.length < 2} style={{ ...btn(teams.length >= 2 ? "linear-gradient(135deg,#c9a227,#e8c252)" : "#241e10"), color: teams.length >= 2 ? "#fff" : "#3a5a7a", cursor: teams.length >= 2 ? "pointer" : "not-allowed" }}>
            🏆 Iniciar Liga ({teams.length} equipos)
          </button>
          {teams.length < 2 && <p style={{ color: "#8a7a5a", fontSize: 11, marginTop: 8, textAlign: "center" }}>Esperando al menos 2 equipos para empezar</p>}
        </div>
      ) : (
        <div style={{ marginTop: 16, textAlign: "center", color: "#8a7a5a", fontSize: 12 }}>
          <div style={{ fontSize: 20, marginBottom: 6 }}>⏳</div>
        </div>
      )}
    </div>
  );
}
