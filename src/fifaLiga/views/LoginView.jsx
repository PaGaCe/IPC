import { VIEWS } from "../domain";
import { btn } from "../styles";
import logoImg from "../../src/assets/logo.webp";

export default function LoginView({ view, authLoading, authError, handleGoogleSignIn }) {
  if (view !== VIEWS.LOGIN) return null;
  return (
    <div style={{ textAlign: "center", padding: "60px 20px" }}>
      {authLoading ? (
        <>
          <img src={logoImg} alt="IPC" style={{ width: 120, height: 120, objectFit: "contain", marginBottom: 14, borderRadius: 16 }} />
          <p style={{ color: "#8a7a5a", fontSize: 13 }}>Cargando sesión...</p>
        </>
      ) : (
        <>
          <div style={{ fontSize: 40, marginBottom: 14 }}>⚽</div>
          <h2 style={{ color: "#fff", fontWeight: 700, fontSize: 21, marginBottom: 8 }}>IPC</h2>
          <p style={{ color: "#8a7a5a", fontSize: 14, marginBottom: 24 }}>
            Inicia sesión para guardar tus ligas y volver a entrar cuando quieras.
          </p>
          {authError && (
            <div style={{ background: "#5a1a1a", border: "1px solid #c0392b", borderRadius: 10, padding: "10px 14px", color: "#fff", fontSize: 13, marginBottom: 16 }}>
              ⚠️ {authError}
            </div>
          )}
          <button onClick={handleGoogleSignIn} style={{ ...btn("#fff"), color: "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, maxWidth: 280, margin: "0 auto" }}>
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84c-.21 1.13-.85 2.08-1.81 2.72v2.26h2.92c1.71-1.57 2.69-3.88 2.69-6.62z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.71H.96v2.33C2.44 15.98 5.48 18 9 18z"/>
              <path fill="#FBBC05" d="M3.97 10.71c-.18-.54-.28-1.11-.28-1.71s.1-1.17.28-1.71V4.96H.96A8.99 8.99 0 0 0 0 9c0 1.45.35 2.83.96 4.04l3.01-2.33z"/>
              <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0 5.48 0 2.44 2.02.96 4.96l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"/>
            </svg>
            Continuar con Google
          </button>
        </>
      )}
    </div>
  );
}
