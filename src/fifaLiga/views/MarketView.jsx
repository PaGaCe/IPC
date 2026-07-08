import { VIEWS } from "../domain";
import { card, gold, goldLight } from "../styles";
import { PlayerRow } from "./PlayerRow";

export default function MarketView({ view, myTeamName, teams, marketType, setMarketType, marketPlayers, buyNowMarket, toggleListForSale, setDiscardConfirm, openOfferModal, setClauseConfirm, clauseInvestInput, setClauseInvestInput, investInClause }) {
  if (view !== VIEWS.MARKET) return null;
  const myTeam = teams.find((t) => t.name === myTeamName);
  const soldPlayers = myTeam?.squad?.soldPlayers || [];
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <h2 style={{ color: "#fff", fontWeight: 700, fontSize: 21, margin: 0 }}>Mercado</h2>
        <div style={{ display: "flex", gap: 4 }}>
          {["tranfers", "clausulas"].map((t) => (
            <button key={t} onClick={() => setMarketType(t)} style={{ background: marketType === t ? "rgba(201,162,39,0.2)" : "transparent", border: `1px solid ${marketType === t ? "#c9a227" : "#2e2615"}`, color: marketType === t ? "#c9a227" : "#8a7a5a", borderRadius: 20, padding: "5px 12px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
              {t === "tranfers" ? "🔄 Traspasos" : "📄 Cláusulas"}
            </button>
          ))}
        </div>
      </div>
      <p style={{ color: "#8a7a5a", fontSize: 12, marginBottom: 14 }}>
        Presupuesto: <strong style={{ color: "#27ae60" }}>{myTeam?.budget !== undefined ? `${myTeam.budget.toLocaleString()}M€` : "N/A"}</strong>
        {soldPlayers.length > 0 && <span style={{ marginLeft: 8, color: "#8a7a5a" }}>{soldPlayers.length} vendidos</span>}
      </p>
      <div style={{ marginBottom: 12, display: "flex", flexWrap: "wrap", gap: 6 }}>
        {["market", "draft", "legends"].map((cat) => {
          if (cat === "legends" && !marketPlayers.some((p) => p.cat === "legends")) return null;
          const count = marketPlayers.filter((p) => p.cat === cat).length;
          return (
            <button key={cat} onClick={() => setMarketType(cat)} style={{ background: marketType === cat ? "rgba(201,162,39,0.2)" : "transparent", border: `1px solid ${marketType === cat && !["tranfers","clausulas"].includes(cat) ? "#c9a227" : "#2e2615"}`, color: marketType === cat && !["tranfers","clausulas"].includes(cat) ? "#c9a227" : "#8a7a5a", borderRadius: 20, padding: "5px 12px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
              {cat === "market" ? "📊 Mercado" : cat === "draft" ? "⭐ Estrellas" : "👑 Leyendas"}{count > 0 && ` (${count})`}
            </button>
          );
        })}
      </div>
      {marketType === "tranfers" ? (
        <div>
          {teams.filter((t) => t.name !== myTeamName).map((t) => (
            <div key={t.name} style={{ marginBottom: 16 }}>
              <div style={{ color: "#c9b88a", fontWeight: 700, fontSize: 12, marginBottom: 6 }}>{t.name}</div>
              {(t.squad?.players || []).filter((p) => p.listed).length === 0 && (t.squad?.star?.listed ? 0 : 1) === 0 && (
                <p style={{ color: "#3a5a7a", fontSize: 11 }}>Sin jugadores en venta</p>
              )}
              {[t.squad?.star, ...(t.squad?.players || [])].filter(Boolean).map((p, i) => {
                if (!p.listed) return null;
                return <PlayerRow key={`${p.name}-${i}`} player={p} myTeamName={myTeamName} teams={teams} toggleListForSale={toggleListForSale} setDiscardConfirm={setDiscardConfirm} openOfferModal={openOfferModal} setClauseConfirm={setClauseConfirm} clauseInvestInput={clauseInvestInput} setClauseInvestInput={setClauseInvestInput} investInClause={investInClause} />;
              })}
            </div>
          ))}
        </div>
      ) : marketType === "clausulas" ? (
        <div>
          {myTeam?.squad?.clauseInvestments && myTeam.squad.clauseInvestments.length > 0 ? (
            myTeam.squad.clauseInvestments.map((ci, i) => (
              <div key={i} style={{ ...card, marginBottom: 6 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{ci.playerName}</div>
                <div style={{ color: "#8a7a5a", fontSize: 11 }}>Invertido: {ci.totalInvested}M€ · Cláusula: {ci.clauseAmount}M€</div>
                <div style={{ marginTop: 6, display: "flex", gap: 6, alignItems: "center" }}>
                  <input value={clauseInvestInput[`${ci.playerName}-${ci.ownerTeam}`] || ""} onChange={(e) => setClauseInvestInput((prev) => ({ ...prev, [`${ci.playerName}-${ci.ownerTeam}`]: e.target.value }))} placeholder="Cantidad" style={{ background: "#1a1a1a", border: "1px solid #2e2615", borderRadius: 6, padding: "6px 10px", color: "#e8c252", width: 80, fontSize: 12 }} />
                  <button onClick={() => investInClause(ci.playerName, ci.ownerTeam)} style={{ background: "linear-gradient(135deg,#c9a227,#e8c252)", color: "#fff", border: "none", borderRadius: 6, padding: "6px 12px", cursor: "pointer", fontWeight: 600, fontSize: 12 }}>Invertir</button>
                </div>
              </div>
            ))
          ) : (
            <p style={{ color: "#3a5a7a", fontSize: 11 }}>No hay cláusulas activas</p>
          )}
        </div>
      ) : (
        <div>
          {marketPlayers.filter((p) => p.cat === marketType).map((p, i) => (
            <PlayerRow key={`${p.name}-${i}`} player={p} market onBuy={() => buyNowMarket(p)} myTeamName={myTeamName} teams={teams} toggleListForSale={toggleListForSale} setDiscardConfirm={setDiscardConfirm} openOfferModal={openOfferModal} setClauseConfirm={setClauseConfirm} clauseInvestInput={clauseInvestInput} setClauseInvestInput={setClauseInvestInput} investInClause={investInClause} />
          ))}
          {marketPlayers.filter((p) => p.cat === marketType).length === 0 && (
            <p style={{ color: "#3a5a7a", fontSize: 11, textAlign: "center", padding: 20 }}>No hay jugadores disponibles en esta categoría</p>
          )}
        </div>
      )}
    </div>
  );
}
