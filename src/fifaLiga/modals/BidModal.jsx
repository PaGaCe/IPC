import { ratingColor, posColor, fmtM } from "../domain";
import { input, btn } from "../styles";

export default function BidModal({ bidModal, bids, myTeamName, getAvailableBudget, bidAmountStr, setBidAmountStr, setBidModal, cancelBid, confirmBid }) {
  if (!bidModal) return null;
  const player = bidModal;
  const myBid = bids[player.marketId]?.[myTeamName] || 0;
  const totalBids = Object.keys(bids[player.marketId] || {}).length;
  const available = getAvailableBudget(myTeamName, player.marketId);
  const amount = parseFloat(bidAmountStr) || 0;
  const quickAmounts = [player.baseValue, Math.round(player.baseValue * 1.5 * 10) / 10, Math.round(player.baseValue * 2 * 10) / 10];
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 280, display: "flex", alignItems: "flex-end" }}
      onClick={() => setBidModal(null)}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#15110a", borderTop: "1px solid #2e2615", borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 600, margin: "0 auto", padding: "10px 18px 28px", maxHeight: "85vh", overflowY: "auto" }}>
        <div style={{ width: 36, height: 4, background: "#2e2615", borderRadius: 2, margin: "6px auto 16px" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div style={{ background: ratingColor(player.overall), borderRadius: 10, minWidth: 52, height: 52, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 21, color: "#000" }}>
            {player.overall}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
              <span style={{ background: posColor(player.pos), color: "#fff", borderRadius: 4, padding: "2px 6px", fontSize: 11, fontWeight: 700 }}>{player.pos}</span>
              <span style={{ fontWeight: 700, fontSize: 16 }}>{player.name}</span>
            </div>
            <div style={{ fontSize: 12, color: "#8a7a5a" }}>{player.nat} · {player.club}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 14, fontSize: 13, marginBottom: 18, flexWrap: "wrap" }}>
          <span style={{ color: "#8a7a5a" }}>👥 {totalBids} {totalBids === 1 ? "puja activa" : "pujas activas"}</span>
          <span style={{ color: "#27ae60" }}>💰 Disponible: <strong>{fmtM(available + myBid)}</strong></span>
        </div>
        <div style={{ color: "#c9b88a", fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Tu puja (mín. {fmtM(player.baseValue)})</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <button onClick={() => setBidAmountStr(String(Math.max(player.baseValue, Math.round((amount - 1) * 10) / 10)))}
            style={{ background: "#2e2615", border: "none", color: "#fff", borderRadius: 10, width: 40, height: 40, fontSize: 18, cursor: "pointer" }}>−</button>
          <input type="number" inputMode="decimal" value={bidAmountStr} onChange={(e) => setBidAmountStr(e.target.value)}
            style={{ ...input, textAlign: "center", fontSize: 22, fontWeight: 800, color: "#f0c040", flex: 1 }} />
          <button onClick={() => setBidAmountStr(String(Math.round((amount + 1) * 10) / 10))}
            style={{ background: "#2e2615", border: "none", color: "#fff", borderRadius: 10, width: 40, height: 40, fontSize: 18, cursor: "pointer" }}>+</button>
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {quickAmounts.map((qa, i) => (
            <button key={i} onClick={() => setBidAmountStr(String(qa))}
              style={{ flex: 1, background: "#100d08", border: "1px solid #2e2615", color: "#c9b88a", borderRadius: 8, padding: "8px 4px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              {fmtM(qa)}
            </button>
          ))}
        </div>
        {myBid > 0 && (
          <button onClick={() => cancelBid(player.marketId)}
            style={{ ...btn("transparent"), border: "1px solid #c0392b", color: "#c0392b", marginBottom: 10 }}>
            Cancelar mi puja actual ({fmtM(myBid)})
          </button>
        )}
        <button onClick={confirmBid} style={btn("linear-gradient(135deg,#c9a227,#e8c252)")}>
          {myBid > 0 ? "Actualizar puja" : "Confirmar puja"}
        </button>
      </div>
    </div>
  );
}
