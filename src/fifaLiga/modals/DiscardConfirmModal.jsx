import { fmtM, clauseBase } from "../domain";
import { btn } from "../styles";

export default function DiscardConfirmModal({ discardConfirm, setDiscardConfirm, discardPlayer }) {
  if (!discardConfirm) return null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 240, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={() => setDiscardConfirm(null)}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#15110a", border: "1px solid #2e2615", borderRadius: 16, padding: 24, maxWidth: 340, textAlign: "center" }}>
        <p style={{ marginBottom: 8, fontWeight: 600, fontSize: 15 }}>
          ¿Descartar a <strong style={{ color: "#f0c040" }}>{discardConfirm.player.name}</strong>?
        </p>
        <p style={{ color: "#27ae60", fontWeight: 700, fontSize: 18, marginBottom: 8 }}>
          Recibirás {fmtM(((discardConfirm.player.clauseValue ?? clauseBase(discardConfirm.player.overall, discardConfirm.player.pos)) +
            (discardConfirm.player.clauseInvested || 0) * 2) / 2)}
        </p>
        <p style={{ color: "#8a7a5a", fontSize: 12, marginBottom: 20 }}>Mitad de su valor de cláusula actual.</p>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setDiscardConfirm(null)} style={{ ...btn("transparent"), border: "1px solid #2e2615", color: "#8a7a5a" }}>Cancelar</button>
          <button onClick={() => { discardPlayer(discardConfirm.teamName, discardConfirm.player); setDiscardConfirm(null); }} style={btn("#f0c040")}>Descartar</button>
        </div>
      </div>
    </div>
  );
}
