const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

const MAP_WIDTH = 20;
const MAP_HEIGHT = 15;
const MAX_PLAYERS_PER_LOBBY = 25;

// Prosta mapa (ta sama dla wszystkich lobby)
const map = [];
for(let y=0; y<MAP_HEIGHT; y++){
  map[y] = [];
  for(let x=0; x<MAP_WIDTH; x++){
    map[y][x] = (x === 0 || y === 0 || x === MAP_WIDTH-1 || y === MAP_HEIGHT-1) ? 0 : 1;
  }
}

let lobbies = []; // Tablica lobby (każde ma players i io namespace)

function createLobby(index){
  const nsp = io.of('/lobby'+index);
  const players = {};

  nsp.on('connection', socket => {
    console.log(`Lobby ${index}: nowy gracz`, socket.id);

    // Dodaj gracza z randomową pozycją i nickiem
    players[socket.id] = {
      id: socket.id,
      nick: 'Gracz'+Math.floor(Math.random()*1000),
      x: 1 + Math.floor(Math.random()*(MAP_WIDTH-2)),
      y: 1 + Math.floor(Math.random()*(MAP_HEIGHT-2))
    };

    // Wyślij mapę i stan lobby nowemu graczowi
    socket.emit('init', {map, players});

    // Wyślij stan graczy do całego lobby
    nsp.emit('players', players);

    socket.on('move', dir => {
      const p = players[socket.id];
      if(!p) return;

      let nx = p.x;
      let ny = p.y;
      if(dir === 'up') ny--;
      else if(dir === 'down') ny++;
      else if(dir === 'left') nx--;
      else if(dir === 'right') nx++;

      if(nx >= 0 && ny >= 0 && nx < MAP_WIDTH && ny < MAP_HEIGHT && map[ny][nx] === 1){
        p.x = nx;
        p.y = ny;
        nsp.emit('players', players);
      }
    });

    socket.on('chat', msg => {
      if(players[socket.id]){
        nsp.emit('chat', {nick: players[socket.id].nick, msg});
      }
    });

    socket.on('disconnect', () => {
      console.log(`Lobby ${index}: gracz odłączony`, socket.id);
      delete players[socket.id];
      nsp.emit('players', players);
    });
  });

  return {nsp, players};
}

// Utwórz pierwsze lobby przy starcie serwera
lobbies.push(createLobby(0));

// Middleware do wyboru lobby na podstawie liczby graczy
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

const PORT = 3001;
http.listen(PORT, () => console.log(`Serwer działa na porcie http://localhost:${PORT}`));

// Funkcja do znalezienia lobby z miejscem lub utworzenia nowego
function getLobbyForNewPlayer(){
  for(let i=0; i<lobbies.length; i++){
    if(Object.keys(lobbies[i].players).length < MAX_PLAYERS_PER_LOBBY){
      return i; // indeks lobby
    }
  }
  // jeśli wszystkie pełne, utwórz nowe
  const newIndex = lobbies.length;
  lobbies.push(createLobby(newIndex));
  return newIndex;
}

// Potrzebujemy endpoint, który da klientowi info, do którego lobby się podłączyć
app.get('/join', (req,res) => {
  const lobbyIndex = getLobbyForNewPlayer();
  res.json({lobby: lobbyIndex});
});
