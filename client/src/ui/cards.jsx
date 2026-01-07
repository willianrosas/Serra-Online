import React from "react";

/**
 * =========================
 * Tema visual (rústico + gamer)
 * =========================
 */
const UI = {
  border: "rgba(255,255,255,.12)",
  cardBg:
    "linear-gradient(180deg, rgba(255,255,255,.10), rgba(255,255,255,.04))",
  text: "rgba(245,246,248,.95)",
  muted: "rgba(245,246,248,.70)",

  glowCyan: "rgba(110,231,255,.25)",
  glowGold: "rgba(255,209,102,.28)",
  glowRed: "rgba(255,92,122,.28)",
  glowViolet: "rgba(176,110,255,.28)",
};

/**
 * =========================
 * Utilidades
 * =========================
 */
export function suitColor(s) {
  if (s === "♥" || s === "♦") return "rgba(255,92,122,.95)";
  return UI.text;
}

/**
 * =========================
 * Trunfos universais (regras oficiais do Serra)
 * =========================
 */

// 🐝 Zangão → 3 de paus
export function isZangao(card) {
  return card?.v === "3" && card?.s === "♣";
}

// 🐓 Pé de Pinto → Ás de paus
export function isPeDePinto(card) {
  return card?.v === "A" && card?.s === "♣";
}

// 👑 Dama Fina → Dama de espadas
export function isDamaFina(card) {
  return card?.v === "Q" && card?.s === "♠";
}

// ✨ Dourado → Ás de ouros SOMENTE quando o trunfo da rodada for paus
export function isDourado(card, trumpCard) {
  return card?.v === "A" && card?.s === "♦" && trumpCard?.s === "♣";
}

export function isUniversalTrump(card, trumpCard) {
  return (
    isZangao(card) ||
    isPeDePinto(card) ||
    isDamaFina(card) ||
    isDourado(card, trumpCard)
  );
}

/**
 * =========================
 * Bisca
 * =========================
 * Bisca = Ás ou 7 que NÃO sejam do naipe de trunfo
 */
export function isBisca(card, trumpSuit) {
  if (!card || !trumpSuit) return false;
  if (card.s === trumpSuit) return false;
  return card.v === "A" || card.v === "7";
}

/**
 * =========================
 * Componentes auxiliares
 * =========================
 */
function Pill({ children, tone = "neutral" }) {
  const tones = {
    neutral: {
      b: "rgba(255,255,255,.15)",
      bg: "rgba(255,255,255,.05)",
      c: UI.muted,
    },
    cyan: {
      b: "rgba(110,231,255,.45)",
      bg: "rgba(110,231,255,.12)",
      c: "rgba(110,231,255,.95)",
    },
    gold: {
      b: "rgba(255,209,102,.45)",
      bg: "rgba(255,209,102,.12)",
      c: "rgba(255,209,102,.95)",
    },
    red: {
      b: "rgba(255,92,122,.45)",
      bg: "rgba(255,92,122,.12)",
      c: "rgba(255,92,122,.95)",
    },
    violet: {
      b: "rgba(176,110,255,.45)",
      bg: "rgba(176,110,255,.12)",
      c: "rgba(176,110,255,.95)",
    },
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
 * Carta
 * =========================
 */
export function Card({
  card,
  disabled = false,
  onClick,
  trumpSuit,
  trumpCard,
  compact = false,
  highlight = false,
}) {
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

  const size = compact
    ? { w: 64, h: 92, v: 18, s: 18 }
    : { w: 88, h: 126, v: 28, s: 26 };

  const centerIcon = isZangao(card)
    ? "🐝"
    : isPeDePinto(card)
    ? "🐓"
    : isDamaFina(card)
    ? "👑"
    : isDourado(card, trumpCard)
    ? "✨"
    : "🂠";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: size.w,
        height: size.h,
        borderRadius: 16,
        border: highlight
          ? "1px solid rgba(110,231,255,.6)"
          : `1px solid ${UI.border}`,
        background: UI.cardBg,
        color: UI.text,
        position: "relative",
        padding: 10,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : 1,
        boxShadow: highlight
          ? `0 0 0 3px rgba(110,231,255,.15)`
          : "0 14px 40px rgba(0,0,0,.35)",
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

      {/* Badges */}
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
        {isZangao(card) && <Pill tone="gold">🐝 ZANGÃO</Pill>}
        {isPeDePinto(card) && <Pill tone="red">🐓 PÉ DE PINTO</Pill>}
        {isDamaFina(card) && <Pill tone="violet">👑 DAMA FINA</Pill>}
        {isDourado(card, trumpCard) && <Pill tone="gold">✨ DOURADO</Pill>}
      </div>

      {/* Face */}
      <div
        style={{
          height: "100%",
          display: "grid",
          placeItems: "center",
          zIndex: 1,
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: size.v, fontWeight: 1000 }}>{card.v}</div>
        <div
          style={{
            fontSize: size.s,
            fontWeight: 1000,
            color: suitColor(card.s),
          }}
        >
          {card.s}
        </div>

        <div
          style={{
            marginTop: 10,
            width: compact ? 28 : 38,
            height: compact ? 28 : 38,
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
    </button>
  );
}

/**
 * =========================
 * Monte de cartas (Deck)
 * =========================
 */
export function DeckStack({ count = 0 }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ position: "relative", width: 88, height: 126 }}>
        {[10, 6, 2].map((off, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              inset: 0,
              transform: `translate(${off}px, ${-off}px)`,
              borderRadius: 16,
              border: `1px solid ${UI.border}`,
              background:
                "linear-gradient(180deg, rgba(110,231,255,.14), rgba(255,255,255,.03))",
            }}
          />
        ))}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 16,
            border: `1px solid ${UI.border}`,
            background:
              "linear-gradient(180deg, rgba(255,255,255,.08), rgba(255,255,255,.02))",
            display: "grid",
            placeItems: "center",
            fontWeight: 1000,
            letterSpacing: 2,
          }}
        >
          DECK
        </div>
      </div>

      <div>
        <div style={{ fontSize: 12, color: UI.muted }}>Cartas restantes</div>
        <div style={{ fontSize: 26, fontWeight: 1000 }}>{count}</div>
      </div>
    </div>
  );
}
