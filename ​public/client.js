document.addEventListener('DOMContentLoaded', () => {
  let socket = null;
  let currentToken = localStorage.getItem('chatToken') || null;
  let myUsername = localStorage.getItem('chatUsername') || null;
  let currentChatRoom = 'public';

  // --- 1. DOM ELEMENTS ---
  const joinScreen = document.getElementById('joinScreen');
  const chatScreen = document.getElementById('chatScreen');
  const loginTabBtn = document.getElementById('loginTabBtn');
  const signupTabBtn = document.getElementById('signupTabBtn');
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  const authError = document.getElementById('authError');

  const loginPhone = document.getElementById('loginPhone');
  const loginPassword = document.getElementById('loginPassword');
  const signupUsername = document.getElementById('signupUsername');
  const signupPhone = document.getElementById('signupPhone');
  const signupPassword = document.getElementById('signupPassword');

  // DP
  const myAvatarBtn = document.getElementById('myAvatarBtn');
  const myAvatarInitial = document.getElementById('myAvatarInitial');
  const avatarFileInput = document.getElementById('avatarFileInput');

  // Sidebar & Navigation
  const menuBtn = document.getElementById('menuBtn');
  const sidebar = document.querySelector('.sidebar');
  const sidebarBackdrop = document.getElementById('sidebarBackdrop');
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const logoutBtn = document.getElementById('logoutBtn');

  // Directory
  const searchPhoneInput = document.getElementById('searchPhoneInput');
  const searchPhoneBtn = document.getElementById('searchPhoneBtn');
  const searchResult = document.getElementById('searchResult');
  const publicRoomBtn = document.getElementById('publicRoomBtn');
  const userList = document.getElementById('userList');

  // Chat Main
  const messagesDiv = document.getElementById('messages');
  const messageForm = document.getElementById('messageForm');
  const messageInput = document.getElementById('messageInput');
  const headerTitle = document.getElementById('headerTitle');
  const headerSubtitle = document.getElementById('headerSubtitle');
  const chatActions = document.getElementById('chatActions');

  // Attachments & Mic
  const plusBtn = document.getElementById('plusBtn');
  const attachMenu = document.getElementById('attachMenu');
  const attachBtn = document.getElementById('attachBtn');
  const fileInput = document.getElementById('fileInput');
  const locationBtn = document.getElementById('locationBtn');
  const contactBtn = document.getElementById('contactBtn');
  const sendBtn = document.getElementById('sendBtn');
  const micBtn = document.getElementById('micBtn');
  const recordingBar = document.getElementById('recordingBar');
  const recordingTimer = document.getElementById('recordingTimer');

  // Pickers & Menus
  const moreOptionsBtn = document.getElementById('moreOptionsBtn');
  const moreOptionsMenu = document.getElementById('moreOptionsMenu');
  const wallpaperBtn = document.getElementById('wallpaperBtn');
  const themeBtn = document.getElementById('themeBtn');
  const wallpaperPicker = document.getElementById('wallpaperPicker');
  const themePicker = document.getElementById('themePicker');

  // Calls
  const videoCallBtn = document.getElementById('videoCallBtn');
  const audioCallBtn = document.getElementById('audioCallBtn');
  const activeCallOverlay = document.getElementById('activeCallOverlay');
  const endCallBtn = document.getElementById('endCallBtn');

  // Image Editor Canvas & Tools
  const imageEditorOverlay = document.getElementById('imageEditorOverlay');
  const editorCancelBtn = document.getElementById('editorCancelBtn');
  const editorSendBtn = document.getElementById('editorSendBtn');
  const imageCanvas = document.getElementById('imageCanvas');
  const drawCanvas = document.getElementById('drawCanvas');
  const drawColorStrip = document.getElementById('drawColorStrip');
  const filterStrip = document.getElementById('filterStrip');

  let currentSelectedFile = null;
  let isDrawing = false;
  let drawColor = '#FF3B30';
  let mediaRecorder = null;
  let audioChunks = [];
  let recordInterval = null;

  // --- 2. AUTHENTICATION & TABS ---
  if (loginTabBtn && signupTabBtn) {
    loginTabBtn.onclick = () => {
      loginTabBtn.classList.add('active');
      signupTabBtn.classList.remove('active');
      loginForm.classList.remove('hidden');
      signupForm.classList.add('hidden');
      hideError();
    };

    signupTabBtn.onclick = () => {
      signupTabBtn.classList.add('active');
      loginTabBtn.classList.remove('active');
      signupForm.classList.remove('hidden');
      loginForm.classList.add('hidden');
      hideError();
    };
  }

  function showError(msg) {
    if (authError) { authError.textContent = msg; authError.classList.remove('hidden'); }
  }

  function hideError() {
    if (authError) { authError.textContent = ''; authError.classList.add('hidden'); }
  }

  if (loginForm) {
    loginForm.onsubmit = async (e) => {
      e.preventDefault();
      hideError();
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: loginPhone.value.trim(), password: loginPassword.value.trim() })
        });
        const data = await res.json();
        if (!res.ok) return showError(data.error || 'Login me error hai');

        currentToken = data.token;
        myUsername = data.username;
        localStorage.setItem('chatToken', currentToken);
        localStorage.setItem('chatUsername', myUsername);
        initChatSession();
      } catch (err) { showError('Server se connection toot gaya.'); }
    };
  }

  if (signupForm) {
    signupForm.onsubmit = async (e) => {
      e.preventDefault();
      hideError();
      try {
        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: signupUsername.value.trim(), phone: signupPhone.value.trim(), password: signupPassword.value.trim() })
        });
        const data = await res.json();
        if (!res.ok) return showError(data.error || 'Signup me error hai');

        currentToken = data.token;
        myUsername = data.username;
        localStorage.setItem('chatToken', currentToken);
        localStorage.setItem('chatUsername', myUsername);
        initChatSession();
      } catch (err) { showError('Server se connection toot gaya.'); }
    };
  }

  // --- 3. DP CHANGE FEATURE ---
  if (myAvatarBtn && avatarFileInput) {
    myAvatarBtn.onclick = () => avatarFileInput.click();

    avatarFileInput.onchange = async () => {
      const file = avatarFileInput.files[0];
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

        if (res.ok && data.url) {
          localStorage.setItem('myAvatarUrl', data.url);
          loadMyAvatar();
        } else { alert('DP update nahi ho paayi'); }
      } catch (e) { alert('DP upload me dikkat aayi'); }
    };
  }

  function loadMyAvatar() {
    const savedAvatar = localStorage.getItem('myAvatarUrl');
    if (savedAvatar && myAvatarBtn) {
      myAvatarBtn.innerHTML = `<img src="${savedAvatar}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
    } else if (myUsername && myAvatarInitial) {
      myAvatarInitial.textContent = myUsername.charAt(0).toUpperCase();
    }
  }

  // --- 4. NAVIGATION & THEMES ---
  if (menuBtn) {
    menuBtn.onclick = () => {
      if (sidebar) sidebar.classList.add('open');
      if (sidebarBackdrop) sidebarBackdrop.classList.remove('hidden');
    };
  }

  if (sidebarBackdrop) {
    sidebarBackdrop.onclick = () => {
      if (sidebar) sidebar.classList.remove('open');
      sidebarBackdrop.classList.add('hidden');
    };
  }

  if (themeToggleBtn) {
    themeToggleBtn.onclick = () => {
      document.body.classList.toggle('dark-mode');
      const isDark = document.body.classList.contains('dark-mode');
      themeToggleBtn.textContent = isDark ? '☀️' : '🌙';
      localStorage.setItem('chatThemeMode', isDark ? 'dark' : 'light');
    };
    if (localStorage.getItem('chatThemeMode') === 'dark') {
      document.body.classList.add('dark-mode');
      themeToggleBtn.textContent = '☀️';
    }
  }

  if (logoutBtn) {
    logoutBtn.onclick = () => { localStorage.clear(); location.reload(); };
  }

  // --- 5. SOCKET ENGINE & DIRECTORY ---
  function initChatSession() {
    if (!currentToken) return;

    if (joinScreen) joinScreen.classList.add('hidden');
    if (chatScreen) chatScreen.classList.remove('hidden');
    if (messageForm) messageForm.classList.remove('hidden');

    loadMyAvatar();

    socket = io({ auth: { token: currentToken } });

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
      if (currentChatRoom === room) appendMessage(msg);
    });

    socket.on('presenceUpdate', loadUsersList);
  }

  if (searchPhoneBtn && searchPhoneInput) {
    searchPhoneBtn.onclick = async () => {
      const phone = searchPhoneInput.value.trim();
      if (!phone) return;

      try {
        const res = await fetch(`/api/users/search?phone=${phone}`);
        const data = await res.json();
        if (res.ok) {
          searchResult.innerHTML = `<div style="padding:10px; background:#e8f5e9; border-radius:8px; cursor:pointer;" id="startSearchedChat">💬 <strong>${data.username}</strong> ke saath chat karein</div>`;
          searchResult.classList.remove('hidden');
          document.getElementById('startSearchedChat').onclick = () => {
            startPrivateChat(data.username);
            searchResult.classList.add('hidden');
            searchPhoneInput.value = '';
          };
        } else {
          searchResult.innerHTML = `<div style="padding:8px; color:red;">${data.error}</div>`;
          searchResult.classList.remove('hidden');
        }
      } catch (e) { console.error(e); }
    };
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
        li.style.cssText = 'padding: 12px; cursor: pointer; display: flex; justify-content: space-between; border-bottom: 1px solid rgba(0,0,0,0.05);';
        li.innerHTML = `<span>👤 <strong>${u.username}</strong></span> ${u.isOnline ? '<span style="color:#25D366; font-size:11px;">● Online</span>' : '<span style="color:#888; font-size:11px;">Offline</span>'}`;
        li.onclick = () => startPrivateChat(u.username);
        userList.appendChild(li);
      });
    } catch (e) { console.error(e); }
  }

  if (publicRoomBtn) { publicRoomBtn.onclick = () => switchChatRoom('public'); }

  function startPrivateChat(targetUsername) {
    const room = [myUsername, targetUsername].sort().join('__');
    switchChatRoom(room, targetUsername);
  }

  function switchChatRoom(room, displayName) {
    currentChatRoom = room;
    messagesDiv.innerHTML = '';
    if (sidebar) sidebar.classList.remove('open');
    if (sidebarBackdrop) sidebarBackdrop.classList.add('hidden');

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
      const res = await fetch(`/api/messages/${room}`, { headers: { 'Authorization': `Bearer ${currentToken}` } });
      if (res.ok) {
        const history = await res.json();
        history.forEach(appendMessage);
      }
    } catch (e) { console.error(e); }
  }

  // --- 6. ATTACHMENTS & FULL CANVASES PHOTO EDITOR ---
  if (plusBtn && attachMenu) {
    plusBtn.onclick = () => attachMenu.classList.toggle('hidden');
  }

  if (attachBtn && fileInput) {
    attachBtn.onclick = () => { fileInput.click(); attachMenu.classList.add('hidden'); };
  }

  if (fileInput) {
    fileInput.onchange = () => {
      const file = fileInput.files[0];
      if (!file) return;

      currentSelectedFile = file;

      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            if (imageCanvas && drawCanvas) {
              const ctx = imageCanvas.getContext('2d');
              imageCanvas.width = img.width;
              imageCanvas.height = img.height;
              drawCanvas.width = img.width;
              drawCanvas.height = img.height;
              ctx.drawImage(img, 0, 0);
              initCanvasDrawing();
            }
            if (imageEditorOverlay) imageEditorOverlay.classList.remove('hidden');
          };
          img.src = e.target.result;
        };
        reader.readAsDataURL(file);
      } else {
        uploadAndSendFile(file);
      }
      fileInput.value = '';
    };
  }

  function initCanvasDrawing() {
    if (!drawCanvas) return;
    const ctx = drawCanvas.getContext('2d');

    drawCanvas.onmousedown = (e) => { isDrawing = true; ctx.beginPath(); ctx.moveTo(e.offsetX, e.offsetY); };
    drawCanvas.onmousemove = (e) => {
      if (isDrawing) {
        ctx.lineTo(e.offsetX, e.offsetY);
        ctx.strokeStyle = drawColor;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.stroke();
      }
    };
    drawCanvas.onmouseup = () => { isDrawing = false; };
  }

  // Editor Tools Buttons
  document.querySelectorAll('.editor-tool-btn').forEach(btn => {
    btn.onclick = () => {
      const tool = btn.getAttribute('data-tool');
      if (tool === 'draw') {
        if (drawColorStrip) drawColorStrip.classList.toggle('hidden');
        if (filterStrip) filterStrip.classList.add('hidden');
      } else if (tool === 'filter') {
        if (filterStrip) filterStrip.classList.toggle('hidden');
        if (drawColorStrip) drawColorStrip.classList.add('hidden');
      }
    };
  });

  document.querySelectorAll('.editor-color-btn').forEach(btn => {
    btn.onclick = () => {
      drawColor = btn.getAttribute('data-color');
      document.querySelectorAll('.editor-color-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    };
  });

  if (editorCancelBtn && imageEditorOverlay) {
    editorCancelBtn.onclick = () => {
      imageEditorOverlay.classList.add('hidden');
      currentSelectedFile = null;
    };
  }

  if (editorSendBtn && imageEditorOverlay) {
    editorSendBtn.onclick = async () => {
      imageEditorOverlay.classList.add('hidden');
      if (imageCanvas && drawCanvas) {
        // Merge imageCanvas and drawCanvas
        const finalCanvas = document.createElement('canvas');
        finalCanvas.width = imageCanvas.width;
        finalCanvas.height = imageCanvas.height;
        const ctx = finalCanvas.getContext('2d');
        ctx.drawImage(imageCanvas, 0, 0);
        ctx.drawImage(drawCanvas, 0, 0);

        finalCanvas.toBlob(async (blob) => {
          const editedFile = new File([blob], 'edited_photo.png', { type: 'image/png' });
          await uploadAndSendFile(editedFile);
        });
      }
    };
  }

  // --- 7. VOICE NOTES RECORDING ENGINE ---
  if (micBtn) {
    micBtn.onclick = async () => {
      if (!mediaRecorder || mediaRecorder.state === 'inactive') {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          mediaRecorder = new MediaRecorder(stream);
          audioChunks = [];

          mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
          mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            const voiceFile = new File([audioBlob], 'voice_note.webm', { type: 'audio/webm' });
            await uploadAndSendFile(voiceFile);
          };

          mediaRecorder.start();
          if (recordingBar) recordingBar.classList.remove('hidden');
          let seconds = 0;
          recordInterval = setInterval(() => {
            seconds++;
            if (recordingTimer) recordingTimer.textContent = `0:${seconds < 10 ? '0' : ''}${seconds}`;
          }, 1000);
        } catch (err) { alert('Mic permission zaroori hai voice record karne ke liye'); }
      } else {
        mediaRecorder.stop();
        clearInterval(recordInterval);
        if (recordingBar) recordingBar.classList.add('hidden');
      }
    };
  }

  // --- 8. LOCATION & CONTACT SHARING ---
  if (locationBtn) {
    locationBtn.onclick = () => {
      if (attachMenu) attachMenu.classList.add('hidden');
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
          sendTextMessage(`📍 My Location: https://maps.google.com/?q=${pos.coords.latitude},${pos.coords.longitude}`);
        }, () => alert('Location access nahi mila'));
      }
    };
  }

  if (contactBtn) {
    contactBtn.onclick = () => {
      if (attachMenu) attachMenu.classList.add('hidden');
      const modal = document.getElementById('contactFormModal');
      if (modal) modal.classList.remove('hidden');
    };
  }

  const contactFormCancel = document.getElementById('contactFormCancel');
  const contactFormSend = document.getElementById('contactFormSend');
  if (contactFormCancel) {
    contactFormCancel.onclick = () => document.getElementById('contactFormModal').classList.add('hidden');
  }
  if (contactFormSend) {
    contactFormSend.onclick = () => {
      const name = document.getElementById('contactNameInput').value.trim();
      const phone = document.getElementById('contactPhoneInput').value.trim();
      if (name && phone) {
        sendTextMessage(`👤 Contact: ${name} (${phone})`);
        document.getElementById('contactFormModal').classList.add('hidden');
      }
    };
  }

  // --- 9. UPLOAD & SEND LOGIC ---
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
    } catch (e) { alert('File send nahi ho paayi'); }
  }

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
    } else if (msg.type === 'audio' && msg.mediaUrl) {
      const audio = document.createElement('audio');
      audio.src = msg.mediaUrl;
      audio.controls = true;
      audio.style.cssText = 'max-width: 100%; margin-top: 4px;';
      msgCard.appendChild(audio);
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

  // --- 10. WALLPAPER, THEME PICKERS & CALL OVERLAYS ---
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

  document.querySelectorAll('.wallpaper-opt').forEach(btn => {
    btn.onclick = () => {
      const bg = btn.style.background;
      if (messagesDiv) messagesDiv.style.background = bg;
      localStorage.setItem('chatWallpaper', bg);
      if (wallpaperPicker) wallpaperPicker.classList.add('hidden');
    };
  });

  const savedBg = localStorage.getItem('chatWallpaper');
  if (savedBg && messagesDiv) messagesDiv.style.background = savedBg;

  document.querySelectorAll('.theme-opt').forEach(btn => {
    btn.onclick = () => {
      const theme = btn.getAttribute('data-theme');
      document.body.setAttribute('data-theme', theme);
      if (themePicker) themePicker.classList.add('hidden');
    };
  });

  if (videoCallBtn) videoCallBtn.onclick = () => { if (activeCallOverlay) activeCallOverlay.classList.remove('hidden'); };
  if (audioCallBtn) audioCallBtn.onclick = () => { if (activeCallOverlay) activeCallOverlay.classList.remove('hidden'); };
  if (endCallBtn) endCallBtn.onclick = () => { if (activeCallOverlay) activeCallOverlay.classList.add('hidden'); };

  // Resume Existing Session
  if (currentToken && myUsername) {
    initChatSession();
  }
});
