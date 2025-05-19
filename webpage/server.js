const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;
const USERS_FILE = path.join(__dirname, 'users.json');

app.use(express.static('public'));
app.use(bodyParser.json());

// Wczytaj lub zainicjuj users.json
function readUsers() {
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// Obsługa rejestracji
app.post('/register', (req, res) => {
  const { nick, password, phone } = req.body;
  if (!nick || !password || !phone) {
    return res.status(400).json({ message: 'Wszystkie pola są wymagane.' });
  }

  const users = readUsers();
  if (users.some(u => u.nick === nick)) {
    return res.status(409).json({ message: 'Ten nick już istnieje.' });
  }

  users.push({ nick, password, phone });
  saveUsers(users);
  return res.status(200).json({ message: 'Rejestracja zakończona sukcesem.' });
});

app.listen(PORT, () => {
  console.log(`Serwer działa na http://localhost:${PORT}`);
});
