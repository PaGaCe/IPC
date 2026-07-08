import { useState, useEffect, useRef } from "react";
import {
  FORMATION_NAMES,
  FORMATIONS,
  allPlayersOf,
  posColor,
  ratingColor,
} from "./domain";

export function Crest({ emoji, size = 28 }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 6,
        background: "#2e2615",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        fontSize: size * 0.6,
        lineHeight: 1,
      }}
    >
      {emoji || "⚽"}
    </div>
  );
}

// Lets the user pick a team crest using their device's native emoji
// keyboard, instead of uploading an image (no file size, no Firestore
// 1MB-per-document risk). Tapping the crest opens a tiny text input;
// typing/selecting an emoji there and tapping away (blur) or pressing
// Enter saves it.
export function EmojiCrestPicker({ emoji, size = 32, onChange }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(emoji || "");
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus();
  }, [editing]);

  const commit = () => {
    setEditing(false);
    if (draft && draft !== emoji) onChange(draft);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
        }}
        placeholder="⚽"
        style={{
          width: size + 20,
          height: size,
          borderRadius: 6,
          textAlign: "center",
          background: "#100d08",
          border: "1px solid #c9a227",
          color: "#e8eaf0",
          fontSize: size * 0.55,
          outline: "none",
        }}
      />
    );
  }
  return (
    <button
      onClick={() => {
        setDraft(emoji || "");
        setEditing(true);
      }}
      style={{
        background: "none",
        border: "none",
        padding: 0,
        cursor: "pointer",
      }}
    >
      <Crest emoji={emoji} size={size} />
    </button>
  );
}

export function StatBlock({ title, data, field, color }) {
  return (
    <div
      style={{
        background: "#15110a",
        border: "1px solid #2e2615",
        borderRadius: 14,
        padding: "14px 16px",
        marginBottom: 12,
      }}
    >
      <div
        style={{
          color: "#fff",
          fontWeight: 700,
          fontSize: 14,
          marginBottom: 10,
        }}
      >
        {title}
      </div>
      {data.length === 0 ? (
        <p style={{ color: "#8a7a5a", fontSize: 13 }}>Sin datos aún.</p>
      ) : (
        data.map((p, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "7px 0",
              borderBottom: "1px solid #241e10",
            }}
          >
            <span
              style={{
                color: i === 0 ? color : "#8a7a5a",
                fontWeight: 800,
                minWidth: 18,
                fontSize: 13,
              }}
            >
              {i + 1}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: 13,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {p.name}
              </div>
              <div style={{ fontSize: 10, color: "#8a7a5a" }}>{p.teamName}</div>
            </div>
            <span
              style={{
                fontWeight: 800,
                color,
                fontSize: 15,
                minWidth: 22,
                textAlign: "right",
              }}
            >
              {p[field]}
            </span>
          </div>
        ))
      )}
    </div>
  );
}

export function LineupField({ team, onSlotTap }) {
  const lineup = team.lineup || { formation: FORMATION_NAMES[0], slots: {} };
  const slots = FORMATIONS[lineup.formation] || FORMATIONS[FORMATION_NAMES[0]];
  const allP = allPlayersOf(team);
  const validIds = new Set(allP.map((p) => p.id));

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: "2/3",
        background: "linear-gradient(180deg,#1a5f3a,#0d3a22)",
        borderRadius: 14,
        border: "1px solid #2e2615",
        overflow: "hidden",
        marginBottom: 14,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: 0,
          right: 0,
          height: 1,
          background: "rgba(255,255,255,0.15)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: 60,
          height: 60,
          marginLeft: -30,
          marginTop: -30,
          border: "1px solid rgba(255,255,255,0.15)",
          borderRadius: "50%",
        }}
      />

      {slots.map((slot) => {
        const rawPlayerId = lineup.slots[slot.id];
        const playerId =
          rawPlayerId && validIds.has(rawPlayerId) ? rawPlayerId : null; // ← descarta huérfanos
        const player = playerId ? allP.find((p) => p.id === playerId) : null;
        return (
          <div
            key={slot.id}
            onClick={() => onSlotTap(slot.id)}
            style={{
              position: "absolute",
              left: `${slot.x}%`,
              top: `${slot.y}%`,
              transform: "translate(-50%,-50%)",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
              width: 64,
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: player
                  ? ratingColor(player.overall)
                  : "rgba(255,255,255,0.12)",
                border: player
                  ? "2px solid #fff"
                  : "2px dashed rgba(255,255,255,0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                fontSize: 14,
                color: player ? "#000" : "rgba(255,255,255,0.6)",
              }}
            >
              {player ? player.overall : "+"}
            </div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "#fff",
                textAlign: "center",
                background: "rgba(0,0,0,0.55)",
                borderRadius: 4,
                padding: "1px 5px",
                whiteSpace: "nowrap",
                maxWidth: 64,
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {player ? player.name.split(" ").slice(-1)[0] : slot.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function EventPickerStyled({
  teams,
  allTeams,
  events,
  onAdd,
  onRemove,
  accentColor,
}) {
  const [selTeam, setSelTeam] = useState(teams[0]);
  const [selPlayer, setSelPlayer] = useState("");
  const t = allTeams.find((x) => x.name === selTeam);
  const allP = (t
    ? [t.squad?.star, ...(t.squad?.squad || [])].filter(Boolean)
    : []
  ).sort(
    (a, b) =>
      (b.goals || 0) +
      (b.assists || 0) +
      (b.mvps || 0) -
      ((a.goals || 0) + (a.assists || 0) + (a.mvps || 0)),
  );

  return (
    <div>
      <div
        style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}
      >
        <select
          value={selTeam}
          onChange={(e) => {
            setSelTeam(e.target.value);
            setSelPlayer("");
          }}
          style={{
            background: "#100d08",
            border: "1px solid #2e2615",
            borderRadius: 8,
            padding: "7px 10px",
            color: "#e8eaf0",
            fontSize: 12,
          }}
        >
          {teams.map((tn) => (
            <option key={tn} value={tn}>
              {tn}
            </option>
          ))}
        </select>
        <select
          value={selPlayer}
          onChange={(e) => setSelPlayer(e.target.value)}
          style={{
            background: "#100d08",
            border: "1px solid #2e2615",
            borderRadius: 8,
            padding: "7px 10px",
            color: "#e8eaf0",
            fontSize: 12,
            flex: 1,
            minWidth: 120,
          }}
        >
          <option value="">Seleccionar jugador...</option>
          {allP.map((p) => (
            <option key={p.id} value={p.id}>
              [{p.pos}] {p.name}
              {p.goals > 0 || p.assists > 0 || p.mvps > 0
                ? ` (⚽${p.goals || 0} 🅰️${p.assists || 0})`
                : ""}
            </option>
          ))}
        </select>
        <button
          onClick={() => {
            onAdd(selTeam, selPlayer);
            setSelPlayer("");
          }}
          disabled={!selPlayer}
          style={{
            background: selPlayer ? accentColor : "#241e10",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "7px 14px",
            cursor: selPlayer ? "pointer" : "not-allowed",
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          +
        </button>
      </div>
      {events.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {events.map((ev, i) => {
            const team = allTeams.find((x) => x.name === ev.team);
            const player = team
              ? [team.squad?.star, ...(team.squad?.squad || [])]
                  .filter(Boolean)
                  .find((p) => p.id === ev.playerId)
              : null;
            return (
              <div
                key={i}
                style={{
                  background: "#100d08",
                  border: `1px solid ${accentColor}30`,
                  borderRadius: 10,
                  padding: "4px 10px",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  fontSize: 11,
                }}
              >
                <span
                  style={{
                    background: posColor(player?.pos),
                    borderRadius: 3,
                    padding: "1px 4px",
                    fontSize: 9,
                    color: "#fff",
                    fontWeight: 800,
                  }}
                >
                  {player?.pos || "?"}
                </span>
                <span>{player?.name || "?"}</span>
                <span style={{ color: "#5a5040", fontSize: 10 }}>
                  ({ev.team})
                </span>
                <button
                  onClick={() => onRemove(i)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#c0392b",
                    cursor: "pointer",
                    fontWeight: 700,
                    fontSize: 12,
                    padding: 0,
                  }}
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function Pagination({ page, totalPages, onPrev, onNext }) {
  if (totalPages <= 1) return null;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        marginTop: 14,
      }}
    >
      <button
        disabled={page === 1}
        onClick={onPrev}
        style={{
          background:
            page === 1 ? "#100d08" : "linear-gradient(135deg,#c9a227,#8a6f1a)",
          color: page === 1 ? "#3a3020" : "#0a0805",
          border: `1px solid ${page === 1 ? "#2e2615" : "#c9a227"}`,
          borderRadius: 8,
          padding: "6px 14px",
          cursor: page === 1 ? "not-allowed" : "pointer",
          fontWeight: 700,
          fontSize: 12,
        }}
      >
        ← Ant
      </button>
      <span style={{ color: "#c9b88a", fontSize: 12, fontWeight: 600 }}>
        {page} / {totalPages}
      </span>
      <button
        disabled={page === totalPages}
        onClick={onNext}
        style={{
          background:
            page === totalPages
              ? "#100d08"
              : "linear-gradient(135deg,#c9a227,#8a6f1a)",
          color: page === totalPages ? "#3a3020" : "#0a0805",
          border: `1px solid ${page === totalPages ? "#2e2615" : "#c9a227"}`,
          borderRadius: 8,
          padding: "6px 14px",
          cursor: page === totalPages ? "not-allowed" : "pointer",
          fontWeight: 700,
          fontSize: 12,
        }}
      >
        Sig →
      </button>
    </div>
  );
}
