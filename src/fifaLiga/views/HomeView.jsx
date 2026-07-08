import { VIEWS } from "../domain";
import { card, input, btn } from "../styles";

export default function HomeView({ view, deviceLoaded, userProfile, homeError, leagueNameInput, setLeagueNameInput, joinCodeInput, setJoinCodeInput, setView, createLeague, checkJoinCode, handleSignOut }) {
  if (view !== VIEWS.HOME) return null;
  if (!deviceLoaded) {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px", color: "#8a7a5a" }}>
        <div style={{ fontSize: 24, marginBottom: 10 }}>⚽</div>
        <p style={{ fontSize: 13 }}>Cargando...</p>
      </div>
    );
  }
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <h2 style={{ color: "#fff", fontWeight: 700, fontSize: 21, margin: 0 }}>IPC</h2>
        {userProfile?.leagues?.length > 0 && (
          <button onClick={() => setView(VIEWS.MY_LEAGUES)} style={{ background: "transparent", border: "1px solid #2e2615", color: "#e8c252", borderRadius: 8, padding: "5px 10px", cursor: "pointer", fontSize: 12 }}>
            ← Tus ligas
          </button>
        )}
      </div>
      <p style={{ color: "#8a7a5a", fontSize: 14, marginBottom: 24 }}>
        Crea una liga nueva o únete a una con el código que te hayan compartido.
      </p>
      {homeError && (
        <div style={{ background: "#5a1a1a", border: "1px solid #c0392b", borderRadius: 10, padding: "10px 14px", color: "#fff", fontSize: 13, marginBottom: 16 }}>
          ⚠️ {homeError}
        </div>
      )}
      <div style={{ ...card, marginBottom: 14 }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 10 }}>🆕 Crear Liga</div>
        <input value={leagueNameInput} onChange={(e) => setLeagueNameInput(e.target.value)} placeholder="Nombre de la liga..." style={{ ...input, marginBottom: 10 }} />
        <button onClick={createLeague} style={btn("linear-gradient(135deg,#c9a227,#e8c252)")}>Crear y ser admin</button>
      </div>
      <div style={card}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 10 }}>🔑 Unirme a una Liga</div>
        <input value={joinCodeInput} onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())} placeholder="Código de liga (ej. AB3X9P)" style={{ ...input, marginBottom: 10, textTransform: "uppercase" }} maxLength={6} />
        <button onClick={checkJoinCode} style={btn()}>Buscar liga</button>
      </div>
      <button onClick={handleSignOut} style={{ background: "transparent", border: "none", color: "#8a7a5a", cursor: "pointer", fontSize: 12, marginTop: 16, textDecoration: "underline" }}>
        Cerrar sesión
      </button>
    </div>
  );
}
