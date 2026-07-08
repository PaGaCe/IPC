import { VIEWS } from "./domain";

export const bg = "#0a0805";
export const gold = "#c9a227";
export const goldLight = "#e8c252";
export const goldDark = "#8a6f1a";
export const card = {
  background: "#15110a",
  border: "1px solid #2e2615",
  borderRadius: 14,
  padding: "14px 16px",
  marginBottom: 10,
};
export const input = {
  background: "#100d08",
  border: "1px solid #2e2615",
  borderRadius: 10,
  padding: "12px 14px",
  color: "#f0e6d2",
  fontSize: 15,
  outline: "none",
  width: "100%",
};
export const btn = (col) => ({
  background: col || "linear-gradient(135deg,#c9a227,#8a6f1a)",
  color: col ? "#fff" : "#0a0805",
  border: "none",
  borderRadius: 12,
  padding: "13px 20px",
  cursor: "pointer",
  fontWeight: 700,
  fontSize: 15,
  width: "100%",
});
export const pill = (active) => ({
  background: active ? "linear-gradient(135deg,#c9a227,#8a6f1a)" : "#100d08",
  color: active ? "#0a0805" : "#c9a98a",
  border: "1px solid #2e2615",
  borderRadius: 20,
  padding: "7px 14px",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: 13,
  whiteSpace: "nowrap",
  display: "flex",
  alignItems: "center",
  gap: 6,
});

export const NAV_ITEMS = [
  { v: VIEWS.TABLE, icon: "🏆", label: "Liga" },
  { v: VIEWS.FIXTURES, icon: "📅", label: "Partidos" },
  { v: VIEWS.MARKET, icon: "🏪", label: "Mercado" },
  { v: VIEWS.TRANSFERS, icon: "🔄", label: "Traspasos" },
  { v: VIEWS.SQUADS, icon: "👥", label: "Plantillas" },
];
