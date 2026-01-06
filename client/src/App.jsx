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
        cursor: "pointer"
      }}
    >
      {children}
    </button>
  );
}

export default function App() {
  const [name, setName] = useState("Willian");
  const [code, setCode] = useState("");
  const [seat, setSeat] = useState(null);
  const [state, setState] = useState(null);
  const [hand, setHand] = useState([]);
  const [chatMsg, setChatMsg] = useState("");
  const [timeLeft, setTimeLeft] = useState(30);

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

  const myReady = useMemo(() => {
    if (seat == null || !state) return false;
    return state.ready?.[seat] ?? false;
  }, [seat, state]);

  const phase = state?.phase || "lobby";

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

      {!inRoom && (
        <div style={{ display: "grid", gap: 12, maxWidth: 420 }}>
          <label>
            Seu nome
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ width: "100%", padding: 10, borderRadius: 10, marginTop: 6 }}
            />
          </label>

          <div style={{ display: "flex", gap: 8 }}>
            <Button
              onClick={() =>
                socket.emit("create_room", { name }, (res) => {
                  if (!res?.ok) return alert(res?.err || "Erro");
                  setCode(res.code);
                  setSeat(res.seat);
                  setState(res.state);
                })
              }
            >
              Criar sala
            </Button>

            <input
              placeholder="CÓDIGO"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              style={{ flex: 1, padding: 10, borderRadius: 10 }}
            />
            <Button
              onClick={() =>
                socket.emit("join_room", { code, name }, (res) => {
                  if (!res?.ok) return alert(res?.err || "Erro");
                  setSeat(res.seat);
                  setState(res.state);
                })
              }
            >
              Entrar
            </Button>
          </div>
        </div>
      )}

      {inRoom && state && (
        <div style={{ display: "grid", gap: 14, maxWidth: 980 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div>
                Sala: <b>{state.code}</b> • Você: <b>Seat {seat + 1}</b> • Fase: <b>{phase}</b>
              </div>
              <div>
                Trunfo: <b>{state.trumpSuit || "-"}</b> 
		<b>Carta virada: {state.faceUp ? `${state.faceUp.v}${state.faceUp.s}` : "-"}</b>
		• Placar: Time 1{" "}
                <b>{state.teamScore?.[0] ?? 0}</b> x <b>{state.teamScore?.[1] ?? 0}</b> Time 2
              </div>
            </div>
            {phase === "lobby" && (
              <Button onClick={() => socket.emit("set_ready", { code: state.code, ready: !myReady })}>
                {myReady ? "Cancelar pronto" : "Pronto"}
              </Button>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 14 }}>
            <div style={{ border: "1px solid #333", borderRadius: 14, padding: 12 }}>
              <h2 style={{ marginTop: 0 }}>Mesa</h2>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {(state.trick || []).map((t, i) => (
                  <div
                    key={i}
                    style={{
                      padding: 10,
                      border: "1px solid #444",
                      borderRadius: 12,
                      minWidth: 70,
                      textAlign: "center"
                    }}
                  >
                    <div style={{ fontSize: 12, opacity: 0.8 }}>Seat {t.seat + 1}</div>
                    <div style={{ fontSize: 22 }}>
                      {t.card.v}
                      {t.card.s}
                    </div>
                  </div>
                ))}
                {(!state.trick || state.trick.length === 0) && <div style={{ opacity: 0.7 }}>Aguardando jogadas…</div>}
              </div>

              <div style={{ marginTop: 12, opacity: 0.85 }}>
                Turno atual: <b>Seat {(state.turnSeat ?? 0) + 1}</b> • Líder: <b>Seat {(state.leaderSeat ?? 0) + 1}</b>
              </div>

              <h3>Sua mão</h3>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {hand.map((c) => {
                  const isMyTurn = state.turnSeat === seat && phase === "playing";
                  return (
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
                  );
                })}
                {hand.length === 0 && <div style={{ opacity: 0.7 }}>Sem cartas (ou aguardando início)</div>}
              </div>

              {phase === "ended" && (
                <div style={{ marginTop: 14, padding: 12, borderRadius: 14, border: "1px solid #555" }}>
                  <b>Partida encerrada.</b> (MVP) — reinicie criando nova sala.
                </div>
              )}
            </div>

            <div style={{ border: "1px solid #333", borderRadius: 14, padding: 12 }}>
              <h2 style={{ marginTop: 0 }}>Lobby / Chat</h2>

              <div style={{ display: "grid", gap: 6, marginBottom: 10 }}>
                {state.names.map((n, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", opacity: n ? 1 : 0.5 }}>
                    <span>
                      Seat {i + 1}: <b>{n || "—"}</b>
                    </span>
                    <span>{state.ready[i] ? "✅" : "⏳"}</span>
                  </div>
                ))}
              </div>

              <div
                style={{
                  height: 220,
                  overflow: "auto",
                  border: "1px solid #222",
                  borderRadius: 12,
                  padding: 10,
                  marginBottom: 10
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
                  style={{ flex: 1, padding: 10, borderRadius: 10 }}
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
