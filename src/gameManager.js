const { Chess } = require('chess.js');

let waitingPlayer = null; // only one player waits
const games = {}; // store active games

const handleJoin = (socket, io) => {
  // If no one is waiting → put this player in waiting state
  if (!waitingPlayer) {
    waitingPlayer = socket;

    socket.emit('waiting');
    console.log('Player waiting:', socket.id);
    return;
  }

  // If someone already waiting → create a game
  const roomId = `room_${waitingPlayer.id}_${socket.id}`;

  const game = new Chess();

  games[roomId] = {
    players: [waitingPlayer.id, socket.id],
    game,
  };

  // join both sockets to same room
  waitingPlayer.join(roomId);
  socket.join(roomId);

  // notify both players
  io.to(roomId).emit('gameStart', {
    roomId,
    fen: game.fen(),
    turn: game.turn(),
  });

  console.log('Game started in room:', roomId);

  // clear waiting player
  waitingPlayer = null;
};

module.exports = { handleJoin };
