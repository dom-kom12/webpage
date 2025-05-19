// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));  // <--- to jest kluczowe!

// ... reszta kodu ...

const MAP_SIZE = 800;

let players = {};

io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);
  
  // Nowy gracz spawnuje się losowo na mapie
  players[socket.id] = {
    x: Math.floor(Math.random() * MAP_SIZE),
    y: Math.floor(Math.random() * MAP_SIZE),
    id: socket.id,
  };

  // Informujemy gracza o obecnych graczach
  socket.emit('currentPlayers', players);

  // Informujemy innych o nowym graczu
  socket.broadcast.emit('newPlayer', players[socket.id]);

  // Odbieramy ruch od gracza
  socket.on('playerMovement', (movementData) => {
    const player = players[socket.id];
    if (!player) return;

    // Aktualizujemy pozycję z prostą kolizją mapy
    player.x = Math.max(0, Math.min(MAP_SIZE, movementData.x));
    player.y = Math.max(0, Math.min(MAP_SIZE, movementData.y));

    // Rozsyłamy innym pozycję
    socket.broadcast.emit('playerMoved', player);
  });

  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
    delete players[socket.id];
    io.emit('playerDisconnected', socket.id);
  });
});

const PORT = process.env.PORT || 3002;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
