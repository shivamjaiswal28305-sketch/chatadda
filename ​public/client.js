document.addEventListener('DOMContentLoaded', () => {
  let socket = null;
  let currentToken = localStorage.getItem('chatToken') || null;
  let myUsername = localStorage.getItem('chatUsername') || null;
  let currentChatRoom = 'public'; // 'public' ya private username

  // DOM Elements - Auth & Screens
  const joinScreen = document.getElementById('joinScreen');
  const chatScreen = document.getElementById('chatScreen');
  const loginTabBtn = document.getElementById('loginTabBtn');
  const signupTabBtn = document.getElementById('signupTabBtn');
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  const authError = document.getElementById('authError');

  // Auth Inputs
  const loginPhone = document.getElementById('loginPhone');
  const loginPassword = document.getElementById('loginPassword');
  const signupUsername = document.getElementById('signupUsername');
  const signupPhone = document.getElementById('signupPhone');
  const signupPassword = document.getElementById('signupPassword');

  // Sidebar & Search Elements
  const logoutBtn = document.getElementById('logoutBtn');
  const userList = document.getElementById('userList');
  const publicRoomBtn = document.getElementById('publicRoomBtn');
  const searchPhoneInput = document.getElementById('searchPhoneInput');
  const searchPhoneBtn = document.getElementById('searchPhoneBtn');
  const searchResult = document.getElementById('searchResult');

  // Chat Area & Headers
  const messagesDiv = document.getElementById('messages');
  const messageForm = document.getElementById('messageForm');
  const messageInput = document.getElementById('messageInput');
  const headerTitle = document.getElementById('headerTitle');
  const chatActions = document.getElementById('chatActions');

  // Attachment & Voice Elements
  const plusBtn = document.getElementById('plusBtn');
  const attachMenu = document.getElementById('attachMenu');
  const attachBtn = document.getElementById('attachBtn');
  const fileInput = document.getElementById('fileInput');
  const sendBtn = document.getElementById('sendBtn');
  const micBtn = document.getElementById('micBtn');

  // Calls & Themes Elements
  const videoCallBtn = document.getElementById('videoCallBtn');
  const audioCallBtn = document.getElementById('audioCallBtn');
  const moreOptionsBtn = document.getElementById('moreOptionsBtn');
  const moreOptionsMenu = document.getElementById('moreOptionsMenu');
  const wallpaperBtn = document.getElementById('wallpaperBtn');
  const themeBtn = document.getElementById('themeBtn');
  const wallpaperPicker = document.getElementById('wallpaperPicker');
  const themePicker = document.getElementById('themePicker');

  // 1. Auth Tabs Switch
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

  // 2. Login Handler
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

        if (!res.ok) return showError(data.error || 'Login me dikkat aayi');

        currentToken = data.token;
        myUsername = data.username;
        localStorage.setItem('chatToken', currentToken);
        localStorage.setItem('chatUsername', myUsername);

        initChatEngine();
      } catch (err) {
        showError('Server connect nahi ho raha hai.');
      }
    });
  }

  // 3. Signup Handler
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

        if (!res.ok) return showError(data.error || 'Signup me dikkat aayi');

        currentToken = data.token;
        myUsername = data.username;
        localStorage.setItem('chatToken', currentToken);
        localStorage.setItem('chatUsername', myUsername);

        initChatEngine();
      } catch (err) {
        showError('Server connect nahi ho raha hai.');
      }
    });
  }

  // 4. Initialize Main Engine
  function initChatEngine() {
    if (!currentToken) return;

    if (joinScreen) joinScreen.classList.add('hidden');
    if (chatScreen) chatScreen.classList.remove('hidden');

    socket = io({
      auth: { token: currentToken }
    });

    socket.on('connect', () => {
      socket.emit('enterPublicRoom');
      loadUsersSidebar();
      switchChatRoom('public');
    });

    // Real-time Chat Receivers
    socket.on('chatMessage', (msg) => {
      if (currentChatRoom === 'public') appendMessage(msg);
    });

    socket.on('privateMessage', (msg) => {
      const room = [msg.from, msg.to].sort().join('__');
      if (currentChatRoom === room) {
        appendMessage(msg);
      }
    });

    socket.on('presenceUpdate', loadUsersSidebar);

    socket.on('system', (sysMsg) => {
      if (currentChatRoom === 'public') {
        const div = document.createElement('div');
        div.style.cssText = 'text-align: center; margin: 8px 0; font-size: 11px; color: #888; font-style: italic;';
        div.textContent = sysMsg;
        messagesDiv.appendChild(div);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
      }
    });
  }

  // 5. Phone Search & User List (Private Chat Feature)
  if (searchPhoneBtn && searchPhoneInput) {
    searchPhoneBtn.addEventListener('click', async () => {
      const phone = searchPhoneInput.value.trim();
      if (!phone) return;

      try {
        const res = await fetch(`/api/users/search?phone=${phone}`);
        const data = await res.json();

        if (res.ok) {
          searchResult.innerHTML = `
            <div style="padding: 10px; background: #e8f5e9; border-radius: 8px; cursor: pointer;" id="startChatUser">
              💬 <strong>${data.username}</strong> ke saath chat start karein
            </div>`;
          searchResult.classList.remove('hidden');

          document.getElementById('startChatUser').onclick = () => {
            startPrivateChat(data.username);
            searchResult.classList.add('hidden');
            searchPhoneInput.value = '';
          };
        } else {
          searchResult.innerHTML = `<div style="padding: 10px; color: red;">${data.error}</div>`;
          searchResult.classList.remove('hidden');
        }
      } catch (e) {
        console.error(e);
      }
    });
  }

  async function loadUsersSidebar() {
    if (!userList) return;

    try {
      const res = await fetch('/api/users');
      if (!res.ok) return;

      const users = await res.json();
      userList.innerHTML = '';

      users.forEach(u => {
        if (u.username === myUsername) return;

        const li = document.createElement('li');
        li.style.cssText = 'padding: 12px; cursor: pointer; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;';
        
        const onlineTag = u.isOnline 
          ? '<span style="color: #2e7d32; font-size: 11px; font-weight: bold;">● Online</span>' 
          : '<span style="color: #999; font-size: 11px;">Offline</span>';
        
        li.innerHTML = `<span>👤 <strong>${u.username}</strong></span> ${onlineTag}`;
        li.onclick = () => startPrivateChat(u.username);
        userList.appendChild(li);
      });
    } catch (e) {
      console.error(e);
    }
  }

  // 6. Switch Between Rooms
  if (publicRoomBtn) {
    publicRoomBtn.onclick = () => switchChatRoom('public');
  }

  function startPrivateChat(targetUsername) {
    const room = [myUsername, targetUsername].sort().join('__');
    switchChatRoom(room, targetUsername);
  }

  function switchChatRoom(room, displayName) {
    currentChatRoom = room;
    messagesDiv.innerHTML = '';

    if (room === 'public') {
      if (headerTitle) headerTitle.textContent = 'Adda Room (Public)';
      if (chatActions) chatActions.classList.add('hidden');
    } else {
      if (headerTitle) headerTitle.textContent = displayName || room.replace(myUsername, '').replace('__', '');
      if (chatActions) chatActions.classList.remove('hidden');
    }

    loadRoomHistory(room);
  }

  // 7. Load Room History
  async function loadRoomHistory(room) {
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

  // 8. File Uploads & Attachments
  if (plusBtn && attachMenu) {
    plusBtn.onclick = () => attachMenu.classList.toggle('hidden');
  }

  if (attachBtn && fileInput) {
    attachBtn.onclick = () => {
      fileInput.click();
      attachMenu.classList.add('hidden');
    };
  }

  if (fileInput) {
    fileInput.onchange = async () => {
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
          const payload = { type: data.type, mediaUrl: data.url, mediaName: data.name };
          if (currentChatRoom === 'public') {
            socket.emit('chatMessage', payload);
          } else {
            const toUsername = currentChatRoom.replace(myUsername, '').replace('__', '');
            socket.emit('privateMessage', { toUsername, ...payload });
          }
        }
      } catch (e) {
        alert('File upload nahi ho saka.');
      }
      fileInput.value = '';
    };
  }

  // 9. Input & Send Handling
  if (messageInput && sendBtn && micBtn) {
    messageInput.oninput = () => {
      if (messageInput.value.trim().length > 0) {
        sendBtn.classList.remove('hidden');
        micBtn.classList.add('hidden');
      } else {
        sendBtn.classList.add('hidden');
        micBtn.classList.remove('hidden');
      }
    };
  }

  if (messageForm) {
    messageForm.onsubmit = (e) => {
      e.preventDefault();
      const text = messageInput.value.trim();
      if (!text || !socket) return;

      if (currentChatRoom === 'public') {
        socket.emit('chatMessage', { type: 'text', text });
      } else {
        const toUsername = currentChatRoom.replace(myUsername, '').replace('__', '');
        socket.emit('privateMessage', { toUsername, type: 'text', text });
      }

      messageInput.value = '';
      sendBtn.classList.add('hidden');
      micBtn.classList.remove('hidden');
    };
  }

  // 10. Message Display UI (WhatsApp Style)
  function appendMessage(msg) {
    const senderName = msg.username || msg.from;
    const isMe = senderName === myUsername;

    const msgCard = document.createElement('div');
    msgCard.style.cssText = `
      margin: 6px 12px;
      padding: 8px 12px;
      border-radius: 12px;
      max-width: 75%;
      clear: both;
      float: ${isMe ? 'right' : 'left'};
      background: ${isMe ? '#dcf8c6' : '#ffffff'};
      box-shadow: 0 1px 2px rgba(0,0,0,0.15);
      font-family: sans-serif;
    `;

    const sender = document.createElement('div');
    sender.style.cssText = 'font-weight: bold; font-size: 11px; color: #075e54; margin-bottom: 3px;';
    sender.textContent = isMe ? 'Aap' : senderName;
    msgCard.appendChild(sender);

    if (msg.type === 'image' && msg.mediaUrl) {
      const img = document.createElement('img');
      img.src = msg.mediaUrl;
      img.style.cssText = 'max-width: 100%; border-radius: 8px; margin-top: 4px;';
      msgCard.appendChild(img);
    } else if (msg.type === 'document' && msg.mediaUrl) {
      const link = document.createElement('a');
      link.href = msg.mediaUrl;
      link.target = '_blank';
      link.style.cssText = 'color: #0277bd; text-decoration: none; font-weight: bold;';
      link.textContent = `📄 ${msg.mediaName || 'Document'}`;
      msgCard.appendChild(link);
    } else {
      const txt = document.createElement('p');
      txt.style.cssText = 'margin: 0; word-break: break-word; font-size: 14px; color: #333;';
      txt.textContent = msg.text || '';
      msgCard.appendChild(txt);
    }

    messagesDiv.appendChild(msgCard);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }

  // 11. Extra UI Actions (Calls, Wallpapers & Theme)
  if (moreOptionsBtn && moreOptionsMenu) {
    moreOptionsBtn.onclick = () => moreOptionsMenu.classList.toggle('hidden');
  }

  if (wallpaperBtn && wallpaperPicker) {
    wallpaperBtn.onclick = () => {
      wallpaperPicker.classList.toggle('hidden');
      moreOptionsMenu.classList.add('hidden');
    };
  }

  if (themeBtn && themePicker) {
    themeBtn.onclick = () => {
      themePicker.classList.toggle('hidden');
      moreOptionsMenu.classList.add('hidden');
    };
  }

  if (videoCallBtn) videoCallBtn.onclick = () => alert('Video Call connect ho raha hai...');
  if (audioCallBtn) audioCallBtn.onclick = () => alert('Audio Call connect ho raha hai...');

  // Logout
  if (logoutBtn) {
    logoutBtn.onclick = () => {
      localStorage.clear();
      location.reload();
    };
  }

  // Check Existing Session
  if (currentToken && myUsername) {
    initChatEngine();
  }
});
