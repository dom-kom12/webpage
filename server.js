const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = 3000;
app.use(express.static('public'));

// Prosta pamięć na użytkowników i role (w demo)
const users = new Map(); // socketId => { username, role, muted, banned }
const bannedUsers = new Set();

// Funkcje pomocnicze
function isAdmin(socketId) {
  return users.get(socketId)?.role === 'admin';
}
function isMod(socketId) {
  const role = users.get(socketId)?.role;
  return role === 'mod' || role === 'admin';
}

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('login', ({ username, role }) => {
    if (bannedUsers.has(username)) {
      socket.emit('login_error', 'You are banned.');
      socket.disconnect();
      return;
    }
    users.set(socket.id, { username, role: role || 'user', muted: false, banned: false });
    socket.emit('login_success', { username, role: role || 'user' });
    io.emit('user_list', Array.from(users.values()).map(u => ({ username: u.username, role: u.role })));
  });

  socket.on('send_message', ({ message, to }) => {
    const user = users.get(socket.id);
    if (!user || user.muted) return; // muted users cannot send messages
    if (to) {
      // Prywatna wiadomość do innego użytkownika
      const targetSocketId = [...users.entries()].find(([id, u]) => u.username === to)?.[0];
      if (targetSocketId) {
        io.to(targetSocketId).emit('private_message', { from: user.username, message });
        socket.emit('private_message', { from: user.username, to, message }); // też wyświetlamy nadawcy
      } else {
        socket.emit('system_message', `User ${to} not found.`);
      }
    } else {
      // Wiadomość publiczna
      io.emit('public_message', { from: user.username, message });
    }
  });

  // Moderacja: mute, kick, ban, delete message
  socket.on('moderation_action', ({ action, target }) => {
    if (!isMod(socket.id)) {
      socket.emit('system_message', 'No permission');
      return;
    }
    // Znajdź target socket
    const targetEntry = [...users.entries()].find(([id, u]) => u.username === target);
    if (!targetEntry) {
      socket.emit('system_message', 'User not found');
      return;
    }
    const [targetId, targetUser] = targetEntry;

    switch(action) {
      case 'mute':
        targetUser.muted = true;
        io.to(targetId).emit('system_message', 'You have been muted.');
        socket.emit('system_message', `Muted ${target}`);
        break;
      case 'unmute':
        targetUser.muted = false;
        io.to(targetId).emit('system_message', 'You have been unmuted.');
        socket.emit('system_message', `Unmuted ${target}`);
        break;
      case 'kick':
        io.to(targetId).emit('system_message', 'You have been kicked.');
        io.sockets.sockets.get(targetId)?.disconnect();
        socket.emit('system_message', `Kicked ${target}`);
        users.delete(targetId);
        break;
      case 'ban':
        bannedUsers.add(targetUser.username);
        io.to(targetId).emit('system_message', 'You have been banned.');
        io.sockets.sockets.get(targetId)?.disconnect();
        socket.emit('system_message', `Banned ${target}`);
        users.delete(targetId);
        break;
      default:
        socket.emit('system_message', 'Unknown action');
    }
    io.emit('user_list', Array.from(users.values()).map(u => ({ username: u.username, role: u.role })));
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    users.delete(socket.id);
    io.emit('user_list', Array.from(users.values()).map(u => ({ username: u.username, role: u.role })));
  });
});

server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
