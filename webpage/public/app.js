document.addEventListener("DOMContentLoaded", () => {
  // --- STAN APLIKACJI ---
  let pendingRegistration = null;
  let pendingCode = null;

  let currentUser = loadCurrentUser(); // Załaduj zalogowanego użytkownika, jeśli jest
  let groups = getGroups() || [];
  let currentGroup = null;
  let currentChannel = null;

  // --- ELEMENTY DOM ---
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  const codeSection = document.getElementById("codeSection");

  const loginNick = document.getElementById("loginNick");
  const loginPassword = document.getElementById("loginPassword");
  const loginPhone = document.getElementById("loginPhone");
  const btnSendCode = document.getElementById("btnSendCode");
  const verifyCodeInput = document.getElementById("verifyCodeInput");
  const btnVerifyCode = document.getElementById("btnVerifyCode");
  const showRegister = document.getElementById("showRegister");
  const showLogin = document.getElementById("showLogin");

  const regNick = document.getElementById("regNick");
  const regPassword = document.getElementById("regPassword");
  const regPhone = document.getElementById("regPhone");
  const btnRegister = document.getElementById("btnRegister");

  const currentUserSpan = document.getElementById("currentUser");
  const logoutBtn = document.getElementById("logoutBtn");

  const groupsList = document.getElementById("groupsList");
  const newGroupName = document.getElementById("newGroupName");
  const btnCreateGroup = document.getElementById("btnCreateGroup");
  const joinGroupCode = document.getElementById("joinGroupCode");
  const btnJoinGroup = document.getElementById("btnJoinGroup");

  const groupDetails = document.getElementById("groupDetails");
  const groupNameDisplay = document.getElementById("groupNameDisplay");
  const btnLeaveGroup = document.getElementById("btnLeaveGroup");
  const btnDeleteGroup = document.getElementById("btnDeleteGroup");

  const groupUsersList = document.getElementById("groupUsersList");

  const channelsList = document.getElementById("channelsList");
  const newChannelName = document.getElementById("newChannelName");
  const newChannelType = document.getElementById("newChannelType");
  const newChannelRoles = document.getElementById("newChannelRoles");
  const btnCreateChannel = document.getElementById("btnCreateChannel");

  const channelSection = document.getElementById("channelSection");
  const channelNameDisplay = document.getElementById("channelNameDisplay");
  const btnDeleteChannel = document.getElementById("btnDeleteChannel");

  const chatSection = document.getElementById("chatSection");
  const chatMessages = document.getElementById("chatMessages");
  const chatInput = document.getElementById("chatInput");
  const btnSendMsg = document.getElementById("btnSendMsg");

  const voiceVideoSection = document.getElementById("voiceVideoSection");
  const btnStartCall = document.getElementById("btnStartCall");
  const btnEndCall = document.getElementById("btnEndCall");
  const localVideo = document.getElementById("localVideo");
  const remoteVideo = document.getElementById("remoteVideo");

  // --- POMOCNICZE FUNKCJE ---
  function showElement(elem) { elem.classList.remove("hidden"); }
  function hideElement(elemOrId) {
    let element;
    if (typeof elemOrId === 'string') {
      element = document.getElementById(elemOrId);
      if (!element) {
        console.warn(`Element o id "${elemOrId}" nie istnieje!`);
        return;
      }
    } else {
      element = elemOrId;
    }
    element.classList.add("hidden");
  }

  function clearChildren(elem) { while (elem.firstChild) elem.removeChild(elem.firstChild); }

  // --- LOCAL STORAGE ---
  function getUsers() {
    const u = localStorage.getItem("users");
    return u ? JSON.parse(u) : {};
  }
  function saveUsers(users) {
    localStorage.setItem("users", JSON.stringify(users));
  }
  function getGroups() {
    const g = localStorage.getItem("groups");
    return g ? JSON.parse(g) : [];
  }
  function saveGroups(grps) {
    localStorage.setItem("groups", JSON.stringify(grps));
  }
  function setCurrentUser(user) {
    localStorage.setItem("currentUser", JSON.stringify(user));
  }
  function clearCurrentUser() {
    localStorage.removeItem("currentUser");
  }
  function loadCurrentUser() {
    const u = localStorage.getItem("currentUser");
    return u ? JSON.parse(u) : null;
  }

  // --- PROSTA FUNKCJA GENERUJĄCA KOD SMS ---
  function generateSmsCode() {
    return Math.floor(100000 + Math.random() * 900000).toString(); // 6-cyfrowy kod
  }

  // --- REJESTRACJA (WYSYŁANIE KODU) ---
  btnRegister.addEventListener('click', async (e) => {
    e.preventDefault();
    const nick = regNick.value.trim();
    const pass = regPassword.value;
    const phone = regPhone.value.trim();

    if (!nick || !pass || !phone) {
      alert('Wypełnij wszystkie pola!');
      return;
    }

    const users = getUsers();

    if (users[nick]) {
      alert('Nick już istnieje! Wybierz inny.');
      return;
    }

    // Generuj kod weryfikacyjny i zapisz dane tymczasowo
    pendingCode = generateSmsCode();
    pendingRegistration = { nick, pass, phone };

    alert(`Kod weryfikacyjny SMS wysłany na numer ${phone}.\n(Prawdziwa wysyłka SMS wymaga backendu)\nKod to: ${pendingCode}`);

    // Pokaż weryfikację kodu i ukryj formularz rejestracji
    hideElement(registerForm);
    showElement(codeSection);
  });

  // --- WERYFIKACJA KODU SMS ---
  btnVerifyCode.addEventListener('click', () => {
    const codeInput = verifyCodeInput.value.trim();
    if (codeInput === pendingCode) {
      // Dodaj użytkownika do localStorage
      const users = getUsers();
      users[pendingRegistration.nick] = {
        password: pendingRegistration.pass,
        phone: pendingRegistration.phone,
        createdAt: new Date().toISOString(),
        lastLogin: null,
        ipConfirmed: false
      };
      saveUsers(users);

      alert('Rejestracja zakończona sukcesem! Możesz się teraz zalogować.');

      // Reset
      pendingRegistration = null;
      pendingCode = null;
      verifyCodeInput.value = '';

      // Przełącz widoki
      hideElement(codeSection);
      showElement(loginForm);
      regNick.value = regPassword.value = regPhone.value = '';
    } else {
      alert('Niepoprawny kod weryfikacyjny!');
    }
  });

  // --- LOGOWANIE ---
  loginForm.addEventListener('submit', e => e.preventDefault());

  loginForm.querySelector('button').addEventListener('click', () => {
    const nick = loginNick.value.trim();
    const pass = loginPassword.value;
    const phone = loginPhone.value.trim();

    if (!nick || !pass || !phone) {
      alert('Wypełnij wszystkie pola!');
      return;
    }

    const users = getUsers();
    if (!users[nick]) {
      alert('Nie ma takiego użytkownika!');
      return;
    }
    if (users[nick].password !== pass) {
      alert('Niepoprawne hasło!');
      return;
    }
    if (users[nick].phone !== phone) {
      alert('Podany numer telefonu nie pasuje do konta!');
      return;
    }

    currentUser = { nick, phone };
    setCurrentUser(currentUser);

    alert(`Zalogowano jako ${nick}`);

    // Pokaz aplikację i ukryj logowanie/rejestrację
    hideElement(loginForm);
    hideElement(registerForm);
    hideElement(codeSection);

    showElement(document.getElementById('appSection'));
    currentUserSpan.textContent = nick;
    showElement(currentUserSpan);
    showElement(logoutBtn);

    renderGroups();
  });

  // --- WYLOGOWANIE ---
  logoutBtn.addEventListener('click', () => {
    clearCurrentUser();
    currentUser = null;
    alert('Wylogowano.');

    // Ukryj aplikację, pokaż logowanie
    hideElement(document.getElementById('appSection'));
    hideElement(currentUserSpan);
    hideElement(logoutBtn);
    showElement(loginForm);
    showElement(showRegister);
    hideElement(registerForm);
    hideElement(codeSection);

    loginNick.value = loginPassword.value = loginPhone.value = '';
  });

  // --- PRZEŁĄCZANIE POMIĘDZY LOGOWANIEM I REJESTRACJĄ ---
  showRegister.addEventListener('click', () => {
    hideElement(loginForm);
    showElement(registerForm);
    hideElement(codeSection);
  });
  showLogin.addEventListener('click', () => {
    showElement(loginForm);
    hideElement(registerForm);
    hideElement(codeSection);
  });

  // --- RENDEROWANIE LISTY GRUP ---
  function renderGroups() {
    clearChildren(groupsList);
    groups.forEach(group => {
      const li = document.createElement("li");
      li.textContent = `${group.name} [${group.code}] (${group.users.length} userów)`;
      li.style.cursor = 'pointer';
      li.addEventListener('click', () => {
        currentGroup = group;
        currentChannel = null;
        renderGroupDetails();
        renderChannels();
        showElement(groupDetails);
      });
      groupsList.appendChild(li);
    });
  }

  // --- GENEROWANIE KODU GRUPY ---
  function generateGroupCode() {
    return Math.random().toString(36).slice(2, 8).toUpperCase();
  }

  // --- TWORZENIE GRUPY ---
  btnCreateGroup.addEventListener('click', () => {
    if (!currentUser) {
      alert('Musisz się zalogować, by tworzyć grupy.');
      return;
    }
    const name = newGroupName.value.trim();
    if (!name) {
      alert('Podaj nazwę grupy.');
      return;
    }

    // Sprawdź czy nazwa już istnieje
    if (groups.find(g => g.name.toLowerCase() === name.toLowerCase())) {
      alert('Grupa o takiej nazwie już istnieje.');
      return;
    }

    const newGroup = {
      name,
      code: generateGroupCode(),
      users: [currentUser.nick],
      channels: [],
      owner: currentUser.nick
    };
    groups.push(newGroup);
    saveGroups(groups);
    newGroupName.value = '';

    renderGroups();

    alert(`Grupa "${name}" została utworzona. Kod grupy: ${newGroup.code}`);
  });

  // --- DOŁĄCZANIE DO GRUPY ---
  btnJoinGroup.addEventListener('click', () => {
    if (!currentUser) {
      alert('Musisz się zalogować, by dołączać do grup.');
      return;
    }
    const code = joinGroupCode.value.trim().toUpperCase();
    if (!code) {
      alert('Podaj kod grupy.');
      return;
    }

    const group = groups.find(g => g.code === code);
    if (!group) {
      alert('Nie ma grupy o podanym kodzie.');
      return;
    }

    if (group.users.includes(currentUser.nick)) {
      alert('Już jesteś w tej grupie.');
      return;
    }

    group.users.push(currentUser.nick);
    saveGroups(groups);
    joinGroupCode.value = '';

    renderGroups();

    alert(`Dołączyłeś do grupy "${group.name}".`);
  });

  // --- RENDEROWANIE SZCZEGÓŁÓW GRUPY ---
  function renderGroupDetails() {
    if (!currentGroup) {
      groupNameDisplay.textContent = "";
      clearChildren(groupUsersList);
      hideElement(groupDetails);
      return;
    }
    groupNameDisplay.textContent = `${currentGroup.name} [${currentGroup.code}]`;

    clearChildren(groupUsersList);
    currentGroup.users.forEach(userNick => {
      const li = document.createElement('li');
      li.textContent = userNick;
      groupUsersList.appendChild(li);
    });

    showElement(groupDetails);
  }

  // --- OPUSZCZANIE GRUPY ---
  btnLeaveGroup.addEventListener('click', () => {
    if (!currentGroup || !currentUser) return;
    if (!confirm(`Czy na pewno chcesz opuścić grupę "${currentGroup.name}"?`)) return;

    currentGroup.users = currentGroup.users.filter(u => u !== currentUser.nick);

    // Jeśli użytkownik był właścicielem i nie ma już użytkowników, usuń grupę
    if (currentGroup.owner === currentUser.nick && currentGroup.users.length === 0) {
      groups = groups.filter(g => g.code !== currentGroup.code);
    } else {
      // Jeśli właściciel opuścił grupę, przekaż właścicielstwo pierwszemu użytkownikowi (jeśli jest)
      if (currentGroup.owner === currentUser.nick && currentGroup.users.length > 0) {
        currentGroup.owner = currentGroup.users[0];
      }
    }

    saveGroups(groups);
    currentGroup = null;
    currentChannel = null;

    renderGroups();
    renderGroupDetails();

    hideElement(channelSection);
    hideElement(chatSection);
    hideElement(voiceVideoSection);

    alert('Opuszczono grupę.');
  });

  // --- USUWANIE GRUPY ---
  btnDeleteGroup.addEventListener('click', () => {
    if (!currentGroup || !currentUser) return;
    if (currentGroup.owner !== currentUser.nick) {
      alert('Tylko właściciel grupy może ją usunąć.');
      return;
    }
    if (!confirm(`Czy na pewno chcesz usunąć grupę "${currentGroup.name}"?`)) return;

    groups = groups.filter(g => g.code !== currentGroup.code);
    saveGroups(groups);
    currentGroup = null;
    currentChannel = null;

    renderGroups();
    renderGroupDetails();

    hideElement(channelSection);
    hideElement(chatSection);
    hideElement(voiceVideoSection);

    alert('Grupa została usunięta.');
  });

  // --- RENDEROWANIE KANAŁÓW ---
  function renderChannels() {
    clearChildren(channelsList);
    if (!currentGroup) {
      hideElement(channelSection);
      return;
    }
    currentGroup.channels.forEach(channel => {
      const li = document.createElement('li');
      li.textContent = `${channel.name} (${channel.type})`;
      li.style.cursor = 'pointer';
      li.addEventListener('click', () => {
        currentChannel = channel;
        renderChannelDetails();
        showElement(channelSection);
      });
      channelsList.appendChild(li);
    });
    showElement(channelSection);
  }

  // --- TWORZENIE KANAŁU ---
  btnCreateChannel.addEventListener('click', () => {
    if (!currentGroup || !currentUser) {
      alert('Musisz być w grupie i zalogowany.');
      return;
    }
    if (currentGroup.owner !== currentUser.nick) {
      alert('Tylko właściciel grupy może tworzyć kanały.');
      return;
    }
    const name = newChannelName.value.trim();
    const type = newChannelType.value;
    const rolesRaw = newChannelRoles.value.trim();

    if (!name) {
      alert('Podaj nazwę kanału.');
      return;
    }

    if (currentGroup.channels.find(c => c.name.toLowerCase() === name.toLowerCase())) {
      alert('Kanał o takiej nazwie już istnieje.');
      return;
    }

    // Role (np. "admin, moderator") jako tablica
    const roles = rolesRaw ? rolesRaw.split(',').map(r => r.trim()).filter(r => r.length > 0) : [];

    const newChannel = {
      name,
      type,
      roles,
      messages: []
    };

    currentGroup.channels.push(newChannel);
    saveGroups(groups);

    newChannelName.value = '';
    newChannelRoles.value = '';
    renderChannels();
  });

  // --- RENDEROWANIE SZCZEGÓŁÓW KANAŁU ---
  function renderChannelDetails() {
    if (!currentChannel) {
      channelNameDisplay.textContent = "";
      clearChildren(chatMessages);
      hideElement(chatSection);
      return;
    }
    channelNameDisplay.textContent = `${currentChannel.name} (${currentChannel.type})`;
    renderChatMessages();
    showElement(chatSection);
  }

  // --- USUWANIE KANAŁU ---
  btnDeleteChannel.addEventListener('click', () => {
    if (!currentChannel || !currentGroup || !currentUser) return;
    if (currentGroup.owner !== currentUser.nick) {
      alert('Tylko właściciel grupy może usuwać kanały.');
      return;
    }
    if (!confirm(`Czy na pewno chcesz usunąć kanał "${currentChannel.name}"?`)) return;

    currentGroup.channels = currentGroup.channels.filter(c => c.name !== currentChannel.name);
    saveGroups(groups);

    currentChannel = null;
    renderChannels();
    renderChannelDetails();

    alert('Kanał został usunięty.');
  });

  // --- OBSŁUGA CZATU ---
  function renderChatMessages() {
    clearChildren(chatMessages);
    if (!currentChannel || !currentChannel.messages) return;

    currentChannel.messages.forEach(msg => {
      const div = document.createElement('div');
      div.textContent = `[${new Date(msg.time).toLocaleTimeString()}] ${msg.user}: ${msg.text}`;
      chatMessages.appendChild(div);
    });
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  btnSendMsg.addEventListener('click', () => {
    if (!currentChannel || !currentUser) {
      alert('Musisz wybrać kanał i być zalogowanym.');
      return;
    }
    const text = chatInput.value.trim();
    if (!text) return;

    // Dodaj wiadomość do kanału
    currentChannel.messages.push({
      user: currentUser.nick,
      text,
      time: new Date().toISOString()
    });
    saveGroups(groups);

    renderChatMessages();
    chatInput.value = '';
  });

  // --- INICJALIZACJA ---
  function init() {
    if (currentUser) {
      showElement(document.getElementById('appSection'));
      hideElement(loginForm);
      hideElement(registerForm);
      hideElement(codeSection);
      currentUserSpan.textContent = currentUser.nick;
      showElement(currentUserSpan);
      showElement(logoutBtn);
      renderGroups();
    } else {
      hideElement(document.getElementById('appSection'));
      showElement(loginForm);
      hideElement(registerForm);
      hideElement(codeSection);
      hideElement(currentUserSpan);
      hideElement(logoutBtn);
    }
  }
document.getElementById('btnRegister').addEventListener('click', async () => {
  const nick = document.getElementById('regNick').value.trim();
  const password = document.getElementById('regPassword').value.trim();
  const phone = document.getElementById('regPhone').value.trim();

  if (!nick || !password || !phone) {
    alert('Wypełnij wszystkie pola.');
    return;
  }

  try {
    const res = await fetch('/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nick, password, phone }),
    });

    const data = await res.json();

    if (res.ok) {
      alert('Rejestracja udana! Zalogowano jako: ' + nick);
      document.getElementById('currentUserSpan').textContent = nick;
      document.getElementById('currentUserSpan').classList.remove('hidden');
      document.getElementById('logoutBtn').classList.remove('hidden');
      document.getElementById('registerForm').classList.add('hidden');
      document.getElementById('appSection').classList.remove('hidden');
    } else {
      alert(data.message || 'Błąd rejestracji.');
    }
  } catch (err) {
    alert('Błąd połączenia z serwerem.');
  }
});

  init();

});
