import { fmtM } from "../domain";
import { btn } from "../styles";

export default function ClauseConfirmModal({ clauseConfirm, setClauseConfirm, payClause }) {
  if (!clauseConfirm) return null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 240, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={() => setClauseConfirm(null)}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#15110a", border: "1px solid #2e2615", borderRadius: 16, padding: 24, maxWidth: 340, textAlign: "center" }}>
        <p style={{ marginBottom: 8, fontWeight: 600, fontSize: 15 }}>
          ¿Pagar la cláusula de <strong style={{ color: "#f0c040" }}>{clauseConfirm.player.name}</strong> ({clauseConfirm.sellerTeam})?
        </p>
        <p style={{ color: "#c0392b", fontWeight: 700, fontSize: 20, marginBottom: 8 }}>{fmtM(clauseConfirm.clauseTotal)}</p>
        <p style={{ color: "#8a7a5a", fontSize: 12, marginBottom: 20 }}>El equipo rival no puede negarse.</p>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setClauseConfirm(null)} style={{ ...btn("transparent"), border: "1px solid #2e2615", color: "#8a7a5a" }}>Cancelar</button>
          <button onClick={() => payClause(clauseConfirm.sellerTeam, clauseConfirm.player, clauseConfirm.clauseTotal)} style={btn("#c0392b")}>Pagar y fichar</button>
        </div>
      </div>
    </div>
  );
}
