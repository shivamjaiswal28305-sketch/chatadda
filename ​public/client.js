document.addEventListener('DOMContentLoaded', () => {
  // Socket.io initialization
  let socket = null;
  let currentToken = localStorage.getItem('chatToken') || null;
  let myUsername = localStorage.getItem('chatUsername') || null;

  // DOM Elements - Auth & Screens
  const joinScreen = document.getElementById('joinScreen');
  const chatScreen = document.getElementById('chatScreen');
  const loginTabBtn = document.getElementById('loginTabBtn');
  const signupTabBtn = document.getElementById('signupTabBtn');
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  const authError = document.getElementById('authError');

  // DOM Elements - Inputs
  const loginPhone = document.getElementById('loginPhone');
  const loginPassword = document.getElementById('loginPassword');
  const signupUsername = document.getElementById('signupUsername');
  const signupPhone = document.getElementById('signupPhone');
  const signupPassword = document.getElementById('signupPassword');

  // DOM Elements - UI & Messaging
  const logoutBtn = document.getElementById('logoutBtn');
  const messagesDiv = document.getElementById('messages');
  const messageForm = document.getElementById('messageForm');
  const messageInput = document.getElementById('messageInput');
  const headerTitle = document.getElementById('headerTitle');
  const publicRoomBtn = document.getElementById('publicRoomBtn');

  // ------- Auth Tab Switching -------
  loginTabBtn.addEventListener('click', () => {
    loginTabBtn.classList.add('active');
    signupTabBtn.classList.remove('active');
    loginForm.classList.remove('hidden');
    signupForm.classList.add('hidden');
    hideError();
  });

  signupTabBtn.addEventListener('click', () => {
    signupTabBtn.classList.add('active');
    loginTabBtn.classList.remove('active');
    signupForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
    hideError();
  });

  function showError(msg) {
    authError.textContent = msg;
    authError.classList.remove('hidden');
  }

  function hideError() {
    authError.textContent = '';
    authError.classList.add('hidden');
  }

  // ------- LOGIN HANDLE -------
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();

    const phone = loginPhone.value.trim();
    const password = loginPassword.value.trim();

    if (!phone || !password) {
      showError('Phone number aur password dono bharein');
      return;
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password })
      });

      const data = await res.json();

      if (!res.ok) {
        showError(data.error || 'Login fail hua. Sahi details daalein.');
        return;
      }

      // Save credentials and connect
      currentToken = data.token;
      myUsername = data.username;
      localStorage.setItem('chatToken', currentToken);
      localStorage.setItem('chatUsername', myUsername);

      initChatSession();
    } catch (err) {
      console.error(err);
      showError('Server connect nahi ho pa raha hai. Dobara try karein.');
    }
  });

  // ------- SIGNUP HANDLE -------
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();

    const username = signupUsername.value.trim();
    const phone = signupPhone.value.trim();
    const password = signupPassword.value.trim();

    if (!username || !phone || !password) {
      showError('Sabhi details bharna zaroori hai');
      return;
    }

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, phone, password })
      });

      const data = await res.json();

      if (!res.ok) {
        showError(data.error || 'Account nahi ban saka.');
        return;
      }

      // Save credentials and connect
      currentToken = data.token;
      myUsername = data.username;
      localStorage.setItem('chatToken', currentToken);
      localStorage.setItem('chatUsername', myUsername);

      initChatSession();
    } catch (err) {
      console.error(err);
      showError('Server connect nahi ho pa raha hai.');
    }
  });

  // ------- START CHAT SESSION & SOCKET -------
  function initChatSession() {
    if (!currentToken) return;

    // Show Chat Screen, Hide Auth Screen
    joinScreen.classList.add('hidden');
    chatScreen.classList.remove('hidden');

    // Connect Socket.io with Auth Token
    socket = io({
      auth: { token: currentToken }
    });

    socket.on('connect', () => {
      console.log('Connected to socket server');
      socket.emit('enterPublicRoom');
      loadRoomHistory('public');
    });

    socket.on('connect_error', (err) => {
      console.error('Socket Auth Error:', err.message);
      handleLogout();
    });

    // Incoming public messages
    socket.on('chatMessage', (msg) => {
      appendMessage(msg);
    });

    // System notifications
    socket.on('system', (sysMsg) => {
      const p = document.createElement('div');
      p.className = 'system-message';
      p.textContent = sysMsg;
      messagesDiv.appendChild(p);
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    });
  }

  // ------- LOAD CHAT HISTORY -------
  async function loadRoomHistory(room) {
    messagesDiv.innerHTML = '';
    headerTitle.textContent = room === 'public' ? 'Adda Room (Public)' : room;

    try {
      const res = await fetch(`/api/messages/${room}`, {
        headers: { 'Authorization': `Bearer ${currentToken}` }
      });
      if (res.ok) {
        const history = await res.json();
        history.forEach(appendMessage);
      }
    } catch (e) {
      console.error('History error:', e);
    }
  }

  // ------- APPEND MESSAGE TO UI -------
  function appendMessage(msg) {
    const msgCard = document.createElement('div');
    const isMe = msg.username === myUsername || msg.from === myUsername;
    msgCard.className = `message-card ${isMe ? 'my-message' : 'other-message'}`;

    const author = document.createElement('strong');
    author.textContent = isMe ? 'Aap' : (msg.username || msg.from);
    
    const textNode = document.createElement('p');
    textNode.textContent = msg.text || '';

    msgCard.appendChild(author);
    msgCard.appendChild(textNode);
    messagesDiv.appendChild(msgCard);

    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }

  // ------- SEND MESSAGE -------
  messageForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = messageInput.value.trim();
    if (!text || !socket) return;

    socket.emit('chatMessage', { type: 'text', text });
    messageInput.value = '';
  });

  // ------- LOGOUT HANDLE -------
  function handleLogout() {
    localStorage.removeItem('chatToken');
    localStorage.removeItem('chatUsername');
    if (socket) socket.disconnect();
    location.reload();
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }

  // Check if session already exists on page refresh
  if (currentToken && myUsername) {
    initChatSession();
  }
});
