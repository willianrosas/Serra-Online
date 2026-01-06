import { io } from "socket.io-client";

const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  throw new Error("VITE_API_URL não definido. Configure na Vercel.");
}

export const socket = io(API_URL, {
  autoConnect: true,
  transports: ["websocket", "polling"],
});
