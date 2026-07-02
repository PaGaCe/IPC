export default function LegendRevealModal({ reveal, rating, onContinue }) {
  const { player, step } = reveal;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background:
          "radial-gradient(circle at center,#3a2b00 0%,#120f08 45%,#000 100%)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 99999,
        overflow: "hidden",
      }}
    >
      {/* Fondo brillante */}
      <div
        style={{
          position: "absolute",
          width: 900,
          height: 900,
          borderRadius: "50%",
          background:
            "radial-gradient(circle,rgba(255,210,80,.35),transparent 70%)",
          animation: "pulseGlow 2s infinite",
        }}
      />

      {/* Partículas */}
      {Array.from({ length: 35 }).map((_, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            width: 4 + Math.random() * 5,
            height: 4 + Math.random() * 5,
            borderRadius: "50%",
            background: "#f6d46d",
            opacity: 0.8,
            animation: `particle ${2 + Math.random() * 3}s linear infinite`,
          }}
        />
      ))}

      {/* Flash */}
      {step === 4 && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "#fff",
            animation: "flash .35s forwards",
          }}
        />
      )}

      <div
        style={{
          width: 380,
          minHeight: 560,
          borderRadius: 20,
          background: "linear-gradient(180deg,#1d1810,#14110c 60%,#0d0a06)",
          border: "3px solid #c9a227",
          boxShadow: "0 0 40px rgba(255,215,80,.7)",
          padding: 30,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          alignItems: "center",
          position: "relative",
        }}
      >
        <div />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 28,
          }}
        >
          <div
            style={{
              fontSize: 26,
              color: "#e8c252",
              fontWeight: 900,
              letterSpacing: 4,
            }}
          >
            ⭐ LEYENDA ⭐
          </div>

          {step >= 1 && (
            <div
              style={{
                transform: "scale(2.5)",
                animation: "pop .6s",
              }}
            >
              <CountryFlag country={player.nat} />
            </div>
          )}

          {step >= 2 && (
            <div
              style={{
                fontSize: 52,
                fontWeight: 900,
                color: "#fff",
                animation: "pop .5s",
              }}
            >
              {player.pos}
            </div>
          )}

          {step >= 3 && (
            <div
              style={{
                fontSize: 82,
                fontWeight: 900,
                color: ratingColor(player.overall),
                textShadow: "0 0 20px rgba(255,255,255,.35)",
                animation:
                  rating === player.overall ? "ratingDone .35s" : undefined,
              }}
            >
              {rating}
            </div>
          )}

          {step >= 5 && (
            <>
              <div
                style={{
                  width: "80%",
                  height: 2,
                  background: "#c9a227",
                }}
              />

              <div
                style={{
                  fontSize: 36,
                  fontWeight: 900,
                  color: "#fff",
                  textAlign: "center",
                  animation: "nameReveal .6s",
                }}
              >
                {player.name}
              </div>

              <button
                onClick={onContinue}
                style={{
                  marginTop: 20,
                  padding: "12px 34px",
                  background: "#c9a227",
                  border: "none",
                  borderRadius: 10,
                  cursor: "pointer",
                  fontWeight: 800,
                  fontSize: 17,
                }}
              >
                Continuar
              </button>
            </>
          )}
        </div>

        <div />
      </div>

      <style>{`

      @keyframes pulseGlow{

        0%{transform:scale(.9);opacity:.45;}

        50%{transform:scale(1.08);opacity:.9;}

        100%{transform:scale(.9);opacity:.45;}

      }

      @keyframes particle{

        from{
          transform:translateY(120px);
          opacity:0;
        }

        20%{
          opacity:1;
        }

        to{
          transform:translateY(-220px);
          opacity:0;
        }

      }

      @keyframes flash{

        from{opacity:1;}

        to{opacity:0;}

      }

      @keyframes pop{

        from{
          opacity:0;
          transform:scale(.4);
        }

        to{
          opacity:1;
          transform:scale(1);
        }

      }

      @keyframes ratingDone{

        0%{
          transform:scale(1);
        }

        50%{
          transform:scale(1.3);
        }

        100%{
          transform:scale(1);
        }

      }

      @keyframes nameReveal{

        from{
          opacity:0;
          transform:translateY(35px) scale(.8);
        }

        to{
          opacity:1;
          transform:translateY(0) scale(1);
        }

      }

      `}</style>
    </div>
  );
}
