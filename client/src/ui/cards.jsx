import React from "react";

/**
 * =========================
 * Tema visual (rústico + gamer)
 * =========================
 */
const UI = {
  border: "rgba(255,255,255,.14)",
  text: "rgba(245,246,248,.95)",
  muted: "rgba(245,246,248,.70)",
  panel: "rgba(15,16,18,.75)",

  glowCyan: "rgba(110,231,255,.28)",
  glowGold: "rgba(255,209,102,.28)",
  glowRed: "rgba(255,92,122,.28)",
  glowViolet: "rgba(176,110,255,.28)",
};

export function suitColor(s) {
  if (s === "♥" || s === "♦") return "rgba(255,92,122,.95)";
  return UI.text;
}

/**
 * =========================
 * Trunfos universais
 * =========================
 * Zangão: 3♣
 * Pé de Pinto: A♣
 * Dama Fina: Q♠
 * Dourado: A♦ quando trunfo da rodada for ♣
 */
export function isZangao(card) {
  return card?.v === "3" && card?.s === "♣";
}
export function isPeDePinto(card) {
  return card?.v === "A" && card?.s === "♣";
}
export function isDamaFina(card) {
  return card?.v === "Q" && card?.s === "♠";
}
export function isDourado(card, trumpCard) {
  return card?.v === "A" && card?.s === "♦" && trumpCard?.s === "♣";
}
export function isUniversalTrump(card, trumpCard) {
  return isZangao(card) || isPeDePinto(card) || isDamaFina(card) || isDourado(card, trumpCard);
}

/**
 * =========================
 * Bisca = A ou 7 que NÃO sejam do naipe de trunfo
 * =========================
 */
export function isBisca(card, trumpSuit) {
  if (!card || !trumpSuit) return false;
  if (card.s === trumpSuit) return false;
  return card.v === "A" || card.v === "7";
}

/**
 * =========================
 * Assets (PUBLIC)
 * =========================
 */
const ASSETS = {
  back: "/assets/cards/back/card_back.png",
  // você vai colocando aos poucos. Começamos com a sua:
  frontByKey: {
    // chave: `${v}_${suitName}`
    // suitName: spades/hearts/diamonds/clubs
    "7_spades": "/assets/cards/front/7_trunfo_spades.png",
  },
};

function suitName(s) {
  if (s === "♠") return "spades";
  if (s === "♥") return "hearts";
  if (s === "♦") return "diamonds";
  return "clubs";
}

function getFrontImage(card) {
  if (!card) return null;
  const key = `${card.v}_${suitName(card.s)}`;
  return ASSETS.frontByKey[key] || null;
}

/**
 * =========================
 * UI helpers
 * =========================
 */
function Pill({ children, tone = "neutral" }) {
  const tones = {
    neutral: { b: "rgba(255,255,255,.15)", bg: "rgba(255,255,255,.05)", c: UI.muted },
    cyan: { b: "rgba(110,231,255,.45)", bg: "rgba(110,231,255,.12)", c: "rgba(110,231,255,.95)" },
    gold: { b: "rgba(255,209,102,.45)", bg: "rgba(255,209,102,.12)", c: "rgba(255,209,102,.95)" },
    red: { b: "rgba(255,92,122,.45)", bg: "rgba(255,92,122,.12)", c: "rgba(255,92,122,.95)" },
    violet: { b: "rgba(176,110,255,.45)", bg: "rgba(176,110,255,.12)", c: "rgba(176,110,255,.95)" },
  };
  const t = tones[tone] || tones.neutral;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "5px 9px",
        borderRadius: 999,
        border: `1px solid ${t.b}`,
        background: t.bg,
        color: t.c,
        fontSize: 11,
        fontWeight: 900,
        letterSpacing: 0.3,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

/**
 * =========================
 * Carta (com PNG real quando existir)
 * =========================
 */
export function Card({
  card,
  faceDown = false,
  disabled = false,
  onClick,
  trumpSuit,
  trumpCard,
  compact = false,
  highlight = false,
  showBadges = true,
}) {
  const size = compact ? { w: 70, h: 98 } : { w: 92, h: 132 };

  // BACK
  if (faceDown) {
    return (
      <button
        disabled
        style={{
          width: size.w,
          height: size.h,
          borderRadius: 16,
          border: `1px solid ${UI.border}`,
          background: "rgba(0,0,0,.25)",
          boxShadow: "0 14px 40px rgba(0,0,0,.35)",
          padding: 0,
          overflow: "hidden",
        }}
        aria-label="Carta virada"
      >
        <img
          src={ASSETS.back}
          alt="Verso"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
            transform: "scale(1.02)",
          }}
        />
      </button>
    );
  }

  if (!card) return null;

  const isTrump = !!trumpSuit && card.s === trumpSuit;
  const universal = isUniversalTrump(card, trumpCard);
  const bisca = isBisca(card, trumpSuit);

  let glow = "rgba(255,255,255,.10)";
  if (isZangao(card)) glow = UI.glowGold;
  if (isPeDePinto(card)) glow = UI.glowRed;
  if (isDamaFina(card)) glow = UI.glowViolet;
  if (isDourado(card, trumpCard)) glow = UI.glowGold;
  if (isTrump) glow = UI.glowCyan;

  const centerIcon = isZangao(card)
    ? "🐝"
    : isPeDePinto(card)
    ? "🐓"
    : isDamaFina(card)
    ? "👑"
    : isDourado(card, trumpCard)
    ? "✨"
    : "🂠";

  const img = getFrontImage(card);

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: size.w,
        height: size.h,
        borderRadius: 16,
        border: highlight ? "1px solid rgba(110,231,255,.6)" : `1px solid ${UI.border}`,
        background: "linear-gradient(180deg, rgba(255,255,255,.10), rgba(255,255,255,.03))",
        color: UI.text,
        position: "relative",
        padding: 0,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : 1,
        boxShadow: highlight ? `0 0 0 3px rgba(110,231,255,.15)` : "0 14px 40px rgba(0,0,0,.35)",
        overflow: "hidden",
      }}
    >
      {/* Glow */}
      <div
        style={{
          position: "absolute",
          inset: -60,
          background: `radial-gradient(circle at 30% 20%, ${glow}, transparent 55%)`,
          pointerEvents: "none",
        }}
      />

      {/* PNG front when exists */}
      {img ? (
        <img
          src={img}
          alt={`${card.v}${card.s}`}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: "scale(1.01)",
          }}
        />
      ) : (
        // fallback visual (sem PNG)
        <div
          style={{
            position: "absolute",
            inset: 0,
            padding: 10,
            display: "grid",
            placeItems: "center",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: compact ? 20 : 30, fontWeight: 1000 }}>{card.v}</div>
          <div style={{ fontSize: compact ? 20 : 28, fontWeight: 1000, color: suitColor(card.s) }}>{card.s}</div>

          <div
            style={{
              marginTop: 10,
              width: compact ? 28 : 40,
              height: compact ? 28 : 40,
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,.15)",
              background: "rgba(0,0,0,.25)",
              display: "grid",
              placeItems: "center",
              fontSize: compact ? 14 : 18,
            }}
          >
            {centerIcon}
          </div>
        </div>
      )}

      {/* Badges */}
      {showBadges && (
        <div
          style={{
            position: "absolute",
            top: 8,
            left: 8,
            display: "flex",
            gap: 6,
            flexWrap: "wrap",
            zIndex: 2,
          }}
        >
          {universal && <Pill tone="gold">UNIVERSAL</Pill>}
          {bisca && <Pill tone="gold">BISCA</Pill>}
          {isTrump && <Pill tone="cyan">TRUNFO</Pill>}
        </div>
      )}
    </button>
  );
}

/**
 * =========================
 * Deck (mostra o verso real)
 * =========================
 */
export function DeckStack({ count = 0, compact = false }) {
  const w = compact ? 82 : 96;
  const h = compact ? 118 : 140;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ position: "relative", width: w, height: h }}>
        {[10, 6, 2].map((off, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              inset: 0,
              transform: `translate(${off}px, ${-off}px)`,
              borderRadius: 16,
              border: `1px solid ${UI.border}`,
              background: "rgba(0,0,0,.22)",
              overflow: "hidden",
            }}
          >
            <img
              src={ASSETS.back}
              alt="Verso"
              style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.9 }}
            />
          </div>
        ))}

        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 16,
            border: `1px solid ${UI.border}`,
            background: "rgba(0,0,0,.20)",
            overflow: "hidden",
          }}
        >
          <img src={ASSETS.back} alt="Verso" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
      </div>

      <div>
        <div style={{ fontSize: 12, color: UI.muted }}>Cartas restantes</div>
        <div style={{ fontSize: 26, fontWeight: 1000 }}>{count}</div>
      </div>
    </div>
  );
}

/**
 * Pequeno “leque” de cartas viradas (para adversários)
 */
export function FaceDownFan({ count = 3, compact = true }) {
  const cards = Math.max(0, Math.min(12, count));
  return (
    <div style={{ position: "relative", height: compact ? 70 : 90, width: compact ? 120 : 160 }}>
      {Array.from({ length: cards }).map((_, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: i * (compact ? 8 : 10),
            top: i * (compact ? 1 : 1.5),
            transform: `rotate(${(i - cards / 2) * (compact ? 2 : 2.3)}deg)`,
            transformOrigin: "bottom center",
          }}
        >
          <Card faceDown compact={compact} disabled />
        </div>
      ))}
    </div>
  );
}
