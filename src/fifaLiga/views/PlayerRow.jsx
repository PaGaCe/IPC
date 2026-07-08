import { clauseBase, isClauseLocked, clauseLockRemainingMs, posColor, ratingColor, clubLogos, fmtM } from "../domain";
import { CountryFlag } from "../flags";
import { input } from "../styles";

export function PlayerRow({ p, teamName, mode, teams, toggleListForSale, setDiscardConfirm, openOfferModal, setClauseConfirm, clauseInvestInput, setClauseInvestInput, investInClause }) {
  const clauseTotal =
    (p.clauseValue ?? clauseBase(p.overall, p.pos)) +
    (p.clauseInvested || 0) * 2;
  const team = teams.find((t) => t.name === teamName);
  const isStar = team?.squad?.star?.name === p.name;
  const locked = mode === "other" && isClauseLocked(p);
  const hoursLeft = locked
    ? Math.ceil(clauseLockRemainingMs(p) / (60 * 60 * 1000))
    : 0;
  const ICON_SIZE = 28;

  return (
    <div style={{ padding: "12px 0", borderBottom: "1px solid #241e10" }}>
      <div style={{ display: "flex", gap: 12, alignItems: "stretch" }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-around",
            alignItems: "center",
            width: ICON_SIZE + 8,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: ICON_SIZE + 8,
              height: ICON_SIZE,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: posColor(p.pos || p.position),
              borderRadius: 6,
            }}
          >
            <span
              style={{
                color: "#fff",
                fontSize: 9,
                fontWeight: 800,
                textAlign: "center",
                lineHeight: 1,
              }}
            >
              {p.pos || p.position}
            </span>
          </div>
          <div
            style={{
              width: ICON_SIZE + 8,
              height: ICON_SIZE,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CountryFlag country={p.nat} />
          </div>
          <div
            style={{
              width: ICON_SIZE + 8,
              height: ICON_SIZE,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {clubLogos[p.club] ? (
              <img
                src={clubLogos[p.club]}
                alt={p.club}
                style={{ width: ICON_SIZE, height: ICON_SIZE, objectFit: "contain" }}
              />
            ) : (
              <span
                style={{
                  fontSize: 9,
                  color: "#8a7a5a",
                  textAlign: "center",
                  lineHeight: 1.1,
                }}
              >
                {p.club}
              </span>
            )}
          </div>
        </div>

        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-around",
            gap: 4,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span
              style={{
                fontWeight: 700,
                fontSize: 14,
                color: "#f0e6d2",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                flex: 1,
                marginRight: 8,
              }}
            >
              {p.name}
            </span>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                flexShrink: 0,
              }}
            >
              {p.marketValue &&
                p.marketValue > clauseBase(p.overall, p.pos) && (
                  <span
                    style={{
                      fontSize: 11,
                      color: "#27ae60",
                      fontWeight: 700,
                    }}
                  >
                    ↑{fmtM(p.marketValue)}
                  </span>
                )}
              <span
                style={{
                  fontWeight: 800,
                  color: ratingColor(p.overall),
                  fontSize: 17,
                }}
              >
                {p.overall}
              </span>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 10,
              fontSize: 11,
              color: "#8a7a5a",
              minHeight: 16,
            }}
          >
            {p.goals > 0 && <span>⚽ {p.goals}</span>}
            {p.assists > 0 && <span>🅰️ {p.assists}</span>}
            {p.mvps > 0 && <span>🏅 {p.mvps}</span>}
            {!p.goals && !p.assists && !p.mvps && (
              <span style={{ color: "#3a3020" }}>Sin estadísticas</span>
            )}
          </div>

          <div
            style={{
              display: "flex",
              gap: 6,
              flexWrap: "wrap",
              minHeight: 16,
            }}
          >
            {mode === "own" && !isStar && (
              <>
                <button
                  onClick={() =>
                    toggleListForSale(teamName, p.id, !p.listedForSale)
                  }
                  style={{
                    background: "transparent",
                    border: "1px solid #c9a227",
                    color: "#e8c252",
                    borderRadius: 6,
                    padding: "3px 8px",
                    cursor: "pointer",
                    fontSize: 11,
                  }}
                >
                  {p.listedForSale ? "Quitar del mercado" : "Poner en venta"}
                </button>
                <button
                  onClick={() => setDiscardConfirm({ teamName, player: p })}
                  style={{
                    background: "transparent",
                    border: "1px solid #f0c040",
                    color: "#f0c040",
                    borderRadius: 6,
                    padding: "3px 8px",
                    cursor: "pointer",
                    fontSize: 11,
                  }}
                >
                  Descartar
                </button>
              </>
            )}
            {mode === "other" && !isStar && (
              <>
                <button
                  onClick={() => openOfferModal(teamName, p)}
                  style={{
                    background: "transparent",
                    border: "1px solid #c9a227",
                    color: "#e8c252",
                    borderRadius: 6,
                    padding: "3px 8px",
                    cursor: "pointer",
                    fontSize: 11,
                  }}
                >
                  Ofertar
                </button>
                <button
                  onClick={() =>
                    !locked &&
                    setClauseConfirm({
                      sellerTeam: teamName,
                      player: p,
                      clauseTotal,
                    })
                  }
                  disabled={locked}
                  style={{
                    background: "transparent",
                    border: `1px solid ${locked ? "#3a3020" : "#c0392b"}`,
                    color: locked ? "#3a3020" : "#c0392b",
                    borderRadius: 6,
                    padding: "3px 8px",
                    cursor: locked ? "not-allowed" : "pointer",
                    fontSize: 11,
                  }}
                >
                  Pagar cláusula
                </button>
              </>
            )}
          </div>

          <div
            style={{
              display: "flex",
              gap: 6,
              flexWrap: "wrap",
              alignItems: "center",
              minHeight: 16,
            }}
          >
            {mode === "own" && !isStar && (
              <>
                <span
                  style={{
                    color: "#c0392b",
                    fontSize: 11,
                    fontWeight: 700,
                    marginRight: "auto",
                  }}
                >
                  Cláusula: {fmtM(clauseTotal)}
                  {p.listedForSale && (
                    <span style={{ color: "#27ae60" }}> · en venta</span>
                  )}
                </span>
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  placeholder="M€"
                  value={clauseInvestInput[p.id] || ""}
                  onChange={(e) =>
                    setClauseInvestInput((prev) => ({
                      ...prev,
                      [p.id]: e.target.value,
                    }))
                  }
                  style={{
                    ...input,
                    width: 55,
                    padding: "3px 6px",
                    fontSize: 11,
                  }}
                />
                <button
                  onClick={() => investInClause(teamName, p.id)}
                  style={{
                    background: "#c9a227",
                    color: "#0a0805",
                    border: "none",
                    borderRadius: 6,
                    padding: "3px 8px",
                    cursor: "pointer",
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  ↑Cláusula
                </button>
              </>
            )}
            {mode === "other" && !isStar && (
              <span
                style={{
                  color: locked ? "#8a7a5a" : "#c0392b",
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                {locked
                  ? `🔒 Cláusula bloqueada (~${hoursLeft}h)`
                  : `Cláusula: ${fmtM(clauseTotal)}`}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
