const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const { v4: uuidv4 } = require("uuid");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const lobbies = {}; // { lobbyId: { players: [], roles: {}, phase: "waiting" | "night" | "day" } }

app.use(express.static("public")); // zakładamy że frontend masz w folderze public

wss.on("connection", (ws) => {
  ws.id = uuidv4();
  ws.player = { id: ws.id, name: "", role: "", lobby: "" };

  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message);
      handleMessage(ws, data);
    } catch (e) {
      console.log("Invalid message:", message);
    }
  });

  ws.on("close", () => {
    if (ws.player.lobby && lobbies[ws.player.lobby]) {
      const lobby = lobbies[ws.player.lobby];
      lobby.players = lobby.players.filter(p => p.id !== ws.id);
      broadcastLobby(ws.player.lobby);
    }
  });
});

function handleMessage(ws, data) {
  if (data.type === "create_lobby") {
    const id = uuidv4().slice(0, 6);
    lobbies[id] = { players: [], roles: {}, phase: "waiting" };
    ws.send(JSON.stringify({ type: "lobby_created", lobbyId: id }));
  }

  if (data.type === "join_lobby") {
    const { name, lobbyId } = data;
    const lobby = lobbies[lobbyId];
    if (!lobby || lobby.players.length >= 25) return;

    ws.player.name = name;
    ws.player.lobby = lobbyId;
    lobby.players.push({ id: ws.id, name });

    broadcastLobby(lobbyId);

    if (lobby.players.length >= 7) {
      startGame(lobbyId);
    }
  }

  if (data.type === "action") {
    // handle night role actions here (e.g. mafia kill, agent check)
    // save to lobby.actions or similar structure
  }

  if (data.type === "vote") {
    // handle voting here
  }
}

function broadcastLobby(lobbyId) {
  const lobby = lobbies[lobbyId];
  const payload = {
    type: "update_players",
    players: lobby.players.map(p => p.name),
  };

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN && client.player.lobby === lobbyId) {
      client.send(JSON.stringify(payload));
    }
  });
}

function startGame(lobbyId) {
  const lobby = lobbies[lobbyId];
  assignRoles(lobby);
  lobby.phase = "night";
  broadcastPhase(lobbyId);
}

function assignRoles(lobby) {
  const count = lobby.players.length;
  let mafia = 1, agent = 1, doctor = 0, sisters = 0;

  if (count >= 9) { mafia = 2; doctor = 1; }
  if (count >= 13) { mafia = 3; sisters = 2; }

  let roles = [
    ...Array(mafia).fill("mafia"),
    ...Array(agent).fill("agent"),
    ...Array(doctor).fill("doctor"),
    ...Array(sisters).fill("sister"),
  ];

  while (roles.length < count) roles.push("civilian");

  shuffle(roles);
  for (let i = 0; i < lobby.players.length; i++) {
    lobby.players[i].role = roles[i];
  }

  // Send private role info
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN && client.player.lobby === lobbyId) {
      const p = lobby.players.find(p => p.id === client.id);
      if (p) client.send(JSON.stringify({ type: "your_role", role: p.role }));
    }
  }
}

function broadcastPhase(lobbyId) {
  const lobby = lobbies[lobbyId];
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN && client.player.lobby === lobbyId) {
      client.send(JSON.stringify({ type: "phase", phase: lobby.phase }));
    }
  });

  // timeout for next phase
  setTimeout(() => {
    if (lobby.phase === "night") {
      lobby.phase = "day";
    } else {
      lobby.phase = "night";
    }
    broadcastPhase(lobbyId);
  }, 30000); // 30s per phase
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

const PORT = process.env.PORT || 3003;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
