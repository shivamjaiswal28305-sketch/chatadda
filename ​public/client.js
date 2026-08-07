// ==================== AUTH (apna login/signup — Firebase hata diya) ====================
const socket = io();

const joinScreen = document.getElementById('joinScreen');
const chatScreen = document.getElementById('chatScreen');
const loginTabBtn = document.getElementById('loginTabBtn');
const signupTabBtn = document.getElementById('signupTabBtn');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const authError = document.getElementById('authError');
const logoutBtn = document.getElementById('logoutBtn');
const themeToggleBtn = document.getElementById('themeToggleBtn');

const messagesEl = document.getElementById('messages');
const messageForm = document.getElementById('messageForm');
const messageInput = document.getElementById('messageInput');
const userListEl = document.getElementById('userList');
const typingIndicator = document.getElementById('typingIndicator');
const menuBtn = document.getElementById('menuBtn');
const sidebar = document.querySelector('.sidebar');
const publicRoomBtn = document.getElementById('publicRoomBtn');
const headerTitle = document.getElementById('headerTitle');
const chatActions = document.getElementById('chatActions');
const blockBtn = document.getElementById('blockBtn');
const reportBtn = document.getElementById('reportBtn');
const attachBtn = document.getElementById('attachBtn');
const fileInput = document.getElementById('fileInput');
const locationBtn = document.getElementById('locationBtn');
const wallpaperBtn = document.getElementById('wallpaperBtn');
const wallpaperPicker = document.getElementById('wallpaperPicker');
const searchPhoneInput = document.getElementById('searchPhoneInput');
const searchPhoneBtn = document.getElementById('searchPhoneBtn');
const searchResult = document.getElementById('searchResult');
const sidebarBackdrop = document.getElementById('sidebarBackdrop');
const savedContactsSection = document.getElementById('savedContactsSection');
const savedContactsList = document.getElementById('savedContactsList');
const myAvatarBtn = document.getElementById('myAvatarBtn');
const avatarFileInput = document.getElementById('avatarFileInput');
const headerAvatar = document.getElementById('headerAvatar');
const headerSubtitle = document.getElementById('headerSubtitle');

// ==================== WALLPAPER ====================
function getWallpaperKey(chat) { return `chatadda_wallpaper_${chat}`; }

function applyWallpaper(chat) {
  if (!chat) return;
  const saved = localStorage.getItem(getWallpaperKey(chat)) || 'default';
  messagesEl.className = 'messages' + (saved !== 'default' ? ` wallpaper-${saved}` : '');
  wallpaperPicker.querySelectorAll('.wallpaper-opt').forEach((btn) => {
    btn.classList.toggle('selected', btn.dataset.wallpaper === saved);
  });
}

wallpaperBtn.addEventListener('click', () => {
  wallpaperPicker.classList.toggle('hidden');
});

wallpaperPicker.querySelectorAll('.wallpaper-opt').forEach((btn) => {
  btn.addEventListener('click', () => {
    if (!currentChat) return;
    localStorage.setItem(getWallpaperKey(currentChat), btn.dataset.wallpaper);
    applyWallpaper(currentChat);
    wallpaperPicker.classList.add('hidden');
  });
});

function getInitials(name) {
  if (!name) return '?';
  return name.trim().charAt(0).toUpperCase();
}

// ==================== DARK MODE ====================
function applyTheme() {
  const isDark = localStorage.getItem('chatadda_theme') === 'dark';
  document.body.classList.toggle('dark-mode', isDark);
  themeToggleBtn.textContent = isDark ? '☀️' : '🌙';
}
themeToggleBtn.addEventListener('click', () => {
  const isDark = document.body.classList.contains('dark-mode');
  localStorage.setItem('chatadda_theme', isDark ? 'light' : 'dark');
  applyTheme();
});
applyTheme();

// ==================== SAVED CONTACTS (localStorage) ====================
function getContacts() {
  return JSON.parse(localStorage.getItem('chatadda_contacts') || '[]');
}
function saveContactLocal(username) {
  if (!username) return;
  const list = getContacts();
  if (!list.includes(username)) {
    list.push(username);
    localStorage.setItem('chatadda_contacts', JSON.stringify(list));
  }
  renderSavedContacts();
}
function removeContactLocal(username) {
  const list = getContacts().filter((u) => u !== username);
  localStorage.setItem('chatadda_contacts', JSON.stringify(list));
  renderSavedContacts();
}
function renderSavedContacts() {
  const list = getContacts();
  savedContactsList.innerHTML = '';
  if (!list.length) {
    savedContactsSection.classList.add('hidden');
    return;
  }
  savedContactsSection.classList.remove('hidden');
  list.forEach((u) => {
    const li = document.createElement('li');
    li.className = currentChat === u ? 'active-chat' : '';
    li.innerHTML = getAvatarHtml(u);
    const nameSpan = document.createElement('span');
    nameSpan.className = 'uname';
    nameSpan.textContent = u;
    li.appendChild(nameSpan);
    const rmBtn = document.createElement('button');
    rmBtn.className = 'contact-remove-btn';
    rmBtn.title = 'Contact hatao';
    rmBtn.textContent = '✕';
    rmBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      removeContactLocal(u);
    });
    li.appendChild(rmBtn);
    li.addEventListener('click', () => switchToChat(u));
    savedContactsList.appendChild(li);
  });
}

// ==================== MESSAGE EDIT / DELETE FOR EVERYONE (server-synced) ====================
function deleteMessageEveryone(data) {
  if (!data._id) { showToast('Ye purana message delete nahi ho sakta'); return; }
  if (!confirm('Ye message SABKE liye delete karna hai?')) return;
  socket.emit('deleteMessageForEveryone', { messageId: data._id });
  data.deleted = true;
  data.text = '';
  data.mediaUrl = '';
  data.mediaName = '';
  renderMessages();
}

function editMessageInline(data) {
  if (!data._id) { showToast('Ye purana message edit nahi ho sakta'); return; }
  const newText = window.prompt('Message edit karo:', data.text || '');
  if (newText === null) return;
  const trimmed = newText.trim();
  if (!trimmed || trimmed === data.text) return;
  socket.emit('editMessage', { messageId: data._id, newText: trimmed });
  data.text = trimmed;
  data.edited = true;
  renderMessages();
}

function conversationListForRoom(room) {
  if (room === 'public') return conversations.public;
  const other = room.split('__').find((u) => u !== myUsername);
  return other ? conversations[other] : null;
}
function isCurrentChatForRoom(room) {
  if (room === 'public') return currentChat === 'public';
  const other = room.split('__').find((u) => u !== myUsername);
  return currentChat === other;
}

socket.on('messageDeleted', ({ messageId, room }) => {
  const list = conversationListForRoom(room);
  if (!list) return;
  const msg = list.find((m) => String(m._id) === String(messageId));
  if (msg) { msg.deleted = true; msg.text = ''; msg.mediaUrl = ''; msg.mediaName = ''; }
  if (isCurrentChatForRoom(room)) renderMessages();
});

socket.on('messageEdited', ({ messageId, room, newText }) => {
  const list = conversationListForRoom(room);
  if (!list) return;
  const msg = list.find((m) => String(m._id) === String(messageId));
  if (msg) { msg.text = newText; msg.edited = true; }
  if (isCurrentChatForRoom(room)) renderMessages();
});

// ==================== PROFILE PHOTO (DP) + PRESENCE (online / last seen) ====================
let presenceMap = {}; // username -> { isOnline, lastSeen, photoUrl }

function getAvatarHtml(username) {
  const p = presenceMap[username];
  if (p && p.photoUrl) {
    return `<img src="${p.photoUrl}" class="mini-avatar" alt="${escapeHtml(username)}">`;
  }
  return `<span class="mini-avatar mini-avatar-initial">${getInitials(username)}</span>`;
}

function setMyAvatar(url) {
  if (url) {
    myAvatarBtn.innerHTML = `<img src="${url}" alt="Mera DP">`;
  } else {
    myAvatarBtn.innerHTML = `<span id="myAvatarInitial">${getInitials(myUsername)}</span>`;
  }
}

async function loadAllUsersPresence() {
  try {
    const res = await fetch('/api/users');
    const list = await res.json();
    list.forEach((u) => {
      presenceMap[u.username] = { isOnline: u.isOnline, lastSeen: u.lastSeen, photoUrl: u.photoUrl || '' };
    });
    if (presenceMap[myUsername]) setMyAvatar(presenceMap[myUsername].photoUrl);
    renderUserList();
    renderSavedContacts();
    if (currentChat && currentChat !== 'public') updateHeaderPresence();
  } catch (err) { /* ignore */ }
}

myAvatarBtn.addEventListener('click', () => avatarFileInput.click());
avatarFileInput.addEventListener('change', async () => {
  const file = avatarFileInput.files[0];
  if (!file) return;
  const formData = new FormData();
  formData.append('file', file);
  showToast('DP upload ho raha hai...');
  try {
    const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
    const uploadData = await uploadRes.json();
    if (!uploadRes.ok) { showToast(uploadData.error || 'Upload fail hua'); avatarFileInput.value = ''; return; }

    const res = await fetch('/api/users/photo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
      body: JSON.stringify({ photoUrl: uploadData.url })
    });
    const data = await res.json();
    if (!res.ok) { showToast(data.error || 'DP update fail hua'); avatarFileInput.value = ''; return; }

    setMyAvatar(data.photoUrl);
    presenceMap[myUsername] = { ...(presenceMap[myUsername] || {}), photoUrl: data.photoUrl };
    showToast('DP update ho gaya!');
  } catch (err) {
    showToast('DP update fail hua');
  }
  avatarFileInput.value = '';
});

function formatLastSeen(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  if (d.toDateString() === now.toDateString()) return `aaj ${time}`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return `kal ${time}`;
  return `${d.toLocaleDateString('en-IN')} ${time}`;
}

function updateHeaderPresence() {
  if (!currentChat || currentChat === 'public') {
    headerSubtitle.textContent = '';
    headerSubtitle.classList.remove('online');
    return;
  }
  const p = presenceMap[currentChat];
  if (p && p.isOnline) {
    headerSubtitle.textContent = 'Online';
    headerSubtitle.classList.add('online');
  } else {
    headerSubtitle.textContent = p && p.lastSeen ? `Last seen ${formatLastSeen(p.lastSeen)}` : '';
    headerSubtitle.classList.remove('online');
  }
}

socket.on('presenceUpdate', ({ username, isOnline, lastSeen, photoUrl }) => {
  presenceMap[username] = {
    ...(presenceMap[username] || {}),
    isOnline,
    lastSeen,
    ...(photoUrl !== undefined ? { photoUrl } : {})
  };
  if (username === myUsername && photoUrl !== undefined) setMyAvatar(photoUrl);
  renderUserList();
  renderSavedContacts();
  if (currentChat === username) updateHeaderPresence();
});

let myUsername = '';
let currentChat = null; // null = koi chat select nahi hui abhi
let onlineUsernames = []; // sirf Adda Room ke andar wale log
const conversations = { public: [] };
let blockedUsers = new Set(JSON.parse(localStorage.getItem('chatadda_blocked') || '[]'));

function saveBlocked() {
  localStorage.setItem('chatadda_blocked', JSON.stringify([...blockedUsers]));
}

function getToken() { return localStorage.getItem('chatadda_token'); }
function setToken(t) { localStorage.setItem('chatadda_token', t); }
function clearToken() { localStorage.removeItem('chatadda_token'); }

// ---- Tab switching (Login / Signup) ----
loginTabBtn.addEventListener('click', () => {
  loginTabBtn.classList.add('active');
  signupTabBtn.classList.remove('active');
  loginForm.classList.remove('hidden');
  signupForm.classList.add('hidden');
  authError.classList.add('hidden');
});
signupTabBtn.addEventListener('click', () => {
  signupTabBtn.classList.add('active');
  loginTabBtn.classList.remove('active');
  signupForm.classList.remove('hidden');
  loginForm.classList.add('hidden');
  authError.classList.add('hidden');
});

function showAuthError(msg) {
  authError.textContent = msg;
  authError.classList.remove('hidden');
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const phone = document.getElementById('loginPhone').value.trim();
  const password = document.getElementById('loginPassword').value;
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, password })
    });
    const data = await res.json();
    if (!res.ok) return showAuthError(data.error || 'Login fail hua');
    setToken(data.token);
    startSession();
  } catch (err) {
    showAuthError('Network error — dobara try karo');
  }
});

signupForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('signupUsername').value.trim();
  const phone = document.getElementById('signupPhone').value.trim();
  const password = document.getElementById('signupPassword').value;
  try {
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, phone, password })
    });
    const data = await res.json();
    if (!res.ok) return showAuthError(data.error || 'Signup fail hua');
    setToken(data.token);
    startSession();
  } catch (err) {
    showAuthError('Network error — dobara try karo');
  }
});

logoutBtn.addEventListener('click', () => {
  clearToken();
  location.reload();
});

function startSession() {
  const token = getToken();
  if (!token) return;
  if (socket.connected) {
    socket.emit('join', token);
  }
}

socket.on('connect', () => {
  const token = getToken();
  if (token) socket.emit('join', token);
});

socket.on('authError', (msg) => {
  clearToken();
  showAuthError(msg);
  chatScreen.classList.add('hidden');
  joinScreen.classList.remove('hidden');
});

socket.on('disconnect', () => {
  if (myUsername) showToast('Connection toota — dobara jodne ki koshish ho rahi hai...');
});

// ---- Login/signup hone ke baad: SILENT — koi bhi turant "online" nahi dikhta ----
socket.on('joined', (finalName) => {
  myUsername = finalName;
  joinScreen.classList.add('hidden');
  chatScreen.classList.remove('hidden');
  showEmptyState();
  renderSavedContacts();
  loadAllUsersPresence();
});

function showEmptyState() {
  currentChat = null;
  publicRoomBtn.classList.remove('active');
  headerTitle.textContent = 'ChatAdda';
  chatActions.classList.add('hidden');
  messageForm.classList.add('hidden');
  messagesEl.className = 'messages';
  messagesEl.innerHTML = '<div class="empty-state">👋 Kisi chat pe ya Adda Room pe tap karo shuru karne ke liye</div>';
}

// Agar page load pe token already hai to seedha connect hone do (auto-login)
if (getToken()) {
  // socket 'connect' event apne aap fire hoga aur join ho jayega
}

// ==================== HISTORY LOADING ====================
async function loadHistory(room) {
  try {
    const res = await fetch(`/api/messages/${encodeURIComponent(room)}`);
    const msgs = await res.json();
    if (room === 'public') {
      conversations.public = msgs.map(m => ({
        _id: m._id, username: m.fromUsername, type: m.type, text: m.text,
        mediaUrl: m.mediaUrl, mediaName: m.mediaName, location: m.location,
        deleted: !!m.deleted, edited: !!m.edited, reactions: m.reactions || [],
        time: new Date(m.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
      }));
      conversations.public._loaded = true;
      if (currentChat === 'public') renderMessages();
    }
  } catch (err) {
    console.error('History load error:', err);
  }
}

// ==================== USER LIST (sirf Adda Room ke andar wale) ====================
socket.on('userList', (users) => {
  onlineUsernames = users;
  renderUserList();
});

function renderUserList() {
  userListEl.innerHTML = '';
  onlineUsernames
    .filter((u) => u !== myUsername)
    .forEach((u) => {
      if (!conversations[u]) conversations[u] = [];
      const li = document.createElement('li');
      const isBlocked = blockedUsers.has(u);
      li.className = (currentChat === u ? 'active-chat' : '') + (isBlocked ? ' blocked' : '');
      li.innerHTML = `${getAvatarHtml(u)}<span class="uname">${escapeHtml(u)}</span>${isBlocked ? '<span class="block-tag">Blocked</span>' : ''}`;
      li.addEventListener('click', () => switchToChat(u));
      userListEl.appendChild(li);
    });
}

async function switchToChat(target) {
  // Adda Room se bahar jaate waqt presence hata do
  if (currentChat === 'public' && target !== 'public') {
    socket.emit('leavePublicRoom');
  }

  currentChat = target;
  messageForm.classList.remove('hidden');
  publicRoomBtn.classList.toggle('active', target === 'public');
  headerTitle.textContent = target === 'public' ? 'Adda Room' : target;
  chatActions.classList.toggle('hidden', target === 'public');

  if (target === 'public') {
    headerAvatar.classList.add('hidden');
  } else {
    const p = presenceMap[target];
    if (p && p.photoUrl) {
      headerAvatar.src = p.photoUrl;
      headerAvatar.classList.remove('hidden');
    } else {
      headerAvatar.classList.add('hidden');
    }
  }
  updateHeaderPresence();

  if (target === 'public') {
    socket.emit('enterPublicRoom');
    if (!conversations.public._loaded) {
      await loadHistory('public');
    }
  } else {
    blockBtn.textContent = blockedUsers.has(target) ? '✅ Unblock' : '🚫 Block';
    blockBtn.classList.toggle('blocked-state', blockedUsers.has(target));

    const room = [myUsername, target].sort().join('__');
    if (!conversations[target] || conversations[target]._loaded !== true) {
      try {
        const res = await fetch(`/api/messages/${encodeURIComponent(room)}`);
        const msgs = await res.json();
        conversations[target] = msgs.map(m => ({
          _id: m._id, from: m.fromUsername, to: m.fromUsername === myUsername ? target : myUsername,
          type: m.type, text: m.text, mediaUrl: m.mediaUrl, mediaName: m.mediaName, location: m.location,
          deleted: !!m.deleted, edited: !!m.edited, reactions: m.reactions || [],
          time: new Date(m.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
          read: m.readBy && m.readBy.length > 0
        }));
        conversations[target]._loaded = true;
      } catch (err) { /* ignore */ }
    }
    socket.emit('markRead', { room });
  }
  renderUserList();
  renderMessages();
  applyWallpaper(target);
  wallpaperPicker.classList.add('hidden');
  if (window.innerWidth <= 720) {
    sidebar.classList.remove('open');
    sidebarBackdrop.classList.add('hidden');
  }
  renderSavedContacts();

  // FIX: mobile par auto-focus se keyboard khulta tha aur page scroll ho jaata tha,
  // jisse header viewport se bahar chala jaata tha kuch phones par.
  // Ab sirf desktop/tablet (>720px) par hi auto-focus hoga.
  if (window.innerWidth > 720) {
    messageInput.focus();
  }

  updateCallButtonsVisibility();
}

publicRoomBtn.addEventListener('click', () => switchToChat('public'));

// ==================== PHONE NUMBER SEARCH ====================
searchPhoneBtn.addEventListener('click', doPhoneSearch);
searchPhoneInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); doPhoneSearch(); }
});

async function doPhoneSearch() {
  const phone = searchPhoneInput.value.trim();
  if (!phone) return;
  searchResult.classList.remove('hidden');
  searchResult.innerHTML = '<p class="search-status">Dhoondh rahe hain...</p>';
  try {
    const res = await fetch(`/api/users/search?phone=${encodeURIComponent(phone)}`);
    const data = await res.json();
    if (!res.ok) {
      searchResult.innerHTML = `<p class="search-not-found">${escapeHtml(data.error || 'Nahi mila')}</p>`;
      return;
    }
    if (data.username === myUsername) {
      searchResult.innerHTML = `<p class="search-not-found">Ye to aapka hi number hai 🙂</p>`;
      return;
    }
    searchResult.innerHTML = '';
    const btn = document.createElement('button');
    btn.className = 'search-found-btn';
    btn.textContent = `💬 ${data.username} se chat karo`;
    btn.addEventListener('click', () => {
      searchResult.classList.add('hidden');
      searchPhoneInput.value = '';
      saveContactLocal(data.username);
      switchToChat(data.username);
    });
    searchResult.appendChild(btn);
  } catch (err) {
    searchResult.innerHTML = '<p class="search-not-found">Search fail hua, dobara try karo</p>';
  }
}

// ==================== MESSAGE RENDERING ====================
function renderMessages() {
  messagesEl.innerHTML = '';
  const list = conversations[currentChat] || [];
  list.forEach((data) => appendMessageToDOM(data));
  scrollToBottom();
}

function appendMessageToDOM(data) {
  if (data.system) {
    const div = document.createElement('div');
    div.className = 'msg system';
    div.textContent = data.text;
    messagesEl.appendChild(div);
    return;
  }
  const isPrivate = !!data.from;
  const isMine = (data.username || data.from) === myUsername;
  const div = document.createElement('div');
  div.className = 'msg' + (isMine ? ' mine' : '');
  if (data._id) div.dataset.msgId = String(data._id);

  let bodyHtml = '';
  if (data.deleted) {
    bodyHtml = `<span class="msg-text msg-deleted-text">🚫 Ye message delete kar diya gaya</span>`;
  } else if (data.type === 'image') {
    bodyHtml = `<a href="${data.mediaUrl}" target="_blank"><img src="${data.mediaUrl}" class="msg-image" alt="image"></a>`;
  } else if (data.type === 'document') {
    bodyHtml = `<a href="${data.mediaUrl}" target="_blank" class="msg-doc">📄 ${escapeHtml(data.mediaName || 'Document')}</a>`;
  } else if (data.type === 'location' && data.location) {
    const { lat, lng } = data.location;
    bodyHtml = `<a href="https://www.google.com/maps?q=${lat},${lng}" target="_blank" class="msg-location">📍 Location dekho</a>`;
  } else {
    bodyHtml = `<span class="msg-text">${escapeHtml(data.text)}</span>${data.edited ? '<span class="edited-tag">(edited)</span>' : ''}`;
  }

  const delivered = isMine && isPrivate ? !!(presenceMap[data.to] && presenceMap[data.to].isOnline) : false;
  const ticksHtml = (isMine && isPrivate)
    ? `<span class="msg-ticks${data.read ? ' read' : ''}">${data.read ? '✓✓' : (delivered ? '✓✓' : '✓')}</span>`
    : '';

  div.innerHTML = `
    ${isMine ? '' : `<span class="msg-user">${escapeHtml(data.username || data.from)}</span>`}
    ${bodyHtml}
    <span class="msg-time">${data.time}${ticksHtml}</span>
  `;

  if (!data.deleted) {
    const actions = document.createElement('div');
    actions.className = 'msg-actions';

    const reactBtn = document.createElement('button');
    reactBtn.title = 'React';
    reactBtn.textContent = '😊';
    reactBtn.addEventListener('click', (e) => openReactionPicker(e, data));
    actions.appendChild(reactBtn);

    if (isMine) {
      if (data.type === 'text') {
        const editBtn = document.createElement('button');
        editBtn.title = 'Edit';
        editBtn.textContent = '✏️';
        editBtn.addEventListener('click', () => editMessageInline(data));
        actions.appendChild(editBtn);
      }
      const delBtn = document.createElement('button');
      delBtn.title = 'Delete for Everyone';
      delBtn.textContent = '🗑';
      delBtn.addEventListener('click', () => deleteMessageEveryone(data));
      actions.appendChild(delBtn);
    }
    div.appendChild(actions);
  }

  if (data.reactions && data.reactions.length > 0) {
    div.appendChild(buildReactionsRow(data));
  }

  messagesEl.appendChild(div);
}

// ==================== MESSAGE REACTIONS ====================
const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
let activeReactionPicker = null;

function closeReactionPickerOnOutsideClick(e) {
  if (activeReactionPicker && !activeReactionPicker.contains(e.target)) {
    closeReactionPicker();
  }
}

function closeReactionPicker() {
  if (activeReactionPicker) {
    activeReactionPicker.remove();
    activeReactionPicker = null;
  }
  document.removeEventListener('click', closeReactionPickerOnOutsideClick);
}

function openReactionPicker(event, data) {
  event.stopPropagation();
  closeReactionPicker();
  if (!data._id) { showToast('Ye purana message react nahi ho sakta'); return; }

  const picker = document.createElement('div');
  picker.className = 'reaction-picker';
  REACTION_EMOJIS.forEach((emoji) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = emoji;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      sendReaction(data._id, emoji);
      closeReactionPicker();
    });
    picker.appendChild(btn);
  });

  event.currentTarget.parentElement.appendChild(picker);
  activeReactionPicker = picker;
  setTimeout(() => document.addEventListener('click', closeReactionPickerOnOutsideClick), 0);
}

function sendReaction(messageId, emoji) {
  socket.emit('reactMessage', { messageId, emoji });
}

function buildReactionsRow(data) {
  const row = document.createElement('div');
  row.className = 'reactions-row';
  const counts = {};
  data.reactions.forEach((r) => { counts[r.emoji] = (counts[r.emoji] || 0) + 1; });
  Object.keys(counts).forEach((emoji) => {
    const pill = document.createElement('span');
    pill.className = 'reaction-pill';
    const isMineReaction = data.reactions.some((r) => r.emoji === emoji && r.username === myUsername);
    if (isMineReaction) pill.classList.add('mine-reaction');
    pill.textContent = `${emoji} ${counts[emoji]}`;
    pill.addEventListener('click', () => sendReaction(data._id, emoji));
    row.appendChild(pill);
  });
  return row;
}

function findMessageInConversations(messageId, room) {
  const list = conversationListForRoom(room);
  if (!list) return null;
  return list.find((m) => String(m._id) === String(messageId));
}

socket.on('messageReaction', ({ messageId, room, reactions }) => {
  const msg = findMessageInConversations(messageId, room);
  if (msg) msg.reactions = reactions;
  if (isCurrentChatForRoom(room)) renderMessages();
});

socket.on('system', (text) => {
  conversations.public.push({ system: true, text });
  if (currentChat === 'public') { appendMessageToDOM({ system: true, text }); scrollToBottom(); }
});

socket.on('chatMessage', (data) => {
  if (blockedUsers.has(data.username)) return;
  conversations.public.push(data);
  if (currentChat === 'public') { appendMessageToDOM(data); scrollToBottom(); }
});

socket.on('privateMessage', (data) => {
  const otherParty = data.from === myUsername ? data.to : data.from;
  if (blockedUsers.has(otherParty)) return;
  if (!conversations[otherParty]) conversations[otherParty] = [];
  conversations[otherParty].push(data);
  if (currentChat === otherParty) {
    appendMessageToDOM(data);
    scrollToBottom();
    socket.emit('markRead', { room: [myUsername, otherParty].sort().join('__') });
  }
});

// ---- Read receipts: doosre ne mera message padh liya ----
socket.on('messagesRead', ({ byUsername }) => {
  const conv = conversations[byUsername];
  if (conv) {
    conv.forEach(m => { if (m.from === myUsername) m.read = true; });
  }
  if (currentChat === byUsername) {
    renderMessages();
  }
});

socket.on('typing', (username) => {
  if (currentChat !== 'public' || blockedUsers.has(username)) return;
  showTyping(username);
});
socket.on('privateTyping', (username) => {
  if (currentChat !== username || blockedUsers.has(username)) return;
  showTyping(username);
});
function showTyping(username) {
  typingIndicator.textContent = `${username} likh raha/rahi hai...`;
  clearTimeout(typingIndicator._t);
  typingIndicator._t = setTimeout(() => { typingIndicator.textContent = ''; }, 1500);
}

socket.on('reportReceived', (reportedUsername) => {
  showToast(`Report bhej diya gaya (${reportedUsername})`);
});

// ==================== SEND TEXT ====================
messageForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = messageInput.value.trim();
  if (!text || !currentChat) return;
  sendMessage({ type: 'text', text });
  messageInput.value = '';
});

function sendMessage(payload) {
  if (!currentChat) return;
  if (currentChat === 'public') {
    socket.emit('chatMessage', payload);
  } else {
    if (blockedUsers.has(currentChat)) {
      showToast('Aapne isse block kiya hai. Pehle unblock karo.');
      return;
    }
    socket.emit('privateMessage', { toUsername: currentChat, ...payload });
  }
}

messageInput.addEventListener('input', () => {
  if (!currentChat) return;
  if (currentChat === 'public') socket.emit('typing');
  else socket.emit('privateTyping', currentChat);
});

// ==================== MEDIA UPLOAD (image / document) ====================
attachBtn.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', async () => {
  const file = fileInput.files[0];
  if (!file) return;
  if (file.size > 15 * 1024 * 1024) {
    showToast('File 15MB se badi hai');
    fileInput.value = '';
    return;
  }

  const formData = new FormData();
  formData.append('file', file);

  showToast('Upload ho raha hai...');
  try {
    const res = await fetch('/api/upload', { method: 'POST', body: formData });
    const data = await res.json();
    if (!res.ok) { showToast(data.error || 'Upload fail hua'); return; }
    sendMessage({ type: data.type, mediaUrl: data.url, mediaName: data.name });
  } catch (err) {
    showToast('Upload fail hua');
  }
  fileInput.value = '';
});

// ==================== LOCATION SHARE ====================
locationBtn.addEventListener('click', () => {
  if (!navigator.geolocation) { showToast('Location is browser me support nahi hai'); return; }
  showToast('Location le rahe hain...');
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      sendMessage({ type: 'location', location: { lat: pos.coords.latitude, lng: pos.coords.longitude } });
    },
    () => showToast('Location permission nahi mili'),
    { enableHighAccuracy: true, timeout: 10000 }
  );
});

// ==================== BLOCK / REPORT ====================
blockBtn.addEventListener('click', () => {
  if (currentChat === 'public' || !currentChat) return;
  if (blockedUsers.has(currentChat)) {
    blockedUsers.delete(currentChat);
    showToast(`${currentChat} ko unblock kar diya`);
  } else {
    blockedUsers.add(currentChat);
    showToast(`${currentChat} ko block kar diya`);
  }
  saveBlocked();
  switchToChat(currentChat);
});

reportBtn.addEventListener('click', () => {
  if (currentChat === 'public' || !currentChat) return;
  const reason = window.prompt(`${currentChat} ko report karne ki wajah likho (optional):`, '');
  if (reason === null) return;
  socket.emit('reportUser', { reportedUsername: currentChat, reason });
});

menuBtn.addEventListener('click', () => {
  sidebar.classList.toggle('open');
  sidebarBackdrop.classList.toggle('hidden');
});
sidebarBackdrop.addEventListener('click', () => {
  sidebar.classList.remove('open');
  sidebarBackdrop.classList.add('hidden');
});

function scrollToBottom() { messagesEl.scrollTop = messagesEl.scrollHeight; }
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}
function showToast(text) {
  const div = document.createElement('div');
  div.className = 'toast';
  div.textContent = text;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 2500);
}

// ==================== AUDIO / VIDEO CALLING (WebRTC) — UNCHANGED ====================
const audioCallBtn = document.getElementById('audioCallBtn');
const videoCallBtn = document.getElementById('videoCallBtn');
const incomingCallModal = document.getElementById('incomingCallModal');
const incomingCallText = document.getElementById('incomingCallText');
const incomingCallType = document.getElementById('incomingCallType');
const acceptCallBtn = document.getElementById('acceptCallBtn');
const rejectCallBtn = document.getElementById('rejectCallBtn');
const activeCallOverlay = document.getElementById('activeCallOverlay');
const remoteVideo = document.getElementById('remoteVideo');
const localVideo = document.getElementById('localVideo');
const videoGrid = document.getElementById('videoGrid');
const audioCallVisual = document.getElementById('audioCallVisual');
const callWithName = document.getElementById('callWithName');
const callTimer = document.getElementById('callTimer');
const toggleMicBtn = document.getElementById('toggleMicBtn');
const toggleCamBtn = document.getElementById('toggleCamBtn');
const switchCallTypeBtn = document.getElementById('switchCallTypeBtn');
const endCallBtn = document.getElementById('endCallBtn');
const incomingAvatarInitial = document.getElementById('incomingAvatarInitial');
const audioAvatarInitial = document.getElementById('audioAvatarInitial');
const filterBar = document.getElementById('filterBar');
const filterCanvas = document.getElementById('filterCanvas');
const filterCtx = filterCanvas.getContext('2d');

const rtcConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' }
  ]
};

let peerConnection = null;
let rawLocalStream = null;
let localStream = null;
let currentCallWith = null;
let currentCallType = null;
let callTimerInterval = null;
let callSeconds = 0;
let pendingIncomingOffer = null;
let micOn = true;
let camOn = true;
let callConnected = false;
let ringTimeout = null;
let disconnectGraceTimeout = null;

const FILTERS = {
  none: 'none',
  clarendon: 'contrast(1.2) saturate(1.35) brightness(1.05)',
  juno: 'sepia(0.15) saturate(1.4) contrast(1.1) brightness(1.05)',
  lark: 'brightness(1.1) saturate(1.1) contrast(0.95)',
  gingham: 'brightness(1.05) sepia(0.1) contrast(0.9) saturate(0.85)',
  moon: 'grayscale(1) contrast(1.1) brightness(1.05)'
};
let currentFilter = 'none';
let filterRAF = null;
const hiddenSourceVideo = document.createElement('video');
hiddenSourceVideo.muted = true;
hiddenSourceVideo.playsInline = true;

function startFilterProcessing(rawStream) {
  hiddenSourceVideo.srcObject = rawStream;
  hiddenSourceVideo.play().catch(() => {});
  filterCanvas.width = 480;
  filterCanvas.height = 640;
  function drawFrame() {
    if (camOn && hiddenSourceVideo.readyState >= 2) {
      filterCtx.filter = FILTERS[currentFilter] || 'none';
      filterCtx.drawImage(hiddenSourceVideo, 0, 0, filterCanvas.width, filterCanvas.height);
    } else {
      filterCtx.filter = 'none';
      filterCtx.fillStyle = '#000';
      filterCtx.fillRect(0, 0, filterCanvas.width, filterCanvas.height);
    }
    filterRAF = requestAnimationFrame(drawFrame);
  }
  drawFrame();
  const canvasStream = filterCanvas.captureStream(30);
  const audioTrack = rawStream.getAudioTracks()[0];
  if (audioTrack) canvasStream.addTrack(audioTrack);
  return canvasStream;
}
function stopFilterProcessing() {
  if (filterRAF) cancelAnimationFrame(filterRAF);
  filterRAF = null;
  hiddenSourceVideo.srcObject = null;
}
filterBar.querySelectorAll('.filter-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    currentFilter = btn.dataset.filter;
    filterBar.querySelectorAll('.filter-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

function updateCallButtonsVisibility() {
  const showButtons = currentChat && currentChat !== 'public' && !blockedUsers.has(currentChat);
  audioCallBtn.classList.toggle('hidden', !showButtons);
  videoCallBtn.classList.toggle('hidden', !showButtons);
}

audioCallBtn.addEventListener('click', () => startCall('audio'));
videoCallBtn.addEventListener('click', () => startCall('video'));

async function startCall(type) {
  if (currentChat === 'public' || !currentChat) return;
  if (peerConnection) { showToast('Aap pehle se call me ho.'); return; }
  currentCallWith = currentChat;
  currentCallType = type;
  callConnected = false;
  try {
    rawLocalStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === 'video' });
  } catch (err) {
    showToast('Camera/mic access nahi mila. Permission check karo.');
    currentCallWith = null;
    return;
  }
  localStream = type === 'video' ? startFilterProcessing(rawLocalStream) : rawLocalStream;
  setupPeerConnection();
  localStream.getTracks().forEach((track) => peerConnection.addTrack(track, localStream));
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  socket.emit('callOffer', { toUsername: currentCallWith, offer, callType: type });
  showToast(`${currentCallWith} ko call kiya jaa raha hai...`);
  clearTimeout(ringTimeout);
  ringTimeout = setTimeout(() => {
    if (peerConnection && !callConnected) {
      showToast(`${currentCallWith} ne call receive nahi kiya`);
      endCall(true);
    }
  }, 30000);
}

function setupPeerConnection() {
  peerConnection = new RTCPeerConnection(rtcConfig);
  peerConnection.onicecandidate = (event) => {
    if (event.candidate && currentCallWith) {
      socket.emit('iceCandidate', { toUsername: currentCallWith, candidate: event.candidate });
    }
  };
  peerConnection.ontrack = (event) => {
    remoteVideo.srcObject = event.streams[0];
    callConnected = true;
    clearTimeout(ringTimeout);
  };
  peerConnection.onconnectionstatechange = () => {
    const state = peerConnection.connectionState;
    if (state === 'connected') {
      callConnected = true;
      clearTimeout(ringTimeout);
      clearTimeout(disconnectGraceTimeout);
    } else if (state === 'disconnected') {
      clearTimeout(disconnectGraceTimeout);
      disconnectGraceTimeout = setTimeout(() => {
        if (peerConnection && peerConnection.connectionState === 'disconnected') endCall(false);
      }, 6000);
    } else if (['failed', 'closed'].includes(state)) {
      endCall(false);
    }
  };
}

socket.on('callOffer', ({ fromUsername, offer, callType }) => {
  if (peerConnection || pendingIncomingOffer) {
    socket.emit('callReject', { toUsername: fromUsername });
    return;
  }
  pendingIncomingOffer = { fromUsername, offer, callType };
  incomingAvatarInitial.textContent = getInitials(fromUsername);
  incomingCallText.textContent = `${fromUsername}`;
  incomingCallType.textContent = callType === 'video' ? '📹 Video Call aa rahi hai' : '📞 Audio Call aa rahi hai';
  incomingCallModal.classList.remove('hidden');
});

acceptCallBtn.addEventListener('click', async () => {
  if (!pendingIncomingOffer) return;
  const { fromUsername, offer, callType } = pendingIncomingOffer;
  incomingCallModal.classList.add('hidden');
  currentCallWith = fromUsername;
  currentCallType = callType;
  callConnected = false;
  try {
    rawLocalStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: callType === 'video' });
  } catch (err) {
    showToast('Camera/mic access nahi mila.');
    socket.emit('callReject', { toUsername: fromUsername });
    pendingIncomingOffer = null;
    return;
  }
  localStream = callType === 'video' ? startFilterProcessing(rawLocalStream) : rawLocalStream;
  setupPeerConnection();
  localStream.getTracks().forEach((track) => peerConnection.addTrack(track, localStream));
  await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  socket.emit('callAnswer', { toUsername: fromUsername, answer });
  pendingIncomingOffer = null;
  openCallUI();
});

rejectCallBtn.addEventListener('click', () => {
  if (pendingIncomingOffer) socket.emit('callReject', { toUsername: pendingIncomingOffer.fromUsername });
  pendingIncomingOffer = null;
  incomingCallModal.classList.add('hidden');
});

socket.on('callAnswer', async ({ answer }) => {
  if (!peerConnection) return;
  await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
  openCallUI();
});

socket.on('iceCandidate', async ({ candidate }) => {
  if (peerConnection && candidate) {
    try { await peerConnection.addIceCandidate(new RTCIceCandidate(candidate)); }
    catch (e) { console.error('ICE candidate error', e); }
  }
});

socket.on('callReject', ({ fromUsername }) => {
  if (currentCallWith === fromUsername) { showToast(`${fromUsername} ne call reject kar di`); cleanupCall(); }
});
socket.on('callEnd', ({ fromUsername }) => {
  if (currentCallWith === fromUsername) { showToast(`Call khatam ho gayi`); cleanupCall(); }
});
socket.on('callFailed', ({ toUsername }) => {
  showToast(`${toUsername} is waqt online nahi hai`);
  cleanupCall();
});

function updateCallTypeUI() {
  if (currentCallType === 'video') {
    videoGrid.classList.remove('hidden');
    audioCallVisual.classList.add('hidden');
    filterBar.classList.remove('hidden');
    toggleCamBtn.classList.remove('hidden');
    switchCallTypeBtn.textContent = '📞';
    switchCallTypeBtn.title = 'Audio call pe switch karo';
    if (localStream) localVideo.srcObject = localStream;
  } else {
    videoGrid.classList.add('hidden');
    audioCallVisual.classList.remove('hidden');
    filterBar.classList.add('hidden');
    toggleCamBtn.classList.add('hidden');
    switchCallTypeBtn.textContent = '📹';
    switchCallTypeBtn.title = 'Video call pe switch karo';
    audioAvatarInitial.textContent = getInitials(currentCallWith);
  }
}

function openCallUI() {
  activeCallOverlay.classList.remove('hidden');
  callWithName.textContent = currentCallWith;
  updateCallTypeUI();
  callSeconds = 0;
  callTimer.textContent = '00:00';
  callTimerInterval = setInterval(() => {
    callSeconds++;
    const mins = String(Math.floor(callSeconds / 60)).padStart(2, '0');
    const secs = String(callSeconds % 60).padStart(2, '0');
    callTimer.textContent = `${mins}:${secs}`;
  }, 1000);
}

function endCall(notifyServer = true) {
  if (notifyServer && currentCallWith) socket.emit('callEnd', { toUsername: currentCallWith });
  cleanupCall();
}

function cleanupCall() {
  clearTimeout(ringTimeout);
  clearTimeout(disconnectGraceTimeout);
  if (peerConnection) { peerConnection.close(); peerConnection = null; }
  stopFilterProcessing();
  if (rawLocalStream) { rawLocalStream.getTracks().forEach((t) => t.stop()); rawLocalStream = null; }
  localStream = null;
  remoteVideo.srcObject = null;
  localVideo.srcObject = null;
  activeCallOverlay.classList.add('hidden');
  incomingCallModal.classList.add('hidden');
  clearInterval(callTimerInterval);
  callTimerInterval = null;
  currentCallWith = null;
  currentCallType = null;
  callConnected = false;
  micOn = true;
  camOn = true;
  currentFilter = 'none';
  filterBar.querySelectorAll('.filter-btn').forEach((b) => b.classList.remove('active'));
  filterBar.querySelector('[data-filter="none"]').classList.add('active');
  toggleMicBtn.textContent = '🎤';
  toggleMicBtn.classList.remove('muted');
  toggleCamBtn.textContent = '📹';
  toggleCamBtn.classList.remove('muted');
}

switchCallTypeBtn.addEventListener('click', async () => {
  if (!peerConnection || !currentCallWith) return;
  const goingToVideo = currentCallType !== 'video';

  try {
    if (goingToVideo) {
      const camStream = await navigator.mediaDevices.getUserMedia({ video: true });
      const videoTrack = camStream.getVideoTracks()[0];
      rawLocalStream = rawLocalStream || camStream;
      if (!rawLocalStream.getVideoTracks().length) {
        rawLocalStream.addTrack(videoTrack);
      }
      const sender = peerConnection.getSenders().find((s) => s.track && s.track.kind === 'video');
      if (sender) sender.replaceTrack(videoTrack);
      else peerConnection.addTrack(videoTrack, rawLocalStream);
      localStream = rawLocalStream;
      currentCallType = 'video';
    } else {
      const videoSender = peerConnection.getSenders().find((s) => s.track && s.track.kind === 'video');
      if (videoSender && videoSender.track) videoSender.track.stop();
      if (videoSender) peerConnection.removeTrack(videoSender);
      currentCallType = 'audio';
    }

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit('callTypeSwitch', { toUsername: currentCallWith, offer, newType: currentCallType });
    updateCallTypeUI();
  } catch (err) {
    showToast('Camera switch nahi ho paya. Permission check karo.');
  }
});

socket.on('callTypeSwitch', async ({ fromUsername, offer, newType }) => {
  if (!peerConnection || currentCallWith !== fromUsername) return;
  await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  socket.emit('callTypeSwitchAnswer', { toUsername: fromUsername, answer });
  currentCallType = newType;
  updateCallTypeUI();
});

socket.on('callTypeSwitchAnswer', async ({ answer }) => {
  if (!peerConnection) return;
  await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
});

endCallBtn.addEventListener('click', () => endCall(true));
toggleMicBtn.addEventListener('click', () => {
  if (!rawLocalStream) return;
  micOn = !micOn;
  rawLocalStream.getAudioTracks().forEach((t) => (t.enabled = micOn));
  toggleMicBtn.textContent = micOn ? '🎤' : '🔇';
  toggleMicBtn.classList.toggle('muted', !micOn);
});
toggleCamBtn.addEventListener('click', () => {
  if (currentCallType !== 'video') return;
  camOn = !camOn;
  toggleCamBtn.textContent = camOn ? '📹' : '🚫';
  toggleCamBtn.classList.toggle('muted', !camOn);
});

updateCallButtonsVisibility();

// FIX: keyboard band hone ke baad kabhi kabhi page scroll position gadbad reh jaati hai
// (kuch Android phones par), jisse header viewport se bahar chala jaata hai.
// Visual viewport resize hone par (jaise keyboard band hote waqt) scroll reset kar do.
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', () => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  });
}
