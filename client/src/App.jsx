import React, { useEffect, useMemo, useRef, useState } from "react";
import { socket } from "./net.js";
import { Card, DeckStack, FaceDownFan } from "./ui/cards.jsx";

/* =====================
   PALETA / TEMA
===================== */
const UI = {
  panel: "rgba(18,20,24,.82)",
  border: "rgba(255,255,255,.10)",
  text: "rgba(245,246,248,.96)",
  muted: "rgba(245,246,248,.65)",
  accent: "rgba(150,220,255,.95)",
  good: "rgba(80,250,123,.95)",
  warn: "rgba(255,209,102,.95)",
  bad: "rgba(255,92,122,.95)",
};

/* =====================
   COMPONENTES BÁSICOS
===================== */
function Button({ children, disabled, style, ...props }) {
  return (
    <button
      {...props}
      disabled={disabled}
      style={{
        padding: "12px 14px",
        borderRadius: 14,
        border: `1px solid ${UI.border}`,
        background:
          "linear-gradient(180deg, rgba(150,220,255,.18), rgba(150,220,255,.06))",
        color: UI.text,
        fontWeight: 900,
        cursor: disabled ? "not-allowed" : "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        width: "100%",
        ...style,
      }}
    >
      {children}
    </button>
  );
}

function Input(props) {
  return (
    <input
      {...props}
      style={{
        width: "100%",
        padding: "12px",
        borderRadius: 12,
        border: `1px solid ${UI.border}`,
        background: "rgba(0,0,0,.35)",
        color: UI.text,
        outline: "none",
      }}
    />
  );
}

function Panel({ title, right, children }) {
  return (
    <div
      style={{
        borderRadius: 22,
        border: `1px solid ${UI.border}`,
        background: UI.panel,
        padding: 16,
        backdropFilter: "blur(18px)",
        boxShadow: "0 30px 80px rgba(0,0,0,.55)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <h2 style={{ margin: 0, fontSize: 16 }}>{title}</h2>
        {right}
      </div>
      {children}
    </div>
  );
}

/* =====================
   APP
===================== */
export default function App() {
  const [name, setName] = useState("Willian");
  const [code, setCode] = useState("");

  /* =====================
     SOCKET (mantido)
  ===================== */
  useEffect(() => {
    socket.on("connect", () => {});
    return () => socket.off("connect");
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        position: "relative",
        padding: 24,
        backgroundImage: `
          linear-gradient(rgba(10,14,18,.55), rgba(10,14,18,.55)),
          url("/bg-colonos.png")
        `,
        backgroundSize: "cover",
        backgroundPosition: "center",
        fontFamily:
          "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        color: UI.text,
      }}
    >
      {/* =====================
          LOGO GIGANTE TOPO
      ===================== */}
      <div
        style={{
          position: "absolute",
          top: 24,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 3,
          pointerEvents: "none",
        }}
      >
        <img
          src="/logo-sem-fundo.png"
          alt="Serra Online"
          style={{
            height: 180, // 🔥 LOGO BEM MAIOR
            filter: `
              drop-shadow(0 30px 60px rgba(0,0,0,.75))
              drop-shadow(0 0 22px rgba(255,210,120,.25))
            `,
          }}
        />
      </div>

      {/* =====================
          STAGE (VIDRO AZUL)
      ===================== */}
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          marginTop: 220, // empurra tudo pra baixo
          padding: 22,
          borderRadius: 26,
          background:
            "linear-gradient(180deg, rgba(200,235,255,.18), rgba(120,170,210,.08))",
          backdropFilter: "blur(26px)",
          border: `1px solid rgba(200,230,255,.25)`,
          boxShadow: "0 40px 120px rgba(0,0,0,.6)",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.3fr .7fr",
            gap: 18,
          }}
        >
          {/* =====================
              ENTRAR NO JOGO
          ===================== */}
          <Panel title="Entrar no jogo">
            <div style={{ display: "grid", gap: 12 }}>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome"
              />

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                }}
              >
                <Button>+ Criar sala</Button>
                <Button>→ Entrar</Button>
              </div>

              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Código da sala"
              />
            </div>
          </Panel>

          {/* =====================
              TRUNFOS
          ===================== */}
          <Panel title="Trunfos universais (visuais)">
            <div style={{ fontSize: 13, lineHeight: 1.6, color: UI.muted }}>
              <div>🐝 Zangão: <b>3♣</b></div>
              <div>🐓 Pé de Pinto: <b>A♣</b></div>
              <div>👑 Dama Fina: <b>Q♠</b></div>
              <div>✨ Dourado: <b>A♦</b> (trunfo ♣)</div>
              <div style={{ marginTop: 8 }}>
                🃏 Trunfo da rodada é uma carta real virada
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
