import React, { useEffect, useMemo, useRef, useState } from "react";
import { socket } from "./net.js";
import { Card, DeckStack, FaceDownFan } from "./ui/cards.jsx";

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
  };
  const variants = {
    primary: {
      background: "linear-gradient(180deg, rgba(110,231,255,.18), rgba(110,231,255,.06))",
      border: "1px solid rgba(110,231,255,.35)",
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
        backdropFilter: "blur(8px)",
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
    accent: { b: "rgba(110,231,255,.35)", bg: "rgba(110,231,255,.10)", c: UI.accent },
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
              borderTop: "3px solid rgba(110,231,255,.75)",
              animation: "spin 0.9s linear infinite",
            }}
          />
          <div style={{ width: 8, height: 8, borderRadius: 99, background: "rgba(110,231,255,.8)", animation: "pulse 1s ease-in-out infinite" }} />
          <div style={{ width: 8, height: 8, borderRadius: 99, background: "rgba(255,209,102,.8)", animation: "pulse 1s ease-in-out .15s infinite" }} />
          <div style={{ width: 8, height: 8, borderRadius: 99, background: "rgba(255,92,122,.8)", animation: "pulse 1s ease-in-out .30s infinite" }} />
        </div>
      </div>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { transform: translateY(0); opacity:.6; } 50% { transform: translateY(-4px); opacity:1; } }
      `}</style>
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
        }}
      >
        {children}
      </div>
    </div>
  );
}

function EndModal({ show, title, subtitle, onRestart, onClose }) {
  if (!show) return null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.68)", display: "grid", placeItems: "center", zIndex: 999 }}>
      <div style={{ width: 520, maxWidth: "92vw", borderRadius: 18, border: `1px solid ${UI.border}`, background: UI.panel, padding: 18 }}>
        <div style={{ fontSize: 18, fontWeight: 1100 }}>{title}</div>
        <div style={{ marginTop: 6, color: UI.muted, fontSize: 13 }}>{subtitle}</div>

        <div style={{ marginTop: 14, display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
          <Button variant="ghost" onClick={onClose}>Fechar</Button>
          <Button onClick={onRestart}>Nova rodada</Button>
        </div>
      </div>
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

  // Toast: lastTrick
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
      // state vai vir via broadcast
    });
  }

  // Mesa: mapeamento visual por seat
  const pos = useMemo(() => {
    // layout: bottom = seat do usuário, top = parceiro (seat+2), left/right = restantes
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
        background: `
          radial-gradient(circle at 20% 10%, rgba(110,231,255,.12), transparent 45%),
          radial-gradient(circle at 75% 25%, rgba(255,209,102,.10), transparent 48%),
          radial-gradient(circle at 60% 95%, rgba(255,92,122,.10), transparent 55%),
          radial-gradient(circle at 50% 55%, rgba(255,255,255,.04), transparent 58%),
          ${UI.bg}
        `,
        color: UI.text,
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
      }}
    >
      <LoadingOverlay show={loading} text="Preparando o barracão…" />

      <Toast show={!!toast}>
        <div style={{ fontWeight: 1000 }}>
          ✅ Vaza: <span style={{ color: UI.accent }}>Seat {(toast?.winnerSeat ?? 0) + 1}</span> • Time{" "}
          <span style={{ color: UI.good }}>{(toast?.winnerTeam ?? 0) + 1}</span> • +{toast?.points ?? 0} pts
        </div>
        <div style={{ marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap" }}>
          {(toast?.cards || []).slice(0, 4).map((c, i) => (
            <Card key={i} card={c} compact disabled trumpSuit={trumpSuit} trumpCard={trumpCard} showBadges={false} />
          ))}
        </div>
      </Toast>

      <EndModal
        show={phase === "ended"}
        title={endTitle}
        subtitle={endSubtitle}
        onRestart={restartGame}
        onClose={() => {}}
      />

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 1100, letterSpacing: 0.4 }}>Serra Online</div>
          <div style={{ fontSize: 12, color: UI.muted }}>Rústico + gamer • 2x2 • 61+ pontos</div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <Pill tone={conn === "online" ? "good" : conn === "connecting" ? "warn" : "bad"}>
            {conn === "online" ? "● Online" : conn === "connecting" ? "● Conectando" : "● Offline"}
          </Pill>
          {inRoom && (
            <Button variant="danger" onClick={leaveRoom} disabled={loading}>
              <Icon name="exit" />
              Sair
            </Button>
          )}
        </div>
      </div>

      <div style={{ marginTop: 16, maxWidth: 1180 }}>
        {!inRoom ? (
          <div style={{ display: "grid", gridTemplateColumns: "1.25fr .75fr", gap: 14, alignItems: "start" }}>
            <Panel title="Entrar no jogo" right={<Pill tone="accent">61+ pontos</Pill>}>
              <div style={{ display: "grid", gap: 10, maxWidth: 560 }}>
                <div style={{ display: "grid", gap: 6 }}>
                  <div style={{ fontSize: 12, color: UI.muted }}>Seu nome</div>
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
                </div>

                {/* ✅ GRID definitivo: não sobrepõe nunca */}
                <div className="start-actions">
                  <Button onClick={createRoom} disabled={conn !== "online"} style={{ minWidth: 140 }}>
                    <Icon name="plus" />
                    Criar sala
                  </Button>

                  <div style={{ display: "grid", gap: 6 }}>
                    <Input
                      placeholder="CÓDIGO"
                      value={codeNormalized}
                      onChange={(e) => setCodeInput(e.target.value)}
                      style={{ textTransform: "uppercase", letterSpacing: 3, textAlign: "center" }}
                    />
                    <div style={{ fontSize: 11, color: codeInput.length === 0 ? UI.muted : codeLooksValid ? UI.good : UI.warn }}>
                      {codeInput.length === 0 ? "5 caracteres" : codeLooksValid ? "Código ok" : "Código inválido"}
                    </div>
                  </div>

                  <Button onClick={joinRoom} disabled={conn !== "online" || !codeLooksValid} style={{ minWidth: 110 }}>
                    <Icon name="enter" />
                    Entrar
                  </Button>
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Pill>Compartilhe o código com amigos</Pill>
                  <Pill>Lobby inicia quando 4 estiverem prontos</Pill>
                </div>

                <style>{`
                  .start-actions{
                    display:grid;
                    grid-template-columns: auto 140px auto;
                    gap:10px;
                    align-items:start;
                  }
                  @media (max-width: 720px){
                    .start-actions{
                      grid-template-columns: 1fr 1fr;
                    }
                    .start-actions > :nth-child(2){
                      grid-column: 1 / -1;
                    }
                  }
                `}</style>
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
                    <Button variant="ghost" onClick={copyRoomCode}>
                      <Icon name="copy" />
                      {copied ? "Copiado!" : "Copiar"}
                    </Button>
                    {phase === "lobby" && (
                      <Button onClick={() => socket.emit("set_ready", { code: state.code, ready: !myReady })}>
                        {myReady ? "Cancelar pronto" : "Pronto"}
                      </Button>
                    )}
                    {phase === "ended" && (
                      <Button onClick={restartGame}>Nova rodada</Button>
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
                  {/* “madeira/barracão” sutil */}
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

                  {/* Top player */}
                  {pos && (
                    <div style={{ position: "absolute", top: 10, left: 0, right: 0, display: "grid", placeItems: "center", gap: 6 }}>
                      <div style={{ color: UI.muted, fontSize: 12, fontWeight: 900 }}>
                        Seat {pos.top + 1} • {state.names?.[pos.top] || "—"} • {state.handCounts?.[pos.top] ?? 0} cartas
                      </div>
                      <FaceDownFan count={state.handCounts?.[pos.top] ?? 0} />
                    </div>
                  )}

                  {/* Left player */}
                  {pos && (
                    <div style={{ position: "absolute", top: 120, left: 10, display: "grid", placeItems: "center", gap: 6 }}>
                      <div style={{ color: UI.muted, fontSize: 12, fontWeight: 900, transform: "rotate(-90deg)" }}>
                        Seat {pos.left + 1}
                      </div>
                      <FaceDownFan count={state.handCounts?.[pos.left] ?? 0} />
                    </div>
                  )}

                  {/* Right player */}
                  {pos && (
                    <div style={{ position: "absolute", top: 120, right: 10, display: "grid", placeItems: "center", gap: 6 }}>
                      <div style={{ color: UI.muted, fontSize: 12, fontWeight: 900, transform: "rotate(90deg)" }}>
                        Seat {pos.right + 1}
                      </div>
                      <FaceDownFan count={state.handCounts?.[pos.right] ?? 0} />
                    </div>
                  )}

                  {/* Center trick */}
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
                          <Pill tone="warn">Bisca: <b style={{ color: UI.text }}>A</b> e <b style={{ color: UI.text }}>7</b> (não-trunfo)</Pill>
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

                  {/* Bottom player (YOU) */}
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
                          background: isMe ? "rgba(110,231,255,.08)" : "rgba(255,255,255,.02)",
                          opacity: occupied ? 1 : 0.55,
                        }}
                      >
                        <div style={{ display: "grid", gap: 2 }}>
                          <div style={{ fontWeight: 1000 }}>
                            Seat {i + 1} {isMe ? <span style={{ color: UI.accent }}>(você)</span> : ""}
                          </div>
                          <div style={{ fontSize: 12, color: UI.muted }}>{n || "—"}</div>
                        </div>
                        <div>
                          {!occupied ? <Pill>Vazio</Pill> : ready ? <Pill tone="good">Pronto</Pill> : <Pill tone="warn">Aguardando</Pill>}
                        </div>
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
                      <span style={{ fontWeight: 1000 }}>{m.name}:</span>{" "}
                      <span style={{ color: UI.text }}>{m.msg}</span>
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
                  >
                    Enviar
                  </Button>
                </div>

                <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {["Tem bisca aí?", "Confia em mim…", "Obrigado pela bisca!", "É minha!", "Que azar!"].map((t) => (
                    <Button key={t} variant="ghost" onClick={() => socket.emit("chat", { code: state.code, msg: t })}>
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
  );
}
