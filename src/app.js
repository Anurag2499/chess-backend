const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { handleJoin } = require('./gameManager');
const app = express();
const server = http.createServer(app);
app.use(express.json());

app.get('/', (req, res) => {
  res.status(200).send('hello world');
});

const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

let waitingPlayer = null;
const rooms = new Map();

const handleJoinGame = (socket) => {
  if (waitingPlayer) {
    // Create room
    const roomId = `room-${waitingPlayer.id}-${socket.id}`;

    // Join both players
    socket.join(roomId);
    waitingPlayer.join(roomId);

    // Store room info
    rooms.set(roomId, {
      players: [waitingPlayer.id, socket.id],
    });
    console.log('Rooms:', rooms);

    // Notify both players
    io.to(roomId).emit('startGame', {
      roomId,
    });

    // Clear waiting player
    waitingPlayer = null;

    console.log('Room created:', roomId);
  } else {
    waitingPlayer = socket;
    socket.emit('waiting');
    console.log('Waiting for opponent:');
  }
};

const handleDisconnect = (socket) => {
  console.log('User disconnected:', socket.id);

  if (waitingPlayer && waitingPlayer.id === socket.id) {
    waitingPlayer = null;
  }

  // Remove player from rooms
  for (const [roomId, room] of rooms.entries()) {
    if (room.players.includes(socket.id)) {
      socket.to(roomId).emit('opponentLeft');
      rooms.delete(roomId);
      break;
    }
  }
};

io.on('connection', (socket) => {
  socket.on('joinGame', () => {
    console.log('joinGame event received from:', socket.id);
    handleJoinGame(socket);
  });

  socket.on('startChat', ({ roomId }) => {
    io.to(roomId).emit('receiveStartChat');
  });

  socket.on('makeMove', ({ roomId, move }) => {
    console.log('makeMove event received:', { roomId, move });
    socket.to(roomId).emit('opponentMove', { move });
  });

  socket.on('sendMessage', ({ user, text, roomId }) => {
    console.log('send message event triggered', { roomId, text });
    io.to(roomId).emit('receiveMessage', { user, text });
  });

  socket.on('disconnect', () => {
    handleDisconnect(socket);
  });
});

server.listen(5000, () => {
  console.log('Server running on port 5000 and server got started');
});
