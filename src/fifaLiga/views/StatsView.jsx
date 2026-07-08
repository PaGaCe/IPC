import { VIEWS } from "../domain";
import { card, gold, goldLight } from "../styles";
import { Crest } from "../components";

function groupAndSort(arr, key, nameKey) {
  const grouped = {};
  arr.forEach((item) => {
    const k = item[key];
    if (!grouped[k]) grouped[k] = { name: item[nameKey], count: 0, value: 0, detail: "" };
    grouped[k].count += 1;
    grouped[k].value += item.value || 0;
    grouped[k].detail = item.detail || item.value?.toString() || "";
  });
  return Object.values(grouped).sort((a, b) => b.count - a.count || b.value - a.value);
}

export default function StatsView({ view, teams, myTeamName, statsCache, computeStats }) {
  if (view !== VIEWS.STATS) return null;
  const stats = statsCache || computeStats();
  return (
    <div>
      <h2 style={{ color: "#fff", fontWeight: 700, fontSize: 21, marginBottom: 12 }}>Estadísticas</h2>
      {[
        { title: "⚽ Goleadores", data: groupAndSort(stats, "player", "player").filter((x) => x.value > 0), type: "goals" },
        { title: "🎯 Asistencias", data: groupAndSort(stats, "player", "player").filter((x) => x.count > 0), type: "assists" },
        { title: "🌟 MVP", data: groupAndSort(stats, "mvp", "mvp"), type: "mvp" },
        { title: "🟡 Tarjetas Amarillas", data: groupAndSort(stats, "yellow", "yellow") },
        { title: "🔴 Tarjetas Rojas", data: groupAndSort(stats, "red", "red") },
      ].map((section) => (
        <div key={section.title} style={{ marginBottom: 18 }}>
          <div style={{ color: "#c9b88a", fontWeight: 700, fontSize: 13, marginBottom: 6 }}>{section.title}</div>
          {section.data.slice(0, 10).map((entry, i) => (
            <div key={i} style={{ ...card, display: "flex", alignItems: "center", gap: 8, padding: "6px 10px" }}>
              <span style={{ color: "#8a7a5a", fontWeight: 700, minWidth: 18, fontSize: 12 }}>#{i + 1}</span>
              <span style={{ flex: 1, fontWeight: 600, fontSize: 13 }}>{entry.name}</span>
              <span style={{ color: "#f0c040", fontWeight: 800, fontSize: 15 }}>
                {section.type === "goals" ? entry.value : section.type === "assists" ? entry.count : entry.count}
              </span>
            </div>
          ))}
          {section.data.length === 0 && <p style={{ color: "#3a5a7a", fontSize: 11 }}>Sin datos</p>}
        </div>
      ))}
    </div>
  );
}
