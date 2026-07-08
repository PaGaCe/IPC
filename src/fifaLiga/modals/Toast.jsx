export default function Toast({ toast, started }) {
  if (!toast) return null;
  return (
    <div style={{ position: "fixed", bottom: started ? 92 : 20, left: 16, right: 16, zIndex: 300, display: "flex", justifyContent: "center" }}>
      <div style={{ background: toast.type === "success" ? "#1a5f3a" : "#5a1a1a", border: `1px solid ${toast.type === "success" ? "#27ae60" : "#c0392b"}`, borderRadius: 10, padding: "10px 18px", color: "#fff", fontSize: 13, fontWeight: 600, maxWidth: 380, textAlign: "center", boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
        {toast.type === "success" ? "✅ " : "⚠️ "}{toast.text}
      </div>
    </div>
  );
}
