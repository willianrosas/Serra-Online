import React, { useEffect, useMemo, useRef, useState } from "react";
import { socket } from "./net.js";
import { Card, DeckStack, FaceDownFan } from "./ui/cards.jsx";

/* =======================
   UI THEME
======================= */
const UI = {
  bg: "#070708",
  panel: "rgba(15,16,18,.88)",
  border: "rgba(255,255,255,.10)",
  text: "rgba(245,246,248,.95)",
  muted: "rgba(245,246,248,.70)",
  accent: "rgba(110,231,255,.95)",
  good: "rgba(80,250,123,.95)",
  warn: "rgba(255,209,102,.95)",
  bad: "rgba(255,92,122,.95)",
};

/* =======================
   ICONS
======================= */
function Icon({ name, size = 16 }) {
  const style = { width: size, height: size, display: "inline-block", opacity: 0.95 };
  if (name === "plus")
    return (
      <svg style={style} viewBox="0 0 24 24" fill="none">
        <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  if (name === "enter")
    return (
      <svg style={style} viewBox="0 0 24 24" fill="none">
        <path d="M10 17l5-5-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M15 12H4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M20 4v16" stroke="currentColor" strokeWidth="2" opacity=".6" />
      </svg>
    );
  if (name === "exit")
    return (
      <svg style={style} viewBox="0 0 24 24" fill="none">
        <path d="M10 17l-5-5 5-5" stroke="currentColor" strokeWidth="2" />
        <path d="M5 12h10" stroke="currentColor" strokeWidth="2" />
        <path d="M14 4h6v16h-6" stroke="currentColor" strokeWidth="2" opacity=".6" />
      </svg>
    );
  return null;
}

/* =======================
   BASIC UI
======================= */
function Button({ children, disabled, onClick }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      style={{
        padding: "12px 14px",
        borderRadius: 14,
        border: `1px solid rgba(110,231,255,.35)`,
        background: "linear-gradient(180deg, rgba(110,231,255,.18), rgba(110,231,255,.06))",
        color: UI.text,
        fontWeight: 1000,
        cursor: disabled ? "not-allowed" : "pointer",
        width: "160px",
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

/* =======================
   PIN INPUT
======================= */
function PinCodeInput({ value, onChange, length = 5 }) {
  const chars = Array.from({ length }, (_, i) => value[i] || "");
  return (
    <div className="pin-wrap">
      {chars.map((c, i) => (
        <input
          key={i}
          value={c}
          maxLength={1}
          onChange={(e) => {
            const v = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
            const arr = value.split("");
            arr[i] = v;
            onChange(arr.join("").slice(0, length));
          }}
          className="pin-box"
        />
      ))}
    </div>
  );
}

/* =======================
   APP
======================= */
export default function App() {
  const [name, setName] = useState("Willian");
  const [code, setCode] = useState("");
  const [conn, setConn] = useState("connecting");

  useEffect(() => {
    socket.on("connect", () => setConn("online"));
    socket.on("disconnect", () => setConn("offline"));
  }, []);

  return (
    <div className="scene">
      <div className="scene-bg" />
      <div className="scene-vignette" />

      <div className="stage">
        <header style={{ display: "flex", justifyContent: "space-between" }}>
          <div>
            <h1>Serra Online</h1>
            <small>Rústico + gamer • 2x2 • 61+ pontos</small>
          </div>
          <span style={{ color: UI.good }}>● {conn}</span>
        </header>

        <div className="panel">
          <h2>Entrar no jogo</h2>

          <Input value={name} onChange={(e) => setName(e.target.value)} />

          <div className="actions">
            <Button>
              <Icon name="plus" /> Criar sala
            </Button>

            <div className="pin-holder">
              <PinCodeInput value={code} onChange={setCode} />
              <small>5 caracteres</small>
            </div>

            <Button disabled={code.length !== 5}>
              <Icon name="enter" /> Entrar
            </Button>
          </div>
        </div>
      </div>

      <style>{`
        /* ===================
           SCENE
        =================== */
        .scene{
          min-height:100vh;
          background:${UI.bg};
          position:relative;
          overflow:hidden;
          padding:20px;
        }

        .scene-bg{
          position:fixed;
          inset:0;
          background:
            radial-gradient(circle at 20% 10%, rgba(110,231,255,.14), transparent 45%),
            repeating-linear-gradient(
              90deg,
              rgba(180,120,60,.04) 0px,
              rgba(180,120,60,.04) 3px,
              transparent 12px
            ),
            ${UI.bg};
        }

        .scene-vignette{
          position:fixed;
          inset:0;
          background:radial-gradient(circle at center, transparent 40%, rgba(0,0,0,.7));
        }

        /* ===================
           STAGE (glass)
        =================== */
        .stage{
          position:relative;
          max-width:1200px;
          margin:0 auto;
          padding:20px;
          border-radius:24px;
          background:
            linear-gradient(180deg, rgba(160,220,255,.14), rgba(160,220,255,.06));
          backdrop-filter: blur(14px);
          box-shadow:0 40px 120px rgba(0,0,0,.6);
        }

        /* ===================
           PANEL
        =================== */
        .panel{
          margin-top:20px;
          padding:20px;
          border-radius:20px;
          background:${UI.panel};
          border:1px solid ${UI.border};
        }

        /* ===================
           ACTIONS
        =================== */
        .actions{
          margin-top:16px;
          display:flex;
          justify-content:center;
          align-items:flex-start;
          gap:20px;
          flex-wrap:wrap;
        }

        /* ===================
           PIN
        =================== */
        .pin-wrap{
          display:flex;
          gap:10px;
          justify-content:center;
        }

        .pin-box{
          width:46px;
          height:56px;
          border-radius:14px;
          background:
            repeating-linear-gradient(
              90deg,
              rgba(255,255,255,.06) 0px,
              rgba(255,255,255,.06) 1px,
              transparent 6px
            ),
            linear-gradient(180deg, rgba(20,22,26,.95), rgba(10,11,13,.95));
          border:1px solid rgba(255,255,255,.15);
          color:${UI.text};
          text-align:center;
          font-size:18px;
          font-weight:900;
          outline:none;
        }

        .pin-holder{
          display:flex;
          flex-direction:column;
          align-items:center;
          gap:6px;
        }
      `}</style>
    </div>
  );
}
