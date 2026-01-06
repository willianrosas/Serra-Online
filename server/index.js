import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import {
  makeDeck, shuffle, trickWinner, teamOfSeat, nextSeat,
  cardPoints, strengthRank
} from "./game.js";

const app = express();
app.get("/", (_, res) => res.send("serra server ok"));
app.get("/health", (_, res) => res.send("OK"));

const httpServer = createServer(app);

// ✅ CORS: em produção, coloque sua URL da Vercel em CLIENT_ORIGIN no Render.
// Ex: https://serra-online.vercel.app
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "*";

const io = new Server(httpServer, {
  cors: {
    origin: CLIENT_ORIGIN === "*" ? "*" : [CLIENT_ORIGIN],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

/**
 * room state:
 * {
 *  code, seats: [socketId|null,...],
 *  names: ["","",...],
 *  ready: [false,...],
 *  phase: "lobby"|"playing"|"ended",
 *  deck: [], hands: [[],[],[],[]],
 *  trumpSuit: "♠"...,
 *  leaderSeat: 0,
 *  turnSeat: 0,
 *  trick: [{seat, card}],
 *  tricksPlayed: number,
 *  teamScore: [0,0],
 *  chat: [{name,msg,ts}],
 *  turnDeadline: number|null
 * }
 */
const rooms = new Map();

function mkCode() {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 5; i++) code += alphabet[(Math.random() * alphabet.length) | 0];
  return code;
}

function getRoom(code) {
  const c = String(code || "").toUpperCase().trim();
  const r = rooms.get(c);
  if (!r) throw new Error("Sala não existe");
  return r;
}

function publicState(r) {
  return {
    code: r.code,
    seats: r.seats.map((s) => (s ? "occupied" : "empty")),
    names: r.names,
    ready: r.ready,
    phase: r.phase,
    trumpSuit: r.trumpSuit,
    leaderSeat: r.leaderSeat,
    turnSeat: r.turnSeat,
    trick: r.trick,
    teamScore: r.teamScore,
    tricksPlayed: r.tricksPlayed,
    chat: r.chat.slice(-25),
    turnDeadline: r.turnDeadline,
  };
}

function seatOf(r, socketId) {
  return r.seats.findIndex((s) => s === socketId);
}

function setTurnDeadline(r) {
  r.turnDeadline = Date.now() + 30_000;
}
function clearTurnDeadline(r) {
  r.turnDeadline = null;
}

function startGame(r) {
  r.phase = "playing";
  r.deck = shuffle(makeDeck());

  // trunfo simples: último card do deck
  r.trumpSuit = r.deck[r.deck.length - 1]?.s ?? null;

  r.hands = [[], [], [], []];

  // ⚠️ Seu comentário diz "4 cada", mas o código distribui 3.
  // Vou manter 3 (como você já vinha usando). Se quiser 4, trocamos depois.
  for (let i = 0; i < 4; i++) r.hands[i] = r.deck.splice(0, 3);

  r.trick = [];
  r.tricksPlayed = 0;
  r.teamScore = [0, 0];
  r.leaderSeat = 0;
  r.turnSeat = r.leaderSeat;

  setTurnDeadline(r);
}

function canPlay(r, seat, cardId) {
  if (r.phase !== "playing") return { ok: false, why: "Não está em jogo" };
  if (seat < 0) return { ok: false, why: "Você não está na sala" };
  if (r.turnSeat !== seat) return { ok: false, why: "Não é seu turno" };

  const hand = r.hands[seat] || [];
  if (!hand.some((c) => c.id === cardId)) return { ok: false, why: "Carta não está na sua mão" };
  return { ok: true };
}

// Scoring simples: soma cardPoints + bônus última vaza (se quiser)
function scoreTrick(cards, trumpSuit, isLastTrick) {
  const base = cards.reduce((sum, c) => sum + cardPoints(c), 0);
  return isLastTrick ? base + 1 : base;
}

function sendHands(r) {
  for (let s = 0; s < 4; s++) {
    const sid = r.seats[s];
    if (sid) io.to(sid).emit("hand", r.hands[s]);
  }
}

function autoPlayLowest(r, seat) {
  const hand = r.hands[seat];
  if (!hand || hand.length === 0) return null;
  let best = hand[0];
  for (const c of hand.slice(1)) {
    if (strengthRank(c, r.trumpSuit) < strengthRank(best, r.trumpSuit)) best = c;
  }
  return best;
}

io.on("connection", (socket) => {
  console.log("✅ Conectou:", socket.id);

  socket.on("create_room", ({ name }, cb) => {
    const code = mkCode();
    const room = {
      code,
      seats: [null, null, null, null],
      names: ["", "", "", ""],
      ready: [false, false, false, false],
      phase: "lobby",
      deck: [],
      hands: [[], [], [], []],
      trumpSuit: null,
      leaderSeat: 0,
      turnSeat: 0,
      turnDeadline: null,
      trick: [],
      tricksPlayed: 0,
      teamScore: [0, 0],
      chat: [],
    };
    rooms.set(code, room);

    room.seats[0] = socket.id;
    room.names[0] = (name && String(name).trim()) || "Jogador 1";

    socket.join(code);

    cb?.({ ok: true, code, seat: 0, state: publicState(room) });
    io.to(code).emit("state", publicState(room));
  });

  socket.on("join_room", ({ code, name }, cb) => {
    try {
      const r = getRoom(code);
      const seat = r.seats.findIndex((s) => s === null);
      if (seat === -1) return cb?.({ ok: false, err: "Sala cheia" });

      r.seats[seat] = socket.id;
      r.names[seat] = (name && String(name).trim()) || `Jogador ${seat + 1}`;
      r.ready[seat] = false;

      socket.join(r.code);

      cb?.({ ok: true, code: r.code, seat, state: publicState(r) });
      io.to(r.code).emit("state", publicState(r));
    } catch (e) {
      cb?.({ ok: false, err: e.message });
    }
  });

  socket.on("set_ready", ({ code, ready }, cb) => {
    try {
      const r = getRoom(code);
      const seat = seatOf(r, socket.id);
      if (seat < 0) return cb?.({ ok: false, err: "Você não está na sala" });

      r.ready[seat] = !!ready;

      const allIn = r.seats.every((s) => s !== null);
      const allReady = r.ready.every(Boolean);

      if (r.phase === "lobby" && allIn && allReady) {
        startGame(r);
      }

      cb?.({ ok: true });
      io.to(r.code).emit("state", publicState(r));

      if (r.phase === "playing") {
        sendHands(r);
      }
    } catch (e) {
      cb?.({ ok: false, err: e.message });
    }
  });

  socket.on("play_card", ({ code, cardId }, cb) => {
    try {
      const r = getRoom(code);
      const seat = seatOf(r, socket.id);
      const check = canPlay(r, seat, cardId);
      if (!check.ok) return cb?.({ ok: false, err: check.why });

      // remove da mão
      const idx = r.hands[seat].findIndex((c) => c.id === cardId);
      const [card] = r.hands[seat].splice(idx, 1);

      r.trick.push({ seat, card });

      // próximo turno
      r.turnSeat = nextSeat(r.turnSeat);
      setTurnDeadline(r);

      // fechou a vaza?
      if (r.trick.length === 4) {
        const winner = trickWinner(r.trick, r.trumpSuit);

        r.leaderSeat = winner;
        r.turnSeat = winner;

        r.tricksPlayed += 1;
        const isLastTrick = r.tricksPlayed === 8;

        const pts = scoreTrick(r.trick.map((t) => t.card), r.trumpSuit, isLastTrick);
        r.teamScore[teamOfSeat(winner)] += pts;

        r.trick = [];

        // fim do jogo (MVP)
        if (r.teamScore[0] >= 61 || r.teamScore[1] >= 61 || isLastTrick) {
          r.phase = "ended";
          clearTurnDeadline(r);
        } else {
          setTurnDeadline(r);
        }
      }

      cb?.({ ok: true });
      io.to(r.code).emit("state", publicState(r));
      sendHands(r);
    } catch (e) {
      cb?.({ ok: false, err: e.message });
    }
  });

  socket.on("chat", ({ code, msg }, cb) => {
    try {
      const r = getRoom(code);
      const seat = seatOf(r, socket.id);
      if (seat < 0) return cb?.({ ok: false, err: "Fora da sala" });

      const m = String(msg || "").slice(0, 80);
      if (!m.trim()) return cb?.({ ok: false, err: "Mensagem vazia" });

      r.chat.push({ name: r.names[seat], msg: m, ts: Date.now() });
      io.to(r.code).emit("state", publicState(r));
      cb?.({ ok: true });
    } catch (e) {
      cb?.({ ok: false, err: e.message });
    }
  });

  socket.on("leave_room", ({ code }, cb) => {
  try {
    const r = getRoom(code);
    const seat = seatOf(r, socket.id);
    if (seat < 0) return cb?.({ ok: false, err: "Você não está na sala" });

    // libera o assento
    r.seats[seat] = null;
    r.names[seat] = "";
    r.ready[seat] = false;

    // volta pro lobby e reseta estado (MVP)
    r.phase = "lobby";
    clearTurnDeadline(r);
    r.trick = [];
    r.teamScore = [0, 0];
    r.tricksPlayed = 0;

    // sai do room do socket.io
    socket.leave(r.code);

    // avisa todos
    io.to(r.code).emit("state", publicState(r));

    cb?.({ ok: true });
  } catch (e) {
    cb?.({ ok: false, err: e.message });
  }
});

  socket.on("disconnect", () => {
    for (const r of rooms.values()) {
      const seat = seatOf(r, socket.id);
      if (seat >= 0) {
        r.seats[seat] = null;
        r.names[seat] = "";
        r.ready[seat] = false;

        // MVP: volta pro lobby se alguém sai
        r.phase = "lobby";
        clearTurnDeadline(r);
        r.trick = [];
        r.teamScore = [0, 0];

        io.to(r.code).emit("state", publicState(r));
      }
    }
  });
});

// ✅ Autoplay: DESATIVADO por segurança (o seu bloco antigo referencia variáveis/funções ausentes).
// Quando você quiser reativar, eu reescrevo o autoplay alinhado com ESTE state.
// const AUTOPLAY = process.env.AUTOPLAY === "1";
// if (AUTOPLAY) {
//   setInterval(() => {
//     const now = Date.now();
//     for (const r of rooms.values()) {
//       if (r.phase !== "playing") continue;
//       if (!r.turnDeadline) continue;
//       if (now < r.turnDeadline) continue;
//       const seat = r.turnSeat;
//       const sid = r.seats[seat];
//       if (!sid) continue;

//       const card = autoPlayLowest(r, seat);
//       if (!card) { setTurnDeadline(r); continue; }

//       const i = r.hands[seat].findIndex(c => c.id === card.id);
//       if (i >= 0) r.hands[seat].splice(i, 1);

//       r.trick.push({ seat, card });
//       r.turnSeat = nextSeat(r.turnSeat);

//       r.chat.push({ name: "Sistema", msg: `⏱️ Tempo esgotado: ${r.names[seat] || "Jogador"} jogou ${card.v}${card.s}`, ts: Date.now() });

//       io.to(r.code).emit("state", publicState(r));
//       sendHands(r);
//       setTurnDeadline(r);
//     }
//   }, 500);
// }

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => console.log("Server on :", PORT));
