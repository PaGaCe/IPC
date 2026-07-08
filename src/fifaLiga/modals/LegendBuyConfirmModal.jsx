import { btn } from "../styles";

export default function LegendBuyConfirmModal({ legendBuyConfirm, myTeamName, buyLegend }) {
  if (!legendBuyConfirm) return null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 240, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#15110a", border: "1px solid #c0392b", borderRadius: 16, padding: 24, maxWidth: 340, textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 10 }}>🏆</div>
        <p style={{ marginBottom: 6, fontWeight: 700, fontSize: 16, color: "#fff" }}>¡Leyenda disponible!</p>
        <p style={{ color: "#8a7a5a", fontSize: 12, marginBottom: 20 }}>
          El jugador se unirá a <strong>{myTeamName}</strong>. Esta operación no se puede deshacer.
        </p>
        <button onClick={() => buyLegend(legendBuyConfirm)} style={btn("#c0392b")}>Confirmar compra</button>
      </div>
    </div>
  );
}
