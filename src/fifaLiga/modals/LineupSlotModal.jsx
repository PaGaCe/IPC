import { FORMATIONS, FORMATION_NAMES } from "../domain";
import { btn } from "../styles";
import { posColor, ratingColor } from "../domain";

export default function LineupSlotModal({ lineupSlotModal, teams, allPlayersOf, assignPlayerToSlot, clearSlot, setLineupSlotModal }) {
  if (!lineupSlotModal) return null;
  const t = teams.find((x) => x.name === lineupSlotModal.teamName);
  if (!t) return null;
  const allP = allPlayersOf(t);
  const lineup = t.lineup || { formation: FORMATION_NAMES[0], slots: {} };
  const currentPlayerId = lineup.slots[lineupSlotModal.slotId];
  const slotInfo = (FORMATIONS[lineup.formation] || []).find((s) => s.id === lineupSlotModal.slotId);
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.82)", zIndex: 230, display: "flex", alignItems: "flex-end" }}
      onClick={() => setLineupSlotModal(null)}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#15110a", borderTop: "1px solid #2e2615", borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 600, margin: "0 auto", padding: "10px 18px 28px", maxHeight: "75vh", overflowY: "auto" }}>
        <div style={{ width: 36, height: 4, background: "#2e2615", borderRadius: 2, margin: "6px auto 16px" }} />
        <h3 style={{ color: "#fff", fontWeight: 700, marginBottom: 4, fontSize: 16 }}>Elegir jugador — {slotInfo?.label}</h3>
        <p style={{ color: "#8a7a5a", fontSize: 12, marginBottom: 14 }}>Toca un jugador para colocarlo en esta posición.</p>
        {currentPlayerId && (
          <button onClick={() => clearSlot(lineupSlotModal.teamName, lineupSlotModal.slotId)}
            style={{ ...btn("transparent"), border: "1px solid #c0392b", color: "#c0392b", marginBottom: 14 }}>Quitar jugador de esta posición</button>
        )}
        {allP.map((p) => {
          const isHere = p.id === currentPlayerId;
          const isElsewhere = !isHere && Object.values(lineup.slots).includes(p.id);
          return (
            <div key={p.id} onClick={() => assignPlayerToSlot(lineupSlotModal.teamName, lineupSlotModal.slotId, p.id)}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid #241e10", cursor: "pointer", opacity: isElsewhere ? 0.5 : 1 }}>
              <span style={{ background: posColor(p.pos || p.position), color: "#fff", borderRadius: 4, padding: "2px 6px", fontSize: 11, fontWeight: 700, minWidth: 36, textAlign: "center" }}>
                {p.pos || p.position}
              </span>
              <span style={{ flex: 1, fontWeight: 600, fontSize: 14 }}>
                {p.name}{isHere && <span style={{ color: "#27ae60", fontSize: 11 }}> (aquí)</span>}{isElsewhere && <span style={{ color: "#f0c040", fontSize: 11 }}> (en otra posición)</span>}
              </span>
              <span style={{ fontWeight: 800, color: ratingColor(p.overall) }}>{p.overall}</span>
            </div>
          );
        })}
        <button onClick={() => setLineupSlotModal(null)} style={{ ...btn("transparent"), border: "1px solid #2e2615", color: "#8a7a5a", marginTop: 14 }}>Cerrar</button>
      </div>
    </div>
  );
}
