import { VIEWS } from "../domain";
import { card, btn } from "../styles";

export default function MyLeaguesView({ view, userProfile, handleSignOut, setView, setLeagueCode, setMyTeamName, saveDevice, setStorageLoaded }) {
  if (view !== VIEWS.MY_LEAGUES) return null;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <h2 style={{ color: "#fff", fontWeight: 700, fontSize: 21, margin: 0 }}>Tus Ligas</h2>
        <button onClick={handleSignOut} style={{ background: "transparent", border: "1px solid #2e2615", color: "#8a7a5a", borderRadius: 8, padding: "5px 10px", cursor: "pointer", fontSize: 12 }}>
          Salir
        </button>
      </div>
      <p style={{ color: "#8a7a5a", fontSize: 13, marginBottom: 18 }}>
        {userProfile?.displayName}, elige una liga para continuar.
      </p>
      {(userProfile?.leagues || []).map((l) => (
        <div key={l.code} onClick={async () => { setLeagueCode(l.code); setMyTeamName(l.teamName); await saveDevice({ leagueCode: l.code, myTeamName: l.teamName }); setStorageLoaded(false); }} style={{ ...card, cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{l.teamName}</div>
            <div style={{ color: "#8a7a5a", fontSize: 12 }}>Código: {l.code}</div>
          </div>
          <span style={{ color: "#8a7a5a", fontSize: 18 }}>›</span>
        </div>
      ))}
      <button onClick={() => setView(VIEWS.HOME)} style={{ ...btn("transparent"), border: "1px solid #2e2615", color: "#8a7a5a", marginTop: 10 }}>
        + Unirme a otra liga / Crear una nueva
      </button>
    </div>
  );
}
