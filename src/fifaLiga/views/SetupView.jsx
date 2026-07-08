import { VIEWS } from "../domain";
import { card, input, btn } from "../styles";
import { Crest } from "../components";

export default function SetupView({ view, leagueCode, isAdmin, homeError, teams, newTeamNameInput, setNewTeamNameInput, setView, createMyTeam }) {
  if (view !== VIEWS.SETUP) return null;
  return (
    <div>
      <h2 style={{ color: "#fff", fontWeight: 700, fontSize: 21, marginBottom: 6 }}>Crea tu equipo</h2>
      <p style={{ color: "#8a7a5a", fontSize: 14, marginBottom: 6 }}>
        Código de liga: <strong style={{ color: "#f0c040", letterSpacing: 1 }}>{leagueCode}</strong>{" "}
        {isAdmin && <span style={{ color: "#27ae60" }}>(eres admin)</span>}
      </p>
      <p style={{ color: "#8a7a5a", fontSize: 13, marginBottom: 18 }}>
        Al crear tu equipo se te asignará automáticamente una estrella (86) y una plantilla de 17 jugadores más. Empiezas con <strong style={{ color: "#27ae60" }}>100M€</strong>.
      </p>
      {homeError && (
        <div style={{ background: "#5a1a1a", border: "1px solid #c0392b", borderRadius: 10, padding: "10px 14px", color: "#fff", fontSize: 13, marginBottom: 16 }}>
          ⚠️ {homeError}
        </div>
      )}
      {teams.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <div style={{ color: "#c9b88a", fontSize: 12, fontWeight: 700, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
            Equipos ya unidos ({teams.length})
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {teams.map((t) => (
              <div key={t.name} style={{ background: "#100d08", border: "1px solid #2e2615", borderRadius: 20, padding: "5px 12px", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                <Crest emoji={t.crestEmoji} size={16} />
                {t.name}
              </div>
            ))}
          </div>
        </div>
      )}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input value={newTeamNameInput} onChange={(e) => setNewTeamNameInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && createMyTeam()} placeholder="Nombre de tu equipo..." style={input} />
        <button onClick={createMyTeam} style={{ ...btn("linear-gradient(135deg,#c9a227,#e8c252)"), width: "auto", padding: "12px 18px" }}>🎲 Crear</button>
      </div>
      <button onClick={() => setView(VIEWS.HOME)} style={{ ...btn("transparent"), border: "1px solid #2e2615", color: "#8a7a5a" }}>← Volver</button>
    </div>
  );
}
