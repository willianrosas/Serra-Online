import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import {
  makeDeck,
  shuffle,
  trickWinner,
  teamOfSeat,
  nextSeat,
  cardPoints,
  strengthRank,
} from "./game.js";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

const rooms = new Map();

/** ---------- helpers ---------- */
function mkCode() {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 5; i++) code += alphabet[(Math.random() * alphabet.length) | 0];
  return code;
}

function getRoom(code) {
  const r = rooms.get(code);
  if (!r) throw new Error("Sala não existe");
  return r;
}

function seatOf(r, socketId) {
  return r.seats.findIndex((s) => s === socketId);
}

function countPlayers(r) {
  return r.seats.filter(Boolean).length;
}

function deckCount(r) {
  return (r.deck?.length || 0) + (r.faceUp ? 1 : 0);
}

function publicState(r) {
  return {
    code: r.code,
    seats: r.seats.map((s) => (s ? "occupied" : "empty")),
    names: r.names,
    ready: r.ready,
    phase: r.phase,

    trumpSuit: r.trumpSuit,
    faceUp: r.faceUp || null,

    leaderSeat: r.leaderSeat,
    turnSeat: r.turnSeat,
    turnDeadline: r.turnDeadline,

    trick: r.trick,
    teamScore: r.teamScore,
    tricksPlayed: r.tricksPlayed,

    deckCount: deckCount(r),

    chat: r.chat.slice(-25),
  };
}

function sendHands(r) {
  for (let s = 0; s < 4; s++) {
    const sid = r.seats[s];
    if (sid) io.to(sid).emit("hand", r.hands[s]);
  }
}

function setTurnDeadline(r) {
  r.turnDeadline = Date.now() + 30_000;
}
function clearTurnDeadline(r) {
  r.turnDeadline = null;
}

/** Compra do "monte":
 * - Primeiro compra do r.deck
 * - Quando acabar, a faceUp (carta virada) vira a "última carta do monte" e pode ser comprada
 */
function drawFromStock(r) {
  if (r.deck.length > 0) return r.deck.shift();
  if (r.faceUp) {
    const c = r.faceUp;
    r.faceUp = null;
    return c;
  }
  return null;
}

/** Após fechar uma vaza: cada jogador compra 1 carta, começando pelo winnerSeat */
function dealAfterTrick(r, winnerSeat) {
  if (deckCount(r) <= 0) return;

  let seat = winnerSeat;
  for (let i = 0; i < 4; i++) {
    const c = drawFromStock(r);
    if (!c) break;
    r.hands[seat].push(c);
    seat = nextSeat(seat);
  }
}

function allHandsEmpty(r) {
  return r.hands.every((h) => h.length === 0);
}

function scoreTrick(cards, isLastTrick = false) {
  const pts = cards.reduce((sum, c) => sum + cardPoints(c), 0);
  // se você quiser bônus de última vaza, altere aqui (ex: +10)
  return pts + (isLastTrick ? 0 : 0);
}

function startGame(r) {
  r.phase = "playing";
  const full = shuffle(makeDeck());

  // carta virada (trunfo é uma carta real)
  r.faceUp = full.pop();
  r.trumpSuit = r.faceUp?.s || null;

  // resto vira "monte"
  r.deck = full;

  // mãos iniciais: 3 cartas
  r.hands = [[], [], [], []];
  for (let i = 0; i < 4; i++) {
    r.hands[i] = r.deck.splice(0, 3);
  }

  r.trick = [];
  r.tricksPlayed = 0;
  r.teamScore = [0, 0];

  r.leaderSeat = 0;
  r.turnSeat = r.leaderSeat;

  setTurnDeadline(r);
}

function canPlay(r, seat, cardId) {
  if (r.phase !== "playing") return { ok: false, why: "Não está em jogo" };
  if (r.turnSeat !== seat) return { ok: false, why: "Não é seu turno" };
  const hand = r.hands[seat];
  if (!hand.some((c) => c.id === cardId)) return { ok: false, why: "Carta não está na sua mão" };
  return { ok: true };
}

function cleanupRoomIfEmpty(r) {
  if (countPlayers(r) > 0) return false;
  rooms.delete(r.code);
  return true;
}

/** ---------- socket ---------- */
io.on("connection", (socket) => {
  socket.on("create_room", ({ name }, cb) => {
    const code = mkCode();
    const room = {
      code,
      seats: [null, null, null, null],
      names: ["", "", "", ""],
      ready: [false, false, false, false],
      phase: "lobby",

      deck: [],
      faceUp: null,
      hands: [[], [], [], []],

      trumpSuit: null,

      leaderSeat: 0,
      turnSeat: 0,
      turnDeadline: null,

      trick: [],
      tricksPlayed: 0,
      teamScore: [0, 0],

      chat: [],

      _autoplaying: false,
      _emptySince: null,
    };

    rooms.set(code, room);

    room.seats[0] = socket.id;
    room.names[0] = name || "Jogador 1";
    socket.join(code);

    cb?.({ ok: true, code, seat: 0, state: publicState(room) });
    io.to(code).emit("state", publicState(room));
  });

  socket.on("join_room", ({ code, name }, cb) => {
    try {
      const r = getRoom(String(code || "").toUpperCase());
      const seat = r.seats.findIndex((s) => s === null);
      if (seat === -1) return cb?.({ ok: false, err: "Sala cheia" });

      r.seats[seat] = socket.id;
      r.names[seat] = name || `Jogador ${seat + 1}`;
      r.ready[seat] = false;

      socket.join(r.code);

      cb?.({ ok: true, code: r.code, seat, state: publicState(r) });
      io.to(r.code).emit("state", publicState(r));
    } catch (e) {
      cb?.({ ok: false, err: e.message });
    }
  });

  socket.on("leave_room", ({ code }, cb) => {
    try {
      const r = getRoom(String(code || "").toUpperCase());
      const seat = seatOf(r, socket.id);
      if (seat >= 0) {
        r.seats[seat] = null;
        r.names[seat] = "";
        r.ready[seat] = false;

        socket.leave(r.code);

        // volta pro lobby se alguém sair durante o jogo
        r.phase = "lobby";
        r.trick = [];
        r.teamScore = [0, 0];
        r.tricksPlayed = 0;
        r.deck = [];
        r.faceUp = null;
        r.hands = [[], [], [], []];
        r.trumpSuit = null;
        r.leaderSeat = 0;
        r.turnSeat = 0;
        clearTurnDeadline(r);

        io.to(r.code).emit("state", publicState(r));
      }

      // se ficou vazio, marca pra auto-fechar (ver interval)
      if (countPlayers(r) === 0) r._emptySince = Date.now();

      cb?.({ ok: true });
    } catch (e) {
      cb?.({ ok: false, err: e.message });
    }
  });

  socket.on("set_ready", ({ code, ready }, cb) => {
    try {
      const r = getRoom(String(code || "").toUpperCase());
      const seat = seatOf(r, socket.id);
      if (seat < 0) return cb?.({ ok: false, err: "Você não está na sala" });

      r.ready[seat] = !!ready;

      const allIn = r.seats.every((s) => s !== null);
      const allReady = r.ready.every(Boolean);

      if (r.phase === "lobby" && allIn && allReady) {
        startGame(r);
        r.chat.push({ name: "Sistema", msg: "🎴 Partida iniciada!", ts: Date.now() });
      }

      cb?.({ ok: true });
      io.to(r.code).emit("state", publicState(r));
      if (r.phase === "playing") sendHands(r);
    } catch (e) {
      cb?.({ ok: false, err: e.message });
    }
  });

  socket.on("play_card", ({ code, cardId }, cb) => {
    try {
      const r = getRoom(String(code || "").toUpperCase());
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

        const wonCards = r.trick.map((t) => t.card);

        const pts = scoreTrick(wonCards, false);
        r.teamScore[teamOfSeat(winner)] += pts;

        r.trick = [];

        // ✅ COMPRA AUTOMÁTICA DO MONTE
        dealAfterTrick(r, winner);

        // fim de partida:
        // - alguém fez 61+
        // - ou acabou o monte + carta virada e as mãos ficaram vazias
        if (r.teamScore[0] >= 61 || r.teamScore[1] >= 61) {
          r.phase = "ended";
          clearTurnDeadline(r);
        } else if (deckCount(r) === 0 && allHandsEmpty(r)) {
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
      const r = getRoom(String(code || "").toUpperCase());
      const seat = seatOf(r, socket.id);
      if (seat < 0) return cb?.({ ok: false, err: "Fora da sala" });

      const m = String(msg || "").slice(0, 140);
      if (!m.trim()) return cb?.({ ok: false, err: "Mensagem vazia" });

      r.chat.push({ name: r.names[seat], msg: m, ts: Date.now() });
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

        // volta pro lobby se alguém sai
        r.phase = "lobby";
        r.trick = [];
        r.teamScore = [0, 0];
        r.tricksPlayed = 0;
        r.deck = [];
        r.faceUp = null;
        r.hands = [[], [], [], []];
        r.trumpSuit = null;
        r.leaderSeat = 0;
        r.turnSeat = 0;
        clearTurnDeadline(r);

        io.to(r.code).emit("state", publicState(r));

        if (countPlayers(r) === 0) r._emptySince = Date.now();
      }
    }
  });
});

/** ---------- loop: auto-jogada + auto-fechar sala vazia ---------- */
setInterval(() => {
  const now = Date.now();

  for (const r of rooms.values()) {
    // auto-fechar sala vazia após 60s
    if (countPlayers(r) === 0) {
      if (!r._emptySince) r._emptySince = now;
      if (now - r._emptySince > 60_000) {
        cleanupRoomIfEmpty(r);
      }
      continue;
    } else {
      r._emptySince = null;
    }

    // auto-play se tempo expirar
    if (r.phase !== "playing") continue;
    if (!r.turnDeadline) continue;
    if (now < r.turnDeadline) continue;
    if (r._autoplaying) continue;

    const seat = r.turnSeat;
    const sid = r.seats[seat];
    if (!sid) {
      r.phase = "lobby";
      clearTurnDeadline(r);
      io.to(r.code).emit("state", publicState(r));
      continue;
    }

    r._autoplaying = true;
    try {
      const card = autoPlayLowest(r, seat);
      if (!card) {
        setTurnDeadline(r);
        continue;
      }

      const i = r.hands[seat].findIndex((c) => c.id === card.id);
      if (i >= 0) r.hands[seat].splice(i, 1);

      r.trick.push({ seat, card });
      r.turnSeat = nextSeat(r.turnSeat);

      r.chat.push({
        name: "Sistema",
        msg: `⏱️ Tempo esgotado: Seat ${seat + 1} jogou ${card.v}${card.s}`,
        ts: Date.now(),
      });

      if (r.trick.length === 4) {
        const winner = trickWinner(r.trick, r.trumpSuit);
        r.leaderSeat = winner;
        r.turnSeat = winner;

        r.tricksPlayed += 1;

        const wonCards = r.trick.map((t) => t.card);
        const pts = scoreTrick(wonCards, false);
        r.teamScore[teamOfSeat(winner)] += pts;

        r.trick = [];

        // ✅ compra automática
        dealAfterTrick(r, winner);

        if (r.teamScore[0] >= 61 || r.teamScore[1] >= 61) {
          r.phase = "ended";
          clearTurnDeadline(r);
        } else if (deckCount(r) === 0 && allHandsEmpty(r)) {
          r.phase = "ended";
          clearTurnDeadline(r);
        } else {
          setTurnDeadline(r);
        }
      } else {
        setTurnDeadline(r);
      }

      io.to(r.code).emit("state", publicState(r));
      sendHands(r);
    } finally {
      r._autoplaying = false;
    }
  }
}, 500);

function autoPlayLowest(r, seat) {
  const hand = r.hands[seat];
  if (!hand || hand.length === 0) return null;
  let best = hand[0];
  for (const c of hand.slice(1)) {
    if (strengthRank(c, r.trumpSuit) < strengthRank(best, r.trumpSuit)) best = c;
  }
  return best;
}

app.get("/", (_, res) => res.send("Serra server ok"));
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => console.log(`Server on :${PORT}`));
