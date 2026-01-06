import React, { useEffect, useMemo, useState } from "react";
import { socket } from "./net.js";

function Button({ children, ...props }) {
  return (
    <button
      {...props}
      style={{
        padding: "10px 12px",
        borderRadius: 10,
        border: "1px solid #444",
        background: "#111",
        color: "#fff",
        cursor: "pointer",
        opacity: props.disabled ? 0.55 : 1
      }}
    >
      {children}
    </button>
  );
}

function Pill({ children }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 10px",
        borderRadius: 999,
        border: "1px solid #2a2a2a",
        background: "#0f0f0f",
        fontSize: 12,
        opacity: 0.9
      }}
    >
      {children}
    </span>
  );
}

function CardBox({ title, children }) {
  return (
    <div style={{ border: "1px solid #333", borderRadius: 14, padding: 12 }}>
      <h2 style={{ marginTop: 0 }}>{title}</h2>
      {children}
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
  const [timeLeft, setTimeLeft] = useState(30);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    socket.on("state", setState);
    socket.on("hand", setHand);
    return () => {
      socket.off("state", setState);
      socket.off("hand", setHand);
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

  const inRoom = !!state?.code;
  const phase = state?.phase || "lobby";

  const myReady = useMemo(() => {
    if (seat == null || !state) return false;
    return state.ready?.[seat] ?? false;
  }, [seat, state]);

  const playersCount = useMemo(() => {
    if (!state?.names) return 0;
    return state.names.filter(Boolean).length;
  }, [state]);

  const allIn = useMemo(() => {
    if (!state?.names) return false;
    return playersCount === 4;
  }, [playersCount]);

  const allReady = useMemo(() => {
    if (!state?.ready) return false;
    return state.ready.every(Boolean);
  }, [state]);

  const roomStatusText = useMemo(() => {
    if (!state) return "";
    if (phase === "playing") return "Partida em andamento.";
    if (phase === "ended") return "Partida encerrada.";

    // lobby
    if (playersCount < 4) return `Aguardando jogadores (${playersCount}/4)…`;
    if (playersCount === 4 && !allReady) return "Todos entraram. Aguardando todos ficarem prontos…";
    if (playersCount === 4 && allReady) return "Iniciando partida…";
    return "Aguardando…";
  }, [state, phase, playersCount, allReady]);

  async function copyRoomCode() {
    try {
      await navigator.clipboard.writeText(state?.code || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 1000);
    } catch {
      alert("Não consegui copiar. Copie manualmente o código.");
    }
  }

  function leaveRoomLocal() {
    // (opcional) se você criar um evento no server futuramente, pode emitir aqui:
    // socket.emit("room:leave", { code: state?.code });

    setState(null);
    setSeat(null);
    setHand([]);
    setChatMsg("");
    setCodeInput("");
    setCopied(false);
  }

  const isMyTurn = phase === "playing" && state?.turnSeat === seat;

  return (
    <div
      style={{
        fontFamily: "system-ui",
        background: "#0b0b0b",
        color: "#fff",
        minHeight: "100vh",
        padding: 18
      }}
    >
      <h1 style={{ marginTop: 0 }}>Serra MVP</h1>

      {/* TELA INICIAL */}
      {!inRoom && (
        <div style={{ display: "grid", gap: 12, maxWidth: 520 }}>
          <label>
            Seu nome
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                width: "100%",
                padding: 10,
                borderRadius: 10,
                marginTop: 6,
                background: "#101010",
                color: "#fff",
                border: "1px solid #333"
              }}
            />
          </label>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Button
              onClick={() =>
                socket.emit("create_room", { name }, (res) => {
                  if (!res?.ok) return alert(res?.err || "Erro");
                  setSeat(res.seat);
                  setState(res.state);
                  setCodeInput(res.code);
                })
              }
            >
              Criar sala
            </Button>

            <input
              placeholder="CÓDIGO"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
              style={{
                flex: 1,
                padding: 10,
                borderRadius: 10,
                background: "#101010",
                color: "#fff",
                border: "1px solid #333"
              }}
            />

            <Button
              onClick={() =>
                socket.emit("join_room", { code: codeInput, name }, (res) => {
                  if (!res?.ok) return alert(res?.err || "Erro");
                  setSeat(res.seat);
                  setState(res.state);
                })
              }
            >
              Entrar
            </Button>
          </div>

          <div style={{ opacity: 0.8, fontSize: 12 }}>
            Dica: crie uma sala e compartilhe o código com seus amigos.
          </div>
        </div>
      )}

      {/* DENTRO DA SALA */}
      {inRoom && state && (
        <div style={{ display: "grid", gap: 14, maxWidth: 1100 }}>
          {/* TOPO DA SALA */}
          <div
            style={{
              border: "1px solid #333",
              borderRadius: 14,
              padding: 12,
              display: "grid",
              gap: 10
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <Pill>
                  Sala: <b style={{ letterSpacing: 2 }}>{state.code}</b>
                </Pill>
                <Pill>
                  Você: <b>Seat {seat + 1}</b>
                </Pill>
                <Pill>
                  Fase: <b>{phase}</b>
                </Pill>
                {phase === "playing" && (
                  <Pill>
                    ⏱️ Tempo: <b>{timeLeft}s</b>
                  </Pill>
                )}
                <Pill>
                  Jogadores: <b>{playersCount}/4</b>
                </Pill>
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <Button onClick={copyRoomCode}>{copied ? "✅ Copiado!" : "Copiar código"}</Button>
                <Button onClick={leaveRoomLocal}>Sair</Button>

                {phase === "lobby" && (
                  <Button
                    onClick={() => socket.emit("set_ready", { code: state.code, ready: !myReady })}
                    disabled={playersCount < 1}
                  >
                    {myReady ? "Cancelar pronto" : "Pronto"}
                  </Button>
                )}
              </div>
            </div>

            {/* CÓDIGO GIGANTE */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                padding: "10px 0 0"
              }}
            >
              <div
                style={{
                  fontSize: 44,
                  fontWeight: 900,
                  letterSpacing: 10,
                  padding: "10px 16px",
                  borderRadius: 16,
                  border: "1px dashed #444",
                  background: "#0f0f0f"
                }}
              >
                {state.code}
              </div>
            </div>

            <div style={{ textAlign: "center", opacity: 0.9 }}>{roomStatusText}</div>

            <div style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
              <Pill>
                Trunfo: <b>{state.trumpSuit || "—"}</b>
              </Pill>
              <Pill>
                Carta virada:{" "}
                <b>{state.faceUp ? `${state.faceUp.v}${state.faceUp.s}` : "—"}</b>
              </Pill>
              <Pill>
                Placar: Time 1 <b>{state.teamScore?.[0] ?? 0}</b> x <b>{state.teamScore?.[1] ?? 0}</b> Time 2
              </Pill>
              <Pill>
                Turno: <b>Seat {(state.turnSeat ?? 0) + 1}</b>
              </Pill>
            </div>
          </div>

          {/* GRID PRINCIPAL */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 14 }}>
            {/* MESA */}
            <CardBox title="Mesa">
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {(state.trick || []).map((t, i) => (
                  <div
                    key={i}
                    style={{
                      padding: 10,
                      border: "1px solid #444",
                      borderRadius: 12,
                      minWidth: 86,
                      textAlign: "center",
                      background: t.seat === seat ? "#151515" : "#0f0f0f"
                    }}
                  >
                    <div style={{ fontSize: 12, opacity: 0.85 }}>
                      Seat {t.seat + 1} {t.seat === seat ? "(você)" : ""}
                    </div>
                    <div style={{ fontSize: 26, fontWeight: 700 }}>
                      {t.card.v}
                      {t.card.s}
                    </div>
                  </div>
                ))}
                {(!state.trick || state.trick.length === 0) && (
                  <div style={{ opacity: 0.7 }}>Aguardando jogadas…</div>
                )}
              </div>

              <div style={{ marginTop: 12, opacity: 0.9 }}>
                Líder: <b>Seat {(state.leaderSeat ?? 0) + 1}</b> •{" "}
                {isMyTurn ? <b>✅ É seu turno!</b> : <span>É a vez do Seat {(state.turnSeat ?? 0) + 1}</span>}
              </div>

              <h3>Sua mão</h3>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {hand.map((c) => (
                  <button
                    key={c.id}
                    disabled={!isMyTurn}
                    onClick={() =>
                      socket.emit("play_card", { code: state.code, cardId: c.id }, (res) => {
                        if (!res?.ok) alert(res?.err || "Jogada inválida");
                      })
                    }
                    style={{
                      padding: "10px 12px",
                      borderRadius: 12,
                      border: "1px solid #444",
                      background: isMyTurn ? "#141414" : "#0f0f0f",
                      color: "#fff",
                      cursor: isMyTurn ? "pointer" : "not-allowed"
                    }}
                  >
                    {c.v}
                    {c.s}
                  </button>
                ))}
                {hand.length === 0 && <div style={{ opacity: 0.7 }}>Sem cartas (ou aguardando início)</div>}
              </div>

              {phase === "ended" && (
                <div style={{ marginTop: 14, padding: 12, borderRadius: 14, border: "1px solid #555" }}>
                  <b>Partida encerrada.</b> (MVP) — reinicie criando nova sala.
                </div>
              )}
            </CardBox>

            {/* LOBBY / CHAT */}
            <CardBox title="Lobby / Chat">
              <div style={{ display: "grid", gap: 6, marginBottom: 10 }}>
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
                        opacity: occupied ? 1 : 0.5,
                        padding: "8px 10px",
                        borderRadius: 12,
                        border: "1px solid #222",
                        background: isMe ? "#121212" : "#0f0f0f"
                      }}
                    >
                      <span>
                        Seat {i + 1}: <b>{n || "—"}</b> {isMe ? <span style={{ opacity: 0.85 }}> (você)</span> : ""}
                      </span>
                      <span title={ready ? "Pronto" : "Aguardando"}>
                        {occupied ? (ready ? "✅" : "⏳") : "—"}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div
                style={{
                  height: 240,
                  overflow: "auto",
                  border: "1px solid #222",
                  borderRadius: 12,
                  padding: 10,
                  marginBottom: 10,
                  background: "#0f0f0f"
                }}
              >
                {(state.chat || []).map((m, i) => (
                  <div key={i} style={{ marginBottom: 6 }}>
                    <b>{m.name}:</b> <span>{m.msg}</span>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={chatMsg}
                  onChange={(e) => setChatMsg(e.target.value)}
                  placeholder="Digite…"
                  style={{
                    flex: 1,
                    padding: 10,
                    borderRadius: 10,
                    background: "#101010",
                    color: "#fff",
                    border: "1px solid #333"
                  }}
                />
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
                  <Button key={t} onClick={() => socket.emit("chat", { code: state.code, msg: t })}>
                    {t}
                  </Button>
                ))}
              </div>
            </CardBox>
          </div>
        </div>
      )}
    </div>
  );
}
