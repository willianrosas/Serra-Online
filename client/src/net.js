import { io } from "socket.io-client";

// Prioridade:
// 1) VITE_API_URL (produção)  ex: https://serra-online.onrender.com
// 2) localhost (dev)
const URL = (import.meta.env.VITE_API_URL || "http://localhost:3001").trim();

// Socket.IO v4
export const socket = io(URL, {
  transports: ["websocket", "polling"],
  autoConnect: true,
});
