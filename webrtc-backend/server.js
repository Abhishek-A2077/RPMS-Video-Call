const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

const socketRoomMap = {};

io.on("connection", (socket) => {
  socket.on("join-room", (roomId) => {
    socket.join(roomId);
    socketRoomMap[socket.id] = roomId;
    socket.to(roomId).emit("user-joined", socket.id);
  });

  socket.on("offer", (data) => {
    socket.to(data.roomId).emit("offer", data.offer);
  });

  socket.on("answer", (data) => {
    socket.to(data.roomId).emit("answer", data.answer);
  });

  socket.on("ice-candidate", (data) => {
    socket.to(data.roomId).emit("ice-candidate", data.candidate);
  });

  socket.on("chat-message", (data) => {
    socket.to(data.roomId).emit("chat-message", data.message);
  });

  socket.on("mute-status", (data) => {
    socket.to(data.roomId).emit("mute-status", data.isMuted);
  });

  socket.on("leave-room", (roomId) => {
    socket.leave(roomId);
    if (socketRoomMap[socket.id] === roomId) {
      delete socketRoomMap[socket.id];
    }
    socket.to(roomId).emit("user-left", socket.id);
  });

  socket.on("disconnect", () => {
    const roomId = socketRoomMap[socket.id];
    if (roomId) {
      socket.to(roomId).emit("user-left", socket.id);
      delete socketRoomMap[socket.id];
    }
  });
});

server.listen(3000, () => {});
