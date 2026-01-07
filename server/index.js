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

const io = new Server(httpServer, {
  cors: {
    origin: "*",
  },
});

const rooms = new Map();

/* ----------------- Utils ----------------- */
function mkCode() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let c = "";
  for (let i = 0; i < 5; i++) c += chars[(Math.random() * chars.length) | 0];
  return c;
}

function publicState(r) {
  return {
    code: r.code,
    names: r.names,
    ready: r.ready,
    seats: r.seats.map((s) => (s ? "occupied" : "empty")),
    phase: r.phase,
    trumpSuit: r.trumpSuit,
    faceUp: r.faceUp,
    leaderSeat: r.leaderSeat,
    turnSeat: r.turnSeat,
    trick: r.trick,
    teamScore: r.teamScore,
    tricksPlayed: r.tricksPlayed,
    chat: r.chat.slice(-25),
    deckCount: r.deck.length,
  };
}

function seatOf(r, sid) {
  return r.seats.findIndex((s) => s === sid);
}

/* ----------------- Game ----------------- */
function startGame(r) {
  r.phase = "playing";
  r.deck = shuffle(makeDeck());
  r.faceUp = r.deck[r.deck.length - 1];
  r.trumpSuit = r.faceUp.s;

  r.hands = [[], [], [], []];
  for (let i = 0; i < 4; i++) r.hands[i] = r.deck.splice(0, 3);

  r.trick = [];
  r.tricksPlayed = 0;
  r.teamScore = [0, 0];
  r.leaderSeat = 0;
  r.turnSeat = 0;
}

function canPlay(r, seat, cardId) {
  if (r.phase !== "playing") return false;
  if (r.turnSeat !== seat) return false;
  return r.hands[seat].some((c) => c.id === cardId);
}

/* ----------------- Socket ----------------- */
io.on("connection", (socket) => {
  socket.on("create_room", ({ name }, cb) => {
    const code = mkCode();
    const r = {
      code,
      seats: [socket.id, null, null, null],
      names: [name || "Jogador 1", "", "", ""],
      ready: [false, false, false, false],
      phase: "lobby",
      deck: [],
      hands: [[], [], [], []],
      faceUp: null,
      trumpSuit: null,
      trick: [],
      tricksPlayed: 0,
      teamScore: [0, 0],
      leaderSeat: 0,
      turnSeat: 0,
      chat: [],
    };
    rooms.set(code, r);
    socket.join(code);
    cb?.({ ok: true, seat: 0, state: publicState(r) });
    io.to(code).emit("state", publicState(r));
  });

  socket.on("join_room", ({ code, name }, cb) => {
    const r = rooms.get(code);
    if (!r) return cb?.({ ok: false, err: "Sala não existe" });
    const seat = r.seats.findIndex((s) => s === null);
    if (seat === -1) return cb?.({ ok: false, err: "Sala cheia" });

    r.seats[seat] = socket.id;
    r.names[seat] = name || `Jogador ${seat + 1}`;
    r.ready[seat] = false;
    socket.join(code);

    cb?.({ ok: true, seat, state: publicState(r) });
    io.to(code).emit("state", publicState(r));
  });

  socket.on("set_ready", ({ code, ready }) => {
    const r = rooms.get(code);
    if (!r) return;
    const seat = seatOf(r, socket.id);
    if (seat < 0) return;

    r.ready[seat] = !!ready;

    const allIn = r.seats.every(Boolean);
    const allReady = r.ready.every(Boolean);
    if (r.phase === "lobby" && allIn && allReady) startGame(r);

    io.to(code).emit("state", publicState(r));
    if (r.phase === "playing") {
      r.seats.forEach((sid, i) => {
        if (sid) io.to(sid).emit("hand", r.hands[i]);
      });
    }
  });

  socket.on("play_card", ({ code, cardId }, cb) => {
    const r = rooms.get(code);
    if (!r) return;
    const seat = seatOf(r, socket.id);
    if (!canPlay(r, seat, cardId)) return cb?.({ ok: false });

    const idx = r.hands[seat].findIndex((c) => c.id === cardId);
    const [card] = r.hands[seat].splice(idx, 1);
    r.trick.push({ seat, card });
    r.turnSeat = nextSeat(r.turnSeat);

    if (r.trick.length === 4) {
      const win = trickWinner(r.trick, r.trumpSuit);
      r.leaderSeat = win;
      r.turnSeat = win;
      r.tricksPlayed++;

      const pts = r.trick.reduce((s, t) => s + cardPoints(t.card), 0);
      r.teamScore[teamOfSeat(win)] += pts;
      r.trick = [];

      if (r.tricksPlayed >= 8 || r.teamScore.some((x) => x >= 61)) {
        r.phase = "ended";
      }
    }

    io.to(code).emit("state", publicState(r));
    r.seats.forEach((sid, i) => sid && io.to(sid).emit("hand", r.hands[i]));
    cb?.({ ok: true });
  });

  socket.on("leave_room", ({ code }) => {
    const r = rooms.get(code);
    if (!r) return;
    const seat = seatOf(r, socket.id);
    if (seat >= 0) {
      r.seats[seat] = null;
      r.names[seat] = "";
      r.ready[seat] = false;
    }
    socket.leave(code);

    if (r.seats.every((s) => !s)) rooms.delete(code);
    else io.to(code).emit("state", publicState(r));
  });

  socket.on("disconnect", () => {
    for (const [code, r] of rooms) {
      const seat = seatOf(r, socket.id);
      if (seat >= 0) {
        r.seats[seat] = null;
        r.names[seat] = "";
        r.ready[seat] = false;
        if (r.seats.every((s) => !s)) rooms.delete(code);
        else io.to(code).emit("state", publicState(r));
      }
    }
  });
});

/* ----------------- HTTP ----------------- */
app.get("/", (_, res) => res.send("Serra server ok"));

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
