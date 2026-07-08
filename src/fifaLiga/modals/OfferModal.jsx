import { input, btn } from "../styles";
import { posColor, ratingColor } from "../domain";

export default function OfferModal({ offerModal, offerAmountStr, setOfferAmountStr, setOfferModal, submitOffer }) {
  if (!offerModal) return null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 240, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={() => setOfferModal(null)}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#15110a", border: "1px solid #2e2615", borderRadius: 16, padding: 24, maxWidth: 360, width: "100%" }}>
        <h3 style={{ color: "#fff", fontWeight: 700, marginBottom: 12, fontSize: 16 }}>Hacer oferta</h3>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <span style={{ background: posColor(offerModal.player.pos), color: "#fff", borderRadius: 4, padding: "2px 6px", fontSize: 11, fontWeight: 700 }}>
            {offerModal.player.pos}
          </span>
          <span style={{ fontWeight: 700, fontSize: 15 }}>{offerModal.player.name}</span>
          <span style={{ color: ratingColor(offerModal.player.overall), fontWeight: 800 }}>{offerModal.player.overall}</span>
        </div>
        <p style={{ color: "#8a7a5a", fontSize: 12, marginBottom: 8 }}>
          De: <strong>{offerModal.teamName}</strong>. El precio es libre, el equipo rival puede aceptarla o rechazarla.
        </p>
        <input type="number" inputMode="decimal" min="0.5" step="0.5" placeholder="Importe en M€" value={offerAmountStr}
          onChange={(e) => setOfferAmountStr(e.target.value)} style={{ ...input, marginBottom: 16, fontSize: 15 }} />
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setOfferModal(null)} style={{ ...btn("transparent"), border: "1px solid #2e2615", color: "#8a7a5a" }}>Cancelar</button>
          <button onClick={submitOffer} style={btn()}>Enviar oferta</button>
        </div>
      </div>
    </div>
  );
}
