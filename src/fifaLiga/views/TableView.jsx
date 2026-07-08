import { VIEWS, fmtM, PRIZE_WIN, PRIZE_DRAW, PRIZE_LOSS, PRIZE_GOAL_FOR, PRIZE_GOAL_AGAINST } from "../domain";
import { card } from "../styles";
import { Crest } from "../components";

export default function TableView({ view, sorted, myTeamName, setView, setViewingTeam }) {
  if (view !== VIEWS.TABLE) return null;
  return (
    <div>
      <h2 style={{ color: "#fff", fontWeight: 700, fontSize: 21, marginBottom: 6 }}>Clasificación</h2>
      <p style={{ color: "#8a7a5a", fontSize: 12, marginBottom: 14 }}>Toca un equipo para ver su plantilla.</p>
      {sorted.map((t, i) => (
        <div key={t.name} onClick={() => { if (t.name === myTeamName) setView(VIEWS.SQUADS); else { setViewingTeam(t.name); setView(VIEWS.SQUADS); } }}
          style={{ ...card, display: "flex", alignItems: "center", gap: 10, background: i === 0 ? "rgba(39,174,96,0.08)" : card.background, borderColor: t.name === myTeamName ? "#c9a227" : "#2e2615", cursor: "pointer" }}>
          <span style={{ color: i === 0 ? "#27ae60" : "#8a7a5a", fontWeight: 800, fontSize: 15, minWidth: 20 }}>{i + 1}</span>
          <Crest emoji={t.crestEmoji} size={28} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {i === 0 && "🥇 "}{t.name}{t.name === myTeamName && <span style={{ color: "#27ae60", fontSize: 11 }}> (tú)</span>}
            </div>
            <div style={{ fontSize: 11, color: "#8a7a5a" }}>{t.played}PJ · {t.won}G {t.drawn}E {t.lost}P · {t.gf}-{t.ga}</div>
          </div>
          <div style={{ textAlign: "right" }}><div style={{ fontWeight: 800, color: "#f0c040", fontSize: 17 }}>{t.points}</div></div>
        </div>
      ))}
      <div style={{ marginTop: 14, fontSize: 11, color: "#3a5a7a", lineHeight: 1.6 }}>
        💰 Victoria +{fmtM(PRIZE_WIN)} · Empate +{fmtM(PRIZE_DRAW)} · Derrota +{fmtM(PRIZE_LOSS)} · Gol +{fmtM(PRIZE_GOAL_FOR)} · Gol recibido {fmtM(PRIZE_GOAL_AGAINST)}
      </div>
    </div>
  );
}
