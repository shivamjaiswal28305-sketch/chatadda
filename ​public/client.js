document.addEventListener('DOMContentLoaded', () => {
  let socket = null;
  let currentToken = localStorage.getItem('chatToken') || null;
  let myUsername = localStorage.getItem('chatUsername') || null;
  let currentChatRoom = 'public'; // 'public' or private room

  // --- 1. DOM ELEMENTS ---
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

  // Navigation & Mobile Controls
  const menuBtn = document.getElementById('menuBtn');
  const sidebar = document.querySelector('.sidebar');
  const sidebarBackdrop = document.getElementById('sidebarBackdrop');
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const logoutBtn = document.getElementById('logoutBtn');

  // Search & Contact Lists
  const searchPhoneInput = document.getElementById('searchPhoneInput');
  const searchPhoneBtn = document.getElementById('searchPhoneBtn');
  const searchResult = document.getElementById('searchResult');
  const publicRoomBtn = document.getElementById('publicRoomBtn');
  const userList = document.getElementById('userList');
  const savedContactsSection = document.getElementById('savedContactsSection');
  const savedContactsList = document.getElementById('savedContactsList');

  // Chat Area
  const messagesDiv = document.getElementById('messages');
  const messageForm = document.getElementById('messageForm');
  const messageInput = document.getElementById('messageInput');
  const headerTitle = document.getElementById('headerTitle');
  const headerSubtitle = document.getElementById('headerSubtitle');
  const chatActions = document.getElementById('chatActions');

  // Attachments & Record
  const plusBtn = document.getElementById('plusBtn');
  const attachMenu = document.getElementById('attachMenu');
  const attachBtn = document.getElementById('attachBtn');
  const fileInput = document.getElementById('fileInput');
  const locationBtn = document.getElementById('locationBtn');
  const contactBtn = document.getElementById('contactBtn');
  const sendBtn = document.getElementById('sendBtn');
  const micBtn = document.getElementById('micBtn');

  // Pickers & Menus
  const moreOptionsBtn = document.getElementById('moreOptionsBtn');
  const moreOptionsMenu = document.getElementById('moreOptionsMenu');
  const wallpaperBtn = document.getElementById('wallpaperBtn');
  const themeBtn = document.getElementById('themeBtn');
  const wallpaperPicker = document.getElementById('wallpaperPicker');
  const themePicker = document.getElementById('themePicker');

  // Call Modals
  const videoCallBtn = document.getElementById('videoCallBtn');
  const audioCallBtn = document.getElementById('audioCallBtn');
  const incomingCallModal = document.getElementById('incomingCallModal');
  const activeCallOverlay = document.getElementById('activeCallOverlay');
  const endCallBtn = document.getElementById('endCallBtn');

  // Image Editor Elements
  const imageEditorOverlay = document.getElementById('imageEditorOverlay');
  const editorCancelBtn = document.getElementById('editorCancelBtn');
  const editorSendBtn = document.getElementById('editorSendBtn');

  // --- 2. AUTHENTICATION TAB & TOGGLE ---
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

  // Login
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
        initChatSession();
      } catch (err) {
        showError('Server connect nahi ho raha hai.');
      }
    });
  }

  // Signup
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
        showError('Server connect nahi ho raha hai.');
      }
    });
  }

  // --- 3. MOBILE SIDEBAR TOGGLE & NAVIGATION ---
  function openSidebar() {
    if (sidebar) sidebar.classList.add('open');
    if (sidebarBackdrop) sidebarBackdrop.classList.remove('hidden');
  }

  function closeSidebar() {
    if (sidebar) sidebar.classList.remove('open');
    if (sidebarBackdrop) sidebarBackdrop.classList.add('hidden');
  }

  if (menuBtn) menuBtn.onclick = openSidebar;
  if (sidebarBackdrop) sidebarBackdrop.onclick = closeSidebar;

  // Dark/Light Mode Switcher
  if (themeToggleBtn) {
    themeToggleBtn.onclick = () => {
      document.body.classList.toggle('dark-mode');
      const isDark = document.body.classList.contains('dark-mode');
      themeToggleBtn.textContent = isDark ? '☀️' : '🌙';
    };
  }

  // Logout
  if (logoutBtn) {
    logoutBtn.onclick = () => {
      localStorage.clear();
      location.reload();
    };
  }

  // --- 4. CHAT ENGINE & SOCKET SETUP ---
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
      loadUsersList();
      switchChatRoom('public');
    });

    socket.on('chatMessage', (msg) => {
      if (currentChatRoom === 'public') appendMessage(msg);
    });

    socket.on('privateMessage', (msg) => {
      const room = [msg.from, msg.to].sort().join('__');
      if (currentChatRoom === room) {
        appendMessage(msg);
      }
    });

    socket.on('presenceUpdate', loadUsersList);

    socket.on('system', (sysMsg) => {
      if (currentChatRoom === 'public') {
        const div = document.createElement('div');
        div.className = 'system-msg';
        div.style.cssText = 'text-align: center; margin: 8px 0; font-size: 12px; color: #777; font-style: italic;';
        div.textContent = sysMsg;
        messagesDiv.appendChild(div);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
      }
    });
  }

  // --- 5. SEARCH PHONE & USER DIRECTORY ---
  if (searchPhoneBtn && searchPhoneInput) {
    searchPhoneBtn.addEventListener('click', async () => {
      const phone = searchPhoneInput.value.trim();
      if (!phone) return;

      try {
        const res = await fetch(`/api/users/search?phone=${phone}`);
        const data = await res.json();

        if (res.ok) {
          searchResult.innerHTML = `
            <div style="padding: 10px; background: rgba(37,211,102,0.15); border-radius: 8px; cursor: pointer; margin: 8px 0;" id="startSearchedChat">
              💬 <strong>${data.username}</strong> ke saath chat karein
            </div>`;
          searchResult.classList.remove('hidden');

          document.getElementById('startSearchedChat').onclick = () => {
            startPrivateChat(data.username);
            searchResult.classList.add('hidden');
            searchPhoneInput.value = '';
          };
        } else {
          searchResult.innerHTML = `<div style="padding: 8px; color: red; font-size: 13px;">${data.error}</div>`;
          searchResult.classList.remove('hidden');
        }
      } catch (e) {
        console.error(e);
      }
    });
  }

  async function loadUsersList() {
    if (!userList) return;

    try {
      const res = await fetch('/api/users');
      if (!res.ok) return;

      const users = await res.json();
      userList.innerHTML = '';

      users.forEach(u => {
        if (u.username === myUsername) return;

        const li = document.createElement('li');
        li.className = 'room-item';
        li.style.cssText = 'padding: 12px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(0,0,0,0.05);';

        const statusTag = u.isOnline 
          ? '<span style="color: #25D366; font-size: 11px; font-weight: bold;">● Online</span>' 
          : '<span style="color: #888; font-size: 11px;">Offline</span>';

        li.innerHTML = `<span>👤 <strong>${u.username}</strong></span> ${statusTag}`;
        li.onclick = () => startPrivateChat(u.username);
        userList.appendChild(li);
      });
    } catch (e) {
      console.error(e);
    }
  }

  // --- 6. ROOM SWITCHING (PUBLIC VS PRIVATE) ---
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
    closeSidebar(); // Close mobile sidebar automatically on select

    if (room === 'public') {
      if (headerTitle) headerTitle.textContent = 'Adda Room (Public)';
      if (headerSubtitle) headerSubtitle.textContent = 'Sabhi log live hain';
      if (chatActions) chatActions.classList.add('hidden');
    } else {
      const name = displayName || room.replace(myUsername, '').replace('__', '');
      if (headerTitle) headerTitle.textContent = name;
      if (headerSubtitle) headerSubtitle.textContent = 'Private Chat';
      if (chatActions) chatActions.classList.remove('hidden');
    }

    loadRoomHistory(room);
  }

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

  // --- 7. ATTACHMENTS & IMAGE EDITOR INTEGRATION ---
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

      // Agar Photo hai, toh Photo Editor overlay kholo
      if (file.type.startsWith('image/')) {
        if (imageEditorOverlay) imageEditorOverlay.classList.remove('hidden');
        // Editor Send Button Logic
        if (editorSendBtn) {
          editorSendBtn.onclick = async () => {
            if (imageEditorOverlay) imageEditorOverlay.classList.add('hidden');
            await uploadAndSendFile(file);
          };
        }
      } else {
        await uploadAndSendFile(file);
      }
      fileInput.value = '';
    };
  }

  if (editorCancelBtn && imageEditorOverlay) {
    editorCancelBtn.onclick = () => imageEditorOverlay.classList.add('hidden');
  }

  async function uploadAndSendFile(file) {
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
      alert('File send nahi ho saki');
    }
  }

  // Location Sharing Feature
  if (locationBtn) {
    locationBtn.onclick = () => {
      attachMenu.classList.add('hidden');
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
          const locText = `📍 Location: https://maps.google.com/?q=${pos.coords.latitude},${pos.coords.longitude}`;
          sendTextMessage(locText);
        }, () => alert('Location permission refused or error'));
      }
    };
  }

  // Contact Sharing
  if (contactBtn) {
    contactBtn.onclick = () => {
      attachMenu.classList.add('hidden');
      const modal = document.getElementById('contactFormModal');
      if (modal) modal.classList.remove('hidden');
    };
  }

  const contactFormCancel = document.getElementById('contactFormCancel');
  const contactFormSend = document.getElementById('contactFormSend');
  if (contactFormCancel) {
    contactFormCancel.onclick = () => {
      document.getElementById('contactFormModal').classList.add('hidden');
    };
  }
  if (contactFormSend) {
    contactFormSend.onclick = () => {
      const cName = document.getElementById('contactNameInput').value.trim();
      const cPhone = document.getElementById('contactPhoneInput').value.trim();
      if (cName && cPhone) {
        sendTextMessage(`👤 Contact: ${cName} (${cPhone})`);
        document.getElementById('contactFormModal').classList.add('hidden');
      }
    };
  }

  // --- 8. MESSAGE INPUT & RENDERING ---
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
      if (!text) return;

      sendTextMessage(text);
      messageInput.value = '';
      sendBtn.classList.add('hidden');
      micBtn.classList.remove('hidden');
    };
  }

  function sendTextMessage(text) {
    if (!socket) return;
    if (currentChatRoom === 'public') {
      socket.emit('chatMessage', { type: 'text', text });
    } else {
      const toUsername = currentChatRoom.replace(myUsername, '').replace('__', '');
      socket.emit('privateMessage', { toUsername, type: 'text', text });
    }
  }

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
      color: #333;
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
      link.style.cssText = 'color: #0277bd; text-decoration: underline; font-weight: bold;';
      link.textContent = `📄 ${msg.mediaName || 'Document'}`;
      msgCard.appendChild(link);
    } else {
      const txt = document.createElement('p');
      txt.style.cssText = 'margin: 0; word-break: break-word; font-size: 14px;';
      txt.textContent = msg.text || '';
      msgCard.appendChild(txt);
    }

    messagesDiv.appendChild(msgCard);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }

  // --- 9. WALLPAPER, THEMES & CALL MODALS ---
  if (moreOptionsBtn && moreOptionsMenu) {
    moreOptionsBtn.onclick = () => moreOptionsMenu.classList.toggle('hidden');
  }

  if (wallpaperBtn && wallpaperPicker) {
    wallpaperBtn.onclick = () => {
      wallpaperPicker.classList.toggle('hidden');
      if (moreOptionsMenu) moreOptionsMenu.classList.add('hidden');
    };
  }

  if (themeBtn && themePicker) {
    themeBtn.onclick = () => {
      themePicker.classList.toggle('hidden');
      if (moreOptionsMenu) moreOptionsMenu.classList.add('hidden');
    };
  }

  // Wallpapers Option Click
  document.querySelectorAll('.wallpaper-opt').forEach(btn => {
    btn.onclick = () => {
      const bg = btn.style.background;
      if (messagesDiv) messagesDiv.style.background = bg;
      if (wallpaperPicker) wallpaperPicker.classList.add('hidden');
    };
  });

  // Theme Option Click
  document.querySelectorAll('.theme-opt').forEach(btn => {
    btn.onclick = () => {
      const theme = btn.getAttribute('data-theme');
      document.body.setAttribute('data-theme', theme);
      if (themePicker) themePicker.classList.add('hidden');
    };
  });

  // Calling Feature Triggers
  if (videoCallBtn) {
    videoCallBtn.onclick = () => {
      if (activeCallOverlay) activeCallOverlay.classList.remove('hidden');
    };
  }

  if (audioCallBtn) {
    audioCallBtn.onclick = () => {
      if (activeCallOverlay) activeCallOverlay.classList.remove('hidden');
    };
  }

  if (endCallBtn) {
    endCallBtn.onclick = () => {
      if (activeCallOverlay) activeCallOverlay.classList.add('hidden');
    };
  }

  // Auto Session Resume
  if (currentToken && myUsername) {
    initChatSession();
  }
});
