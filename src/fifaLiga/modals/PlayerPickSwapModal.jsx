import { MAX_SQUAD } from "../domain";
import { btn } from "../styles";
import { posColor } from "../domain";

export default function PlayerPickSwapModal({ playerPickSwapModal, teams, allPlayersOf, resolvePlayerPickSwap, setPlayerPickSwapModal }) {
  if (!playerPickSwapModal) return null;
  const t = teams.find((x) => x.name === playerPickSwapModal.championTeamName);
  if (!t) return null;
  const allP = allPlayersOf(t);
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.82)", zIndex: 230, display: "flex", alignItems: "flex-end" }}>
      <div style={{ background: "#15110a", borderTop: "1px solid #2e2615", borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 600, margin: "0 auto", padding: "20px 18px 28px", maxHeight: "85vh", overflowY: "auto" }}>
        <h3 style={{ color: "#fff", fontWeight: 700, marginBottom: 6, fontSize: 16 }}>Plantilla llena</h3>
        <p style={{ color: "#8a7a5a", fontSize: 13, marginBottom: 16 }}>
          Para añadir a <strong style={{ color: "#f0c040" }}>{playerPickSwapModal.newPlayer.name}</strong> ({playerPickSwapModal.newPlayer.overall}) tu plantilla está al límite ({MAX_SQUAD}). Elige a quién descartar:
        </p>
        {allP.filter((p) => p.id !== t?.squad?.star?.id).map((p, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid #241e10" }}>
            <span style={{ background: posColor(p.pos || p.position), color: "#fff", borderRadius: 4, padding: "2px 6px", fontSize: 11, fontWeight: 700, minWidth: 36, textAlign: "center" }}>
              {p.pos || p.position}
            </span>
            <span style={{ flex: 1, fontWeight: 600, fontSize: 14 }}>{p.name}</span>
            <span style={{ color: "#8a7a5a", fontSize: 12 }}>{p.overall}</span>
            <button onClick={() => resolvePlayerPickSwap(p.id)}
              style={{ background: "#c0392b", border: "none", color: "#fff", borderRadius: 7, padding: "6px 12px", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>Descartar y fichar</button>
          </div>
        ))}
        <button onClick={() => setPlayerPickSwapModal(null)} style={{ ...btn("transparent"), border: "1px solid #2e2615", color: "#8a7a5a", marginTop: 14 }}>Cancelar</button>
      </div>
    </div>
  );
}
