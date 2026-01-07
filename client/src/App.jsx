import React, { useEffect, useMemo, useRef, useState } from "react";
import { socket } from "./net.js";
import { Card, DeckStack, FaceDownFan } from "./ui/cards.jsx";

const UI = {
  panel: "rgba(15,16,18,.86)",
  border: "rgba(255,255,255,.10)",
  text: "rgba(245,246,248,.95)",
  muted: "rgba(245,246,248,.70)",
  accent: "rgba(150,220,255,.95)", // azul claro
  good: "rgba(80,250,123,.95)",
  warn: "rgba(255,209,102,.95)",
  bad: "rgba(255,92,122,.95)",
};

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
        <path d="M10 17l5-5-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M15 12H4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M20 4v16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
      </svg>
    );
  if (name === "copy")
    return (
      <svg style={style} viewBox="0 0 24 24" fill="none">
        <path d="M8 8h10v12H8V8z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path
          d="M6 16H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.7"
        />
      </svg>
    );
  if (name === "exit")
    return (
      <svg style={style} viewBox="0 0 24 24" fill="none">
        <path d="M10 17l-5-5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5 12h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M14 4h6v16h-6" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" opacity="0.7" />
      </svg>
    );
  return null;
}

function Button({ variant = "primary", disabled, children, style, ...props }) {
  const base = {
    padding: "11px 12px",
    borderRadius: 12,
    border: `1px solid ${UI.border}`,
    background: "rgba(255,255,255,.04)",
    color: UI.text,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.55 : 1,
    fontWeight: 1000,
    letterSpacing: 0.2,
    transition: "transform .06s ease, opacity .2s ease",
    whiteSpace: "nowrap",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minWidth: 0,
    width: "100%",
  };

  const variants = {
    primary: {
      background: "linear-gradient(180deg, rgba(150,220,255,.18), rgba(150,220,255,.06))",
      border: "1px solid rgba(150,220,255,.35)",
    },
    ghost: { background: "transparent", border: `1px solid ${UI.border}` },
    danger: {
      background: "linear-gradient(180deg, rgba(255,92,122,.18), rgba(255,92,122,.06))",
      border: "1px solid rgba(255,92,122,.35)",
    },
  };

  return (
    <button
      {...props}
      disabled={disabled}
      style={{ ...base, ...(variants[variant] || {}), ...style }}
      onMouseDown={(e) => {
        if (disabled) return;
        e.currentTarget.style.transform = "scale(0.98)";
      }}
      onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
      onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
    >
      {children}
    </button>
  );
}

function Input({ style, ...props }) {
  return (
    <input
      {...props}
      style={{
        width: "100%",
        maxWidth: "100%",
        boxSizing: "border-box",
        padding: "12px 12px",
        borderRadius: 12,
        border: `1px solid ${UI.border}`,
        background: "rgba(0,0,0,.25)",
        color: UI.text,
        outline: "none",
        minWidth: 0,
        ...style,
      }}
    />
  );
}

function Panel({ title, right, children }) {
  return (
    <div
      style={{
        border: `1px solid ${UI.border}`,
        borderRadius: 18,
        background: UI.panel,
        padding: 14,
        boxShadow: "0 18px 60px rgba(0,0,0,.45)",
        backdropFilter: "blur(12px)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
        <h2 style={{ margin: 0, fontSize: 16, letterSpacing: 0.3 }}>{title}</h2>
        {right}
      </div>
      <div style={{ marginTop: 12 }}>{children}</div>
    </div>
  );
}

function Pill({ tone = "neutral", children }) {
  const m = {
    neutral: { b: UI.border, bg: "rgba(255,255,255,.04)", c: UI.muted },
    accent: { b: "rgba(150,220,255,.35)", bg: "rgba(150,220,255,.10)", c: UI.accent },
    good: { b: "rgba(80,250,123,.35)", bg: "rgba(80,250,123,.10)", c: UI.good },
    warn: { b: "rgba(255,209,102,.35)", bg: "rgba(255,209,102,.10)", c: UI.warn },
    bad: { b: "rgba(255,92,122,.35)", bg: "rgba(255,92,122,.10)", c: UI.bad },
  }[tone];

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 10px",
        borderRadius: 999,
        border: `1px solid ${m.b}`,
        background: m.bg,
        color: m.c,
        fontSize: 12,
        fontWeight: 900,
        letterSpacing: 0.2,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

function LoadingOverlay({ show, text = "Carregando…" }) {
  if (!show) return null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.68)", display: "grid", placeItems: "center", zIndex: 999 }}>
      <div
        style={{
          width: 460,
          maxWidth: "92vw",
          borderRadius: 18,
          border: `1px solid ${UI.border}`,
          background: UI.panel,
          padding: 18,
          textAlign: "center",
          boxShadow: "0 18px 60px rgba(0,0,0,.55)",
          backdropFilter: "blur(10px)",
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 1000, marginBottom: 8 }}>{text}</div>
        <div style={{ color: UI.muted, fontSize: 12 }}>“No barracão, a gente embaralha o destino…”</div>

        <div style={{ marginTop: 14, display: "flex", justifyContent: "center", gap: 10, alignItems: "center" }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              border: "3px solid rgba(255,255,255,.12)",
              borderTop: "3px solid rgba(150,220,255,.75)",
              animation: "spin 0.9s linear infinite",
            }}
          />
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function Toast({ show, children }) {
  if (!show) return null;
  return (
    <div style={{ position: "fixed", left: 18, bottom: 18, zIndex: 998 }}>
      <div
        style={{
          borderRadius: 14,
          border: `1px solid ${UI.border}`,
          background: "rgba(15,16,18,.92)",
          padding: "10px 12px",
          boxShadow: "0 18px 60px rgba(0,0,0,.45)",
          minWidth: 260,
          backdropFilter: "blur(10px)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function EndModal({ show, title, subtitle, onRestart }) {
  if (!show) return null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.68)", display: "grid", placeItems: "center", zIndex: 999 }}>
      <div style={{ width: 520, maxWidth: "92vw", borderRadius: 18, border: `1px solid ${UI.border}`, background: UI.panel, padding: 18, backdropFilter: "blur(12px)" }}>
        <div style={{ fontSize: 18, fontWeight: 1100 }}>{title}</div>
        <div style={{ marginTop: 6, color: UI.muted, fontSize: 13 }}>{subtitle}</div>
        <div style={{ marginTop: 14, display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
          <Button onClick={onRestart} style={{ width: "auto" }}>Nova rodada</Button>
        </div>
      </div>
    </div>
  );
}

/* ============================
   PIN input 5 chars: A-Z 0-9
============================ */
function PinCodeInput({ value, onChange, length = 5, disabled = false }) {
  const refs = useRef([]);

  const chars = useMemo(() => {
    const v = String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, length);
    return Array.from({ length }, (_, i) => v[i] || "");
  }, [value, length]);

  function setAt(i, ch) {
    const next = chars.slice();
    next[i] = ch;
    onChange(next.join("").slice(0, length));
  }

  function focus(i) {
    const el = refs.current[i];
    if (el) el.focus();
  }

  function handleKeyDown(e, i) {
    if (disabled) return;
    const k = e.key;

    if (k === "Backspace") {
      e.preventDefault();
      if (chars[i]) setAt(i, "");
      else {
        const prev = Math.max(0, i - 1);
        setAt(prev, "");
        focus(prev);
      }
      return;
    }

    if (k === "ArrowLeft") {
      e.preventDefault();
      focus(Math.max(0, i - 1));
      return;
    }
    if (k === "ArrowRight") {
      e.preventDefault();
      focus(Math.min(length - 1, i + 1));
      return;
    }

    if (k === "Enter") return;

    if (/^[a-zA-Z0-9]$/.test(k)) {
      e.preventDefault();
      setAt(i, k.toUpperCase());
      focus(Math.min(length - 1, i + 1));
    }
  }

  function handlePaste(e, i) {
    if (disabled) return;
    e.preventDefault();
    const text = (e.clipboardData?.getData("text") || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, length);
    if (!text) return;

    const next = chars.slice();
    let p = i;
    for (const ch of text) {
      if (p >= length) break;
      next[p] = ch;
      p++;
    }
    onChange(next.join("").slice(0, length));
    focus(Math.min(length - 1, p));
  }

  return (
    <div className="pin-wrap" aria-label="Código da sala">
      {chars.map((c, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          value={c}
          disabled={disabled}
          inputMode="text"
          autoComplete="one-time-code"
          maxLength={1}
          onChange={() => {}}
          onKeyDown={(e) => handleKeyDown(e, i)}
          onPaste={(e) => handlePaste(e, i)}
          onFocus={(e) => e.currentTarget.select()}
          className="pin-box"
        />
      ))}
    </div>
  );
}

export default function App() {
  const [name, setName] = useState("Willian");
  const [codeInput, setCodeInput] = useState("");

  const [seat, setSeat] = useState(null);
  const [state, setState] = useState(null);
  const [hand, setHand] = useState([]);

  const [chatMsg, setChatMsg] = useState("");

  const [conn, setConn] = useState(socket.connected ? "online" : "connecting");
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [copied, setCopied] = useState(false);

  const [toast, setToast] = useState(null);
  const lastToastAt = useRef(0);

  useEffect(() => {
    const onConnect = () => setConn("online");
    const onDisconnect = () => setConn("offline");
    const onConnectError = () => setConn("offline");

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);

    socket.on("state", (s) => setState(s));
    socket.on("hand", (h) => setHand(h));

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      socket.off("state");
      socket.off("hand");
    };
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      const currentPhase = state?.phase || "lobby";
      const deadline = state?.turnDeadline;
      if (!deadline || currentPhase !== "playing") {
        setTimeLeft(30);
        return;
      }
      const ms = Math.max(0, deadline - Date.now());
      setTimeLeft(Math.ceil(ms / 1000));
    }, 200);
    return () => clearInterval(t);
  }, [state]);

  useEffect(() => {
    const lt = state?.lastTrick;
    if (!lt?.at) return;
    if (lt.at <= lastToastAt.current) return;
    lastToastAt.current = lt.at;

    setToast(lt);
    const id = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(id);
  }, [state?.lastTrick?.at]);

  const inRoom = !!state?.code;
  const phase = state?.phase || "lobby";
  const trumpSuit = state?.trumpSuit || null;
  const trumpCard = state?.faceUp || null;

  const playersCount = useMemo(() => (state?.names ? state.names.filter(Boolean).length : 0), [state]);
  const myReady = useMemo(() => (seat == null ? false : !!state?.ready?.[seat]), [seat, state]);

  const codeNormalized = useMemo(() => String(codeInput || "").trim().toUpperCase().slice(0, 5), [codeInput]);
  const codeLooksValid = useMemo(() => /^[A-Z0-9]{5}$/.test(codeNormalized), [codeNormalized]);

  const isMyTurn = phase === "playing" && state?.turnSeat === seat;

  const roomStatus = useMemo(() => {
    if (!state) return "";
    if (phase === "playing") return "Partida em andamento.";
    if (phase === "ended") return "Partida encerrada.";
    if (playersCount < 4) return `Aguardando jogadores (${playersCount}/4)…`;
    const allReady = (state.ready || []).every(Boolean);
    if (!allReady) return "Todos entraram. Aguardando todos ficarem prontos…";
    return "Iniciando partida…";
  }, [state, phase, playersCount]);

  async function copyRoomCode() {
    try {
      await navigator.clipboard.writeText(state?.code || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 900);
    } catch {
      alert("Não consegui copiar. Copie manualmente o código.");
    }
  }

  function resetLocal() {
    setState(null);
    setSeat(null);
    setHand([]);
    setChatMsg("");
    setCodeInput("");
    setCopied(false);
    setLoading(false);
  }

  function leaveRoom() {
    const roomCode = state?.code;
    if (!roomCode) return resetLocal();
    setLoading(true);
    socket.emit("leave_room", { code: roomCode }, () => {
      resetLocal();
    });
  }

  function createRoom() {
    const n = String(name || "").trim();
    if (!n) return alert("Digite seu nome.");
    if (conn !== "online") return alert("Sem conexão com o servidor.");
    setLoading(true);
    socket.emit("create_room", { name: n }, (res) => {
      setLoading(false);
      if (!res?.ok) return alert(res?.err || "Erro ao criar sala");
      setSeat(res.seat);
      setState(res.state);
      setCodeInput(res.code);
    });
  }

  function joinRoom() {
    const n = String(name || "").trim();
    const c = codeNormalized;
    if (!n) return alert("Digite seu nome.");
    if (!c) return alert("Digite o código da sala.");
    if (!codeLooksValid) return alert("Código inválido (use 5 caracteres).");
    if (conn !== "online") return alert("Sem conexão com o servidor.");
    setLoading(true);
    socket.emit("join_room", { code: c, name: n }, (res) => {
      setLoading(false);
      if (!res?.ok) return alert(res?.err || "Erro ao entrar");
      setSeat(res.seat);
      setState(res.state);
    });
  }

  function restartGame() {
    if (!state?.code) return;
    setLoading(true);
    socket.emit("restart_game", { code: state.code }, (res) => {
      setLoading(false);
      if (!res?.ok) return alert(res?.err || "Não consegui reiniciar.");
    });
  }

  const pos = useMemo(() => {
    if (seat == null) return null;
    const bottom = seat;
    const top = (seat + 2) % 4;
    const left = (seat + 1) % 4;
    const right = (seat + 3) % 4;
    return { bottom, top, left, right };
  }, [seat]);

  const endTitle = useMemo(() => {
    if (phase !== "ended" || !state) return "";
    const t0 = state.teamScore?.[0] ?? 0;
    const t1 = state.teamScore?.[1] ?? 0;
    if (t0 === t1) return "Empate no barracão!";
    const winner = t0 > t1 ? "Time 1" : "Time 2";
    return `${winner} venceu a rodada!`;
  }, [phase, state]);

  const endSubtitle = useMemo(() => {
    if (phase !== "ended" || !state) return "";
    const t0 = state.teamScore?.[0] ?? 0;
    const t1 = state.teamScore?.[1] ?? 0;
    return `Placar final: Time 1 ${t0} x ${t1} Time 2 • Código da sala: ${state.code}`;
  }, [phase, state]);

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: 18,
        color: UI.text,
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",

        /* FUNDO TEMÁTICO */
        backgroundImage: `
          linear-gradient(rgba(0,0,0,.50), rgba(0,0,0,.62)),
          url("/bg-colonos.png")
        `,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      <LoadingOverlay show={loading} text="Preparando o barracão…" />

      <Toast show={!!toast}>
        <div style={{ fontWeight: 1000 }}>
          ✅ Vaza: <span style={{ color: UI.accent }}>Seat {(toast?.winnerSeat ?? 0) + 1}</span> • Time{" "}
          <span style={{ color: UI.good }}>{(toast?.winnerTeam ?? 0) + 1}</span> • +{toast?.points ?? 0} pts
        </div>
      </Toast>

      <EndModal show={phase === "ended"} title={endTitle} subtitle={endSubtitle} onRestart={restartGame} />

      {/* STAGE (plataforma azul claro) */}
      <div
  style={{
    maxWidth: 1220,
    margin: "0 auto",
    position: "relative",
    paddingTop: 170, // ⬅️ stage mais baixo (ANTES: 110)
  }}
>
  {/* LOGO CENTRAL */}
  <div
    style={{
      position: "absolute",
      top: -10, // ⬅️ logo sobe levemente
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: 5,
      pointerEvents: "none",
    }}
  >
    <img
      src="/logo-sem-fundo.png"
      alt="Serra Online"
      style={{
        height: 180, // mantém grande
        maxWidth: "86vw",
        objectFit: "contain",
        filter:
          "drop-shadow(0 28px 60px rgba(0,0,0,.75)) drop-shadow(0 0 20px rgba(150,220,255,.18))",
      }}
    />
  </div>


        <div
          style={{
            borderRadius: 28,
            padding: 18,
            background: "linear-gradient(180deg, rgba(200,235,255,.18), rgba(120,170,210,.08))",
            border: "1px solid rgba(200,230,255,.22)",
            boxShadow: "0 40px 120px rgba(0,0,0,.55)",
            backdropFilter: "blur(26px)",
            WebkitBackdropFilter: "blur(26px)",
            overflow: "hidden",
          }}
        >
          {/* Header (sem “Serra Online” texto) */}
          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <Pill tone={conn === "online" ? "good" : conn === "connecting" ? "warn" : "bad"}>
              {conn === "online" ? "● Online" : conn === "connecting" ? "● Conectando" : "● Offline"}
            </Pill>
            {inRoom && (
              <Button variant="danger" onClick={leaveRoom} disabled={loading} style={{ width: "auto" }}>
                <Icon name="exit" />
                Sair
              </Button>
            )}
          </div>

          <div style={{ marginTop: 12 }}>
            {!inRoom ? (
              <div style={{ display: "grid", gridTemplateColumns: "1.25fr .75fr", gap: 14, alignItems: "start" }}>
                <Panel title="Entrar no jogo" right={<Pill tone="accent">61+ pontos</Pill>}>
                  <div style={{ display: "grid", gap: 12, maxWidth: 560 }}>
                    <div style={{ display: "grid", gap: 6 }}>
                      <div style={{ fontSize: 12, color: UI.muted }}>Seu nome</div>
                      <Input value={name} onChange={(e) => setName(e.target.value)} />
                    </div>

                    {/* AÇÕES CENTRAIS: Botão | PIN | Botão (com espaço igual e sem estourar) */}
                    <div className="start-actions-fixed">
  		     <div className="action-col left">
    		      <Button onClick={createRoom} disabled={conn !== "online" || loading} style={{ width: "100%", maxWidth: 220 }}>
      		       <Icon name="plus" />
      		       Criar sala
    		      </Button>
  		     </div>

  		   <div className="action-col mid">
    		    <PinCodeInput value={codeNormalized} onChange={setCodeInput} disabled={conn !== "online" || loading} />
    		    <div
      		     className="pin-hint"
      		     style={{
        		fontSize: 11,
        		textAlign: "center",
        		color: codeInput.length === 0 ? UI.muted : codeLooksValid ? UI.good : UI.warn,
      		     }}
    		   >
     		     {codeInput.length === 0 ? "5 caracteres" : codeLooksValid ? "Código válido" : "Código inválido"}
    		   </div>
 		  </div>

  		  <div className="action-col right">
    		   <Button
      		    onClick={joinRoom}
      		    disabled={conn !== "online" || !codeLooksValid || loading}
      		    style={{ width: "100%", maxWidth: 220 }}
    		  >
      		    <Icon name="enter" />
      		    Entrar
    		   </Button>
  		  </div>
		 </div>



                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <Pill>Compartilhe o código com amigos</Pill>
                      <Pill>Lobby inicia quando 4 estiverem prontos</Pill>
                    </div>
                  </div>
                </Panel>

                <Panel title="Trunfos universais (visuais)">
                  <div style={{ color: UI.muted, fontSize: 13, lineHeight: 1.55 }}>
                    <div>🐝 Zangão: <b style={{ color: UI.text }}>3♣</b></div>
                    <div>🐓 Pé de Pinto: <b style={{ color: UI.text }}>A♣</b></div>
                    <div>👑 Dama Fina: <b style={{ color: UI.text }}>Q♠</b></div>
                    <div>
                      ✨ Dourado: <b style={{ color: UI.text }}>A♦</b> (quando trunfo da rodada for <b style={{ color: UI.text }}>♣</b>)
                    </div>
                    <div style={{ marginTop: 10 }}>
                      🃏 Trunfo da rodada é uma <b style={{ color: UI.text }}>carta real</b> virada.
                    </div>
                  </div>
                </Panel>
              </div>
            ) : (
              /* =========================
                 IN-ROOM (SEU ORIGINAL)
                 ========================= */
              <div style={{ display: "grid", gap: 14 }}>
                <Panel
                  title="Sala"
                  right={
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                      <Pill tone="neutral">Você: <b style={{ color: UI.text }}>Seat {seat + 1}</b></Pill>
                      <Pill tone={phase === "playing" ? "good" : phase === "ended" ? "bad" : "warn"}>
                        Fase: <b style={{ color: UI.text }}>{phase}</b>
                      </Pill>
                      {phase === "playing" && (
                        <Pill tone={timeLeft <= 5 ? "bad" : "accent"}>
                          ⏱️ <b style={{ color: UI.text }}>{timeLeft}s</b>
                        </Pill>
                      )}
                    </div>
                  }
                >
                  <div style={{ display: "grid", gap: 12 }}>
                    <div style={{ display: "flex", gap: 10, justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <Pill tone="accent">Código: <b style={{ color: UI.text, letterSpacing: 3 }}>{state.code}</b></Pill>
                        <Pill>Jogadores: <b style={{ color: UI.text }}>{playersCount}/4</b></Pill>
                        <Pill>Trunfo: <b style={{ color: UI.text }}>{trumpSuit || "—"}</b></Pill>
                        <Pill>
                          Placar: <b style={{ color: UI.text }}>{state.teamScore?.[0] ?? 0}</b> x{" "}
                          <b style={{ color: UI.text }}>{state.teamScore?.[1] ?? 0}</b>
                        </Pill>
                      </div>

                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <Button variant="ghost" onClick={copyRoomCode} style={{ width: "auto" }}>
                          <Icon name="copy" />
                          {copied ? "Copiado!" : "Copiar"}
                        </Button>
                        {phase === "lobby" && (
                          <Button onClick={() => socket.emit("set_ready", { code: state.code, ready: !myReady })} style={{ width: "auto" }}>
                            {myReady ? "Cancelar pronto" : "Pronto"}
                          </Button>
                        )}
                        {phase === "ended" && (
                          <Button onClick={restartGame} style={{ width: "auto" }}>
                            Nova rodada
                          </Button>
                        )}
                      </div>
                    </div>

                    <div style={{ textAlign: "center", color: UI.muted }}>{roomStatus}</div>
                  </div>
                </Panel>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 14, alignItems: "start" }}>
                  {/* MESA */}
                  <Panel
                    title="Mesa"
                    right={
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                        <Pill>líder: <b style={{ color: UI.text }}>Seat {(state.leaderSeat ?? 0) + 1}</b></Pill>
                        <Pill tone={isMyTurn ? "good" : "neutral"}>
                          turno: <b style={{ color: UI.text }}>Seat {(state.turnSeat ?? 0) + 1}</b> {isMyTurn ? "(você)" : ""}
                        </Pill>
                      </div>
                    }
                  >
                    <div
                      style={{
                        borderRadius: 18,
                        border: `1px solid ${UI.border}`,
                        background:
                          "radial-gradient(circle at 50% 45%, rgba(255,255,255,.06), rgba(0,0,0,.08) 60%), linear-gradient(180deg, rgba(0,0,0,.18), rgba(0,0,0,.32))",
                        padding: 14,
                        minHeight: 420,
                        position: "relative",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          background:
                            "repeating-linear-gradient(90deg, rgba(255,255,255,.02) 0, rgba(255,255,255,.02) 2px, transparent 2px, transparent 10px)",
                          opacity: 0.6,
                          pointerEvents: "none",
                        }}
                      />

                      {/* Top */}
                      {pos && (
                        <div style={{ position: "absolute", top: 10, left: 0, right: 0, display: "grid", placeItems: "center", gap: 6 }}>
                          <div style={{ color: UI.muted, fontSize: 12, fontWeight: 900 }}>
                            Seat {pos.top + 1} • {state.names?.[pos.top] || "—"} • {state.handCounts?.[pos.top] ?? 0} cartas
                          </div>
                          <FaceDownFan count={state.handCounts?.[pos.top] ?? 0} />
                        </div>
                      )}

                      {/* Left */}
                      {pos && (
                        <div style={{ position: "absolute", top: 120, left: 10, display: "grid", placeItems: "center", gap: 6 }}>
                          <div style={{ color: UI.muted, fontSize: 12, fontWeight: 900, transform: "rotate(-90deg)" }}>
                            Seat {pos.left + 1}
                          </div>
                          <FaceDownFan count={state.handCounts?.[pos.left] ?? 0} />
                        </div>
                      )}

                      {/* Right */}
                      {pos && (
                        <div style={{ position: "absolute", top: 120, right: 10, display: "grid", placeItems: "center", gap: 6 }}>
                          <div style={{ color: UI.muted, fontSize: 12, fontWeight: 900, transform: "rotate(90deg)" }}>
                            Seat {pos.right + 1}
                          </div>
                          <FaceDownFan count={state.handCounts?.[pos.right] ?? 0} />
                        </div>
                      )}

                      {/* Center */}
                      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
                        <div style={{ display: "grid", gap: 10, placeItems: "center" }}>
                          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
                            {(state.trick || []).map((t, i) => (
                              <div key={i} style={{ display: "grid", gap: 6, justifyItems: "center" }}>
                                <div style={{ fontSize: 12, color: UI.muted }}>
                                  Seat {t.seat + 1} {t.seat === seat ? "(você)" : ""}
                                </div>
                                <Card card={t.card} trumpSuit={trumpSuit} trumpCard={trumpCard} disabled />
                              </div>
                            ))}
                            {(!state.trick || state.trick.length === 0) && <div style={{ color: UI.muted }}>Aguardando jogadas…</div>}
                          </div>

                          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center", alignItems: "center" }}>
                            <DeckStack count={state.deckCount ?? 0} compact />

                            <div style={{ display: "grid", gap: 8 }}>
                              <Pill tone="warn">
                                Bisca: <b style={{ color: UI.text }}>A</b> e <b style={{ color: UI.text }}>7</b> (não-trunfo)
                              </Pill>
                              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                                <div style={{ color: UI.muted, fontSize: 12, fontWeight: 900 }}>Carta virada:</div>
                                {state.faceUp ? (
                                  <Card card={state.faceUp} trumpSuit={trumpSuit} trumpCard={state.faceUp} compact disabled />
                                ) : (
                                  <div style={{ color: UI.muted, fontSize: 12 }}>(sem carta virada)</div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Bottom (YOU) */}
                      {pos && (
                        <div style={{ position: "absolute", bottom: 10, left: 0, right: 0, display: "grid", placeItems: "center", gap: 8 }}>
                          <div style={{ color: UI.muted, fontSize: 12, fontWeight: 900 }}>
                            Você • Seat {pos.bottom + 1} • {hand.length} cartas {isMyTurn ? "• SUA VEZ" : ""}
                          </div>

                          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
                            {hand.map((c) => (
                              <Card
                                key={c.id}
                                card={c}
                                trumpSuit={trumpSuit}
                                trumpCard={trumpCard}
                                highlight={isMyTurn}
                                disabled={!isMyTurn}
                                onClick={() =>
                                  socket.emit("play_card", { code: state.code, cardId: c.id }, (res) => {
                                    if (!res?.ok) alert(res?.err || "Jogada inválida");
                                  })
                                }
                              />
                            ))}
                            {hand.length === 0 && <div style={{ color: UI.muted }}>Sem cartas (ou aguardando início)</div>}
                          </div>
                        </div>
                      )}
                    </div>
                  </Panel>

                  {/* LOBBY / CHAT */}
                  <Panel title="Lobby / Chat">
                    <div style={{ display: "grid", gap: 8 }}>
                      {state.names.map((n, i) => {
                        const occupied = !!n;
                        const isMe = i === seat;
                        const ready = !!state.ready?.[i];
                        return (
                          <div
                            key={i}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              padding: "10px 12px",
                              borderRadius: 14,
                              border: `1px solid ${UI.border}`,
                              background: isMe ? "rgba(150,220,255,.08)" : "rgba(255,255,255,.02)",
                              opacity: occupied ? 1 : 0.55,
                            }}
                          >
                            <div style={{ display: "grid", gap: 2 }}>
                              <div style={{ fontWeight: 1000 }}>
                                Seat {i + 1} {isMe ? <span style={{ color: UI.accent }}>(você)</span> : ""}
                              </div>
                              <div style={{ fontSize: 12, color: UI.muted }}>{n || "—"}</div>
                            </div>
                            <div>{!occupied ? <Pill>Vazio</Pill> : ready ? <Pill tone="good">Pronto</Pill> : <Pill tone="warn">Aguardando</Pill>}</div>
                          </div>
                        );
                      })}
                    </div>

                    <div
                      style={{
                        marginTop: 12,
                        height: 240,
                        overflow: "auto",
                        border: `1px solid ${UI.border}`,
                        borderRadius: 14,
                        padding: 10,
                        background: "rgba(0,0,0,.18)",
                      }}
                    >
                      {(state.chat || []).map((m, i) => (
                        <div key={i} style={{ marginBottom: 8, lineHeight: 1.25 }}>
                          <span style={{ fontWeight: 1000 }}>{m.name}:</span> <span style={{ color: UI.text }}>{m.msg}</span>
                        </div>
                      ))}
                      {(!state.chat || state.chat.length === 0) && <div style={{ color: UI.muted }}>Sem mensagens ainda…</div>}
                    </div>

                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                      <Input value={chatMsg} onChange={(e) => setChatMsg(e.target.value)} placeholder="Digite…" />
                      <Button
                        onClick={() => {
                          const msg = chatMsg.trim();
                          if (!msg) return;
                          socket.emit("chat", { code: state.code, msg }, (res) => {
                            if (!res?.ok) alert(res?.err || "Erro");
                          });
                          setChatMsg("");
                        }}
                        style={{ width: "auto" }}
                      >
                        Enviar
                      </Button>
                    </div>

                    <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {["Tem bisca aí?", "Confia em mim…", "Obrigado pela bisca!", "É minha!", "Que azar!"].map((t) => (
                        <Button key={t} variant="ghost" onClick={() => socket.emit("chat", { code: state.code, msg: t })} style={{ width: "auto" }}>
                          {t}
                        </Button>
                      ))}
                    </div>
                  </Panel>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CSS GLOBAL DO PIN + LAYOUT (não mistura dentro de div) */}
      <style>{`
        *{ box-sizing: border-box; }
        img{ max-width: 100%; }

        /* Linha: Criar sala | PIN | Entrar  (sem invadir) */
	.start-actions-fixed{
  		display: grid;
  		grid-template-columns: minmax(170px, 220px) minmax(300px, 1fr) minmax(170px, 220px);
  		gap: 18px;
  		align-items: center;
  		width: 100%;
	}

	/* cada coluna centralizada */
	.action-col{
  		display: grid;
  		justify-items: center;
  		align-content: start;
  		min-width: 0; /* IMPORTANTÍSSIMO p/ não estourar */
	}

	.action-col.mid{
  		justify-self: center;
	}

	/* PIN: nunca quebra/encavala */
	.pin-wrap{
  		display:flex;
  		gap:10px;
  		justify-content:center;
  		align-items:center;
  		width:100%;
  		flex-wrap: nowrap;          /* <- impede quebrar */
	}

	.pin-box{
  		box-sizing: border-box;     /* <- evita “crescer” e bagunçar */
	}

	/* Responsivo */
	@media (max-width: 860px){
  	.start-actions-fixed{
    		grid-template-columns: 1fr;
   		 gap: 14px;
 	 }
	}



        .pin-hint{
          font-size: 11px;
          text-align: center;
          color: ${UI.muted};
        }
        .pin-hint[data-len="0"]{ color: ${UI.muted}; }
        .pin-hint[data-len]:not([data-len="0"])[data-ok="1"]{ color: ${UI.good}; }
        .pin-hint[data-len]:not([data-len="0"])[data-ok="0"]{ color: ${UI.warn}; }

        .pin-wrap{
          display:flex;
          gap:10px;
          justify-content:center;
          align-items:center;
          width:100%;
        }

        /* “Metal escovado + neon” + rebites */
        .pin-box{
          width: 46px;
          height: 56px;
          border-radius: 14px;

          background:
            radial-gradient(circle at 10px 10px,
              rgba(255,255,255,.70) 0 2px,
              rgba(0,0,0,.55) 2px 3px,
              rgba(255,255,255,.12) 3px 6px,
              rgba(0,0,0,0) 7px
            ),
            radial-gradient(circle at calc(100% - 10px) 10px,
              rgba(255,255,255,.70) 0 2px,
              rgba(0,0,0,.55) 2px 3px,
              rgba(255,255,255,.12) 3px 6px,
              rgba(0,0,0,0) 7px
            ),
            radial-gradient(circle at 10px calc(100% - 10px),
              rgba(255,255,255,.70) 0 2px,
              rgba(0,0,0,.55) 2px 3px,
              rgba(255,255,255,.12) 3px 6px,
              rgba(0,0,0,0) 7px
            ),
            radial-gradient(circle at calc(100% - 10px) calc(100% - 10px),
              rgba(255,255,255,.70) 0 2px,
              rgba(0,0,0,.55) 2px 3px,
              rgba(255,255,255,.12) 3px 6px,
              rgba(0,0,0,0) 7px
            ),
            linear-gradient(180deg, rgba(255,255,255,.10), rgba(255,255,255,.02) 45%, rgba(0,0,0,.25)),
            repeating-linear-gradient(
              90deg,
              rgba(255,255,255,.06) 0px,
              rgba(255,255,255,.06) 1px,
              rgba(255,255,255,.00) 2px,
              rgba(255,255,255,.00) 8px
            ),
            linear-gradient(180deg, rgba(20,22,26,.92), rgba(10,11,13,.92));

          border: 1px solid rgba(255,255,255,.12);
          color: ${UI.text};

          text-align: center;
          font-size: 18px;
          font-weight: 1100;
          letter-spacing: 1px;

          outline: none;

          box-shadow:
            0 18px 50px rgba(0,0,0,.40),
            inset 0 1px 0 rgba(255,255,255,.10),
            inset 0 -10px 18px rgba(0,0,0,.35);

          position: relative;
          transition: transform .08s ease, border-color .15s ease, box-shadow .15s ease, filter .15s ease;
          caret-color: transparent;
        }

        .pin-box::after{
          content:"";
          position:absolute;
          inset: 6px;
          border-radius: 10px;
          pointer-events:none;
          border: 1px solid rgba(255,255,255,.08);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,.08),
            inset 0 -8px 14px rgba(0,0,0,.25);
          opacity:.9;
        }

        .pin-box:focus{
          border-color: rgba(150,220,255,.62);
          box-shadow:
            0 0 0 4px rgba(150,220,255,.12),
            0 0 18px rgba(150,220,255,.22),
            0 18px 55px rgba(0,0,0,.45),
            inset 0 1px 0 rgba(255,255,255,.12),
            inset 0 -10px 18px rgba(0,0,0,.38);
          transform: translateY(-1px);
          filter: brightness(1.06);
        }

        .pin-box:disabled{
          opacity:.55;
          filter: grayscale(.2);
        }

        @media (max-width: 420px){
          .pin-box{ width: 42px; height: 54px; }
          .pin-wrap{ gap:8px; }
        }
      `}</style>
    </div>
  );
}
