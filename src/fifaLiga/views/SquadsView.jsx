import { VIEWS, RATINGS, PLAYER_POSITIONS as POS } from "../domain";
import { card, gold, goldLight } from "../styles";
import { Crest } from "../components";

const POS_ORDER = ["GK", "CB", "LB", "RB", "CDM", "CM", "CAM", "LM", "RM", "LW", "RW", "ST", "CF"];

export default function SquadsView({ view, viewingTeam, myTeamName, teams, setViewingTeam }) {
  if (view !== VIEWS.SQUADS) return null;
  const teamsToShow = viewingTeam ? teams.filter((t) => t.name === viewingTeam) : teams.filter((t) => t.name === myTeamName);
  const allTeams = viewingTeam ? teams : teams;
  return (
    <div>
      <h2 style={{ color: "#fff", fontWeight: 700, fontSize: 21, margin: 0 }}>Plantillas</h2>
      {viewingTeam && <p style={{ color: "#8a7a5a", fontSize: 12, marginBottom: 10, marginTop: 4 }} onMouseDown={() => setViewingTeam("")} onTouchStart={(e) => { setViewingTeam(""); e.currentTarget.blur(); }}>← Toca fuera para ver tu equipo</p>}
      {teamsToShow.map((t) => {
        const isMe = t.name === myTeamName;
        const squad = t.squad || {};
        const star = squad.star;
        const players = squad.players || [];
        const orderedPlayers = [...(star ? [star] : []), ...players];
        orderedPlayers.sort((a, b) => {
          const ai = POS_ORDER.indexOf(a.pos);
          const bi = POS_ORDER.indexOf(b.pos);
          if (ai !== bi) return ai - bi;
          return (b.overall || b.exth) - (a.overall || a.exth);
        });
        return (
          <div key={t.name} style={{ marginBottom: 27 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <Crest emoji={t.crestEmoji} size={28} />
              <span style={{ fontWeight: 700, fontSize: 16 }}>{t.name}{isMe && <span style={{ color: "#27ae60", fontSize: 11 }}> (tú)</span>}</span>
              {t.budget !== undefined && <span style={{ marginLeft: "auto", fontSize: 13, color: "#27ae60", fontWeight: 700 }}>€{t.budget.toLocaleString()}M</span>}
            </div>
            <div style={{ fontSize: 11, color: "#8a7a5a", marginBottom: 8 }}>
              {t.played || 0}PJ · {t.won || 0}G · {t.drawn || 0}E · {t.lost || 0}P · {t.points || 0}pts
            </div>
            {orderedPlayers.map((p, pi) => {
              const ovr = p.overall || p.exth || 50;
              const ovrClr = ovr >= 90 ? "#f0c040" : ovr >= 85 ? "#27ae60" : ovr >= 80 ? "#3498db" : ovr >= 75 ? "#8a7a5a" : "#5a5a5a";
              return (
                <div key={`${p.name}-${pi}`} style={{ ...card, display: "flex", alignItems: "center", gap: 8, borderLeft: `4px solid ${ovrClr}`, padding: "8px 10px" }}>
                  <div style={{ fontWeight: 700, fontSize: 18, color: ovrClr, minWidth: 26, textAlign: "center" }}>{ovr}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {p.name}{p.isLegend && " 👑"}
                    </div>
                    <div style={{ fontSize: 11, color: "#8a7a5a" }}>{p.pos} · {p.age ? `${p.age} años·` : ""}{ovr >= 90 ? "Élite" : ovr >= 85 ? "Estrella" : ovr >= 80 ? "Titular" : ovr >= 75 ? "Rotación" : "Promesa"}</div>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
