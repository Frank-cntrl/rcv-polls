const { Server } = require("socket.io");

let io;

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
const corsOptions =
  process.env.NODE_ENV === "production"
    ? {
        origin: FRONTEND_URL,
        credentials: true,
      }
    : {
        cors: "*",
      };

const initSocketServer = (server) => {
  try {
    io = new Server(server, corsOptions);

    io.on("connection", (socket) => {
      console.log(`🔗 User ${socket.id} connected to sockets`);

      // Join a poll room to receive updates
      socket.on("join-poll", (shareId) => {
        socket.join(`poll-${shareId}`);
        console.log(`User ${socket.id} joined poll ${shareId}`);
      });

      // Leave a poll room
      socket.on("leave-poll", (shareId) => {
        socket.leave(`poll-${shareId}`);
        console.log(`User ${socket.id} left poll ${shareId}`);
      });

      socket.on("disconnect", () => {
        console.log(`🔗 User ${socket.id} disconnected from sockets`);
      });
    });
  } catch (error) {
    console.error("❌ Error initializing socket server:");
    console.error(error);
  }
};

// Function to emit poll updates
const emitPollUpdate = (shareId, event, data) => {
  if (io) {
    io.to(`poll-${shareId}`).emit(event, data);
  }
};

// Function to emit new vote
const emitNewVote = (shareId, voteCount) => {
  if (io) {
    io.to(`poll-${shareId}`).emit("new-vote", { voteCount });
  }
};

// Function to emit poll closed
const emitPollClosed = (shareId) => {
  if (io) {
    io.to(`poll-${shareId}`).emit("poll-closed");
  }
};

module.exports = initSocketServer;
module.exports.emitPollUpdate = emitPollUpdate;
module.exports.emitNewVote = emitNewVote;
module.exports.emitPollClosed = emitPollClosed;