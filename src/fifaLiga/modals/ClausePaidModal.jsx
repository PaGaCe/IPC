import { fmtM, VIEWS } from "../domain";
import { btn } from "../styles";

export default function ClausePaidModal({ view, myTeamName, clauseAlerts, setClauseAlerts, save }) {
  if (view !== VIEWS.SQUADS || !myTeamName) return null;
  const myAlerts = clauseAlerts.filter((a) => a.teamName === myTeamName);
  if (myAlerts.length === 0) return null;
  const dismissAlerts = () => {
    const newClauseAlerts = clauseAlerts.filter((a) => a.teamName !== myTeamName);
    setClauseAlerts(newClauseAlerts);
    save({ clauseAlerts: newClauseAlerts });
  };
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 290, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#15110a", border: "1px solid #c0392b", borderRadius: 20, padding: 24, maxWidth: 340, width: "100%", textAlign: "center" }}>
        <div style={{ fontSize: 36, marginBottom: 10 }}>😱</div>
        <h3 style={{ color: "#c0392b", fontWeight: 800, fontSize: 18, marginBottom: 16 }}>¡Te han pagado una cláusula!</h3>
        {myAlerts.map((a, i) => (
          <div key={i} style={{ background: "#100d08", border: "1px solid #2e2615", borderRadius: 12, padding: "12px 16px", marginBottom: 10, textAlign: "left" }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#f0e6d2", marginBottom: 4 }}>{a.playerName}</div>
            <div style={{ fontSize: 13, color: "#8a7a5a" }}>
              <span style={{ color: "#e8c252", fontWeight: 700 }}>{a.buyerTeam}</span> ha pagado su cláusula por{" "}
              <span style={{ color: "#c0392b", fontWeight: 700 }}>{fmtM(a.amount)}</span>
            </div>
          </div>
        ))}
        <p style={{ color: "#8a7a5a", fontSize: 12, marginBottom: 16, marginTop: 8 }}>El dinero ya ha sido ingresado en tu cuenta.</p>
        <button onClick={dismissAlerts} style={{ ...btn("linear-gradient(135deg,#c9a227,#8a6f1a)"), fontSize: 14 }}>Entendido</button>
      </div>
    </div>
  );
}
