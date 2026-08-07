document.addEventListener('DOMContentLoaded', () => {
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

  // Inputs
  const loginPhone = document.getElementById('loginPhone');
  const loginPassword = document.getElementById('loginPassword');
  const signupUsername = document.getElementById('signupUsername');
  const signupPhone = document.getElementById('signupPhone');
  const signupPassword = document.getElementById('signupPassword');

  // Chat UI Elements
  const logoutBtn = document.getElementById('logoutBtn');
  const messagesDiv = document.getElementById('messages');
  const messageForm = document.getElementById('messageForm');
  const messageInput = document.getElementById('messageInput');
  const headerTitle = document.getElementById('headerTitle');
  const publicRoomBtn = document.getElementById('publicRoomBtn');
  const plusBtn = document.getElementById('plusBtn');
  const attachMenu = document.getElementById('attachMenu');
  const attachBtn = document.getElementById('attachBtn');
  const fileInput = document.getElementById('fileInput');
  const sendBtn = document.getElementById('sendBtn');
  const micBtn = document.getElementById('micBtn');

  // Auth Tab Toggle
  if (loginTabBtn && signupTabBtn) {
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
  }

  function showError(msg) {
    if (!authError) return;
    authError.textContent = msg;
    authError.classList.remove('hidden');
  }

  function hideError() {
    if (!authError) return;
    authError.textContent = '';
    authError.classList.add('hidden');
  }

  // Handle Login
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideError();

      const phone = loginPhone.value.trim();
      const password = loginPassword.value.trim();

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, password })
        });
        const data = await res.json();

        if (!res.ok) return showError(data.error || 'Login fail hua');

        currentToken = data.token;
        myUsername = data.username;
        localStorage.setItem('chatToken', currentToken);
        localStorage.setItem('chatUsername', myUsername);

        initChatSession();
      } catch (err) {
        showError('Server error, please try again');
      }
    });
  }

  // Handle Signup
  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideError();

      const username = signupUsername.value.trim();
      const phone = signupPhone.value.trim();
      const password = signupPassword.value.trim();

      try {
        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, phone, password })
        });
        const data = await res.json();

        if (!res.ok) return showError(data.error || 'Signup fail hua');

        currentToken = data.token;
        myUsername = data.username;
        localStorage.setItem('chatToken', currentToken);
        localStorage.setItem('chatUsername', myUsername);

        initChatSession();
      } catch (err) {
        showError('Server error, please try again');
      }
    });
  }

  // Init Socket Chat
  function initChatSession() {
    if (!currentToken) return;

    if (joinScreen) joinScreen.classList.add('hidden');
    if (chatScreen) chatScreen.classList.remove('hidden');
    if (messageForm) messageForm.classList.remove('hidden');

    socket = io({
      auth: { token: currentToken }
    });

    socket.on('connect', () => {
      socket.emit('enterPublicRoom');
      loadRoomHistory('public');
    });

    socket.on('chatMessage', appendMessage);
    socket.on('privateMessage', appendMessage);

    socket.on('system', (sysMsg) => {
      const div = document.createElement('div');
      div.className = 'system-message';
      div.style.textAlign = 'center';
      div.style.margin = '8px 0';
      div.style.fontSize = '12px';
      div.style.color = '#666';
      div.textContent = sysMsg;
      messagesDiv.appendChild(div);
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    });
  }

  // Toggle Attachment Menu
  if (plusBtn && attachMenu) {
    plusBtn.addEventListener('click', () => {
      attachMenu.classList.toggle('hidden');
    });
  }

  if (attachBtn && fileInput) {
    attachBtn.addEventListener('click', () => {
      fileInput.click();
      attachMenu.classList.add('hidden');
    });
  }

  // Handle File Upload
  if (fileInput) {
    fileInput.addEventListener('change', async () => {
      const file = fileInput.files[0];
      if (!file) return;

      const formData = new FormData();
      formData.append('file', file);

      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${currentToken}` },
          body: formData
        });
        const data = await res.json();

        if (res.ok && socket) {
          socket.emit('chatMessage', {
            type: data.type,
            mediaUrl: data.url,
            mediaName: data.name
          });
        }
      } catch (e) {
        alert('File upload fail ho gaya');
      }
      fileInput.value = '';
    });
  }

  // Toggle Send/Mic Button
  if (messageInput && sendBtn && micBtn) {
    messageInput.addEventListener('input', () => {
      if (messageInput.value.trim().length > 0) {
        sendBtn.classList.remove('hidden');
        micBtn.classList.add('hidden');
      } else {
        sendBtn.classList.add('hidden');
        micBtn.classList.remove('hidden');
      }
    });
  }

  // Send Message
  if (messageForm) {
    messageForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = messageInput.value.trim();
      if (!text || !socket) return;

      socket.emit('chatMessage', { type: 'text', text });
      messageInput.value = '';
      sendBtn.classList.add('hidden');
      micBtn.classList.remove('hidden');
    });
  }

  // Fetch History
  async function loadRoomHistory(room) {
    messagesDiv.innerHTML = '';
    if (headerTitle) headerTitle.textContent = room === 'public' ? 'Adda Room (Public)' : room;

    try {
      const res = await fetch(`/api/messages/${room}`, {
        headers: { 'Authorization': `Bearer ${currentToken}` }
      });
      if (res.ok) {
        const history = await res.json();
        history.forEach(appendMessage);
      }
    } catch (e) {
      console.error(e);
    }
  }

  // Render Message UI
  function appendMessage(msg) {
    const isMe = (msg.username || msg.from) === myUsername;
    const msgCard = document.createElement('div');
    msgCard.className = `message-card ${isMe ? 'my-message' : 'other-message'}`;

    // Styling
    msgCard.style.margin = '6px 12px';
    msgCard.style.padding = '8px 12px';
    msgCard.style.borderRadius = '12px';
    msgCard.style.maxWidth = '75%';
    msgCard.style.clear = 'both';
    msgCard.style.float = isMe ? 'right' : 'left';
    msgCard.style.background = isMe ? '#dcf8c6' : '#ffffff';
    msgCard.style.boxShadow = '0 1px 2px rgba(0,0,0,0.15)';

    const sender = document.createElement('div');
    sender.style.fontWeight = 'bold';
    sender.style.fontSize = '12px';
    sender.style.color = '#075e54';
    sender.style.marginBottom = '3px';
    sender.textContent = isMe ? 'Aap' : (msg.username || msg.from);
    msgCard.appendChild(sender);

    if (msg.type === 'image' && msg.mediaUrl) {
      const img = document.createElement('img');
      img.src = msg.mediaUrl;
      img.style.maxWidth = '100%';
      img.style.borderRadius = '8px';
      msgCard.appendChild(img);
    } else if (msg.type === 'document' && msg.mediaUrl) {
      const link = document.createElement('a');
      link.href = msg.mediaUrl;
      link.target = '_blank';
      link.textContent = `📄 ${msg.mediaName || 'Document'}`;
      msgCard.appendChild(link);
    } else {
      const txt = document.createElement('p');
      txt.style.margin = '0';
      txt.style.wordBreak = 'break-word';
      txt.textContent = msg.text || '';
      msgCard.appendChild(txt);
    }

    messagesDiv.appendChild(msgCard);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }

  // Logout
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.clear();
      location.reload();
    });
  }

  // Check auto-login
  if (currentToken && myUsername) {
    initChatSession();
  }
});
