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
const micBtn = document.getElementById('micBtn');
const sendBtn = document.getElementById('sendBtn');
const plusBtn = document.getElementById('plusBtn');
const attachMenu = document.getElementById('attachMenu');
const recordingBar = document.getElementById('recordingBar');
const recordingTimer = document.getElementById('recordingTimer');
const contactBtn = document.getElementById('contactBtn');
const contactFormModal = document.getElementById('contactFormModal');
const contactNameInput = document.getElementById('contactNameInput');
const contactPhoneInput = document.getElementById('contactPhoneInput');
const replyPreviewBar = document.getElementById('replyPreviewBar');
const replyPreviewLabel = document.getElementById('replyPreviewLabel');
const replyPreviewText = document.getElementById('replyPreviewText');
const cancelReplyBtn = document.getElementById('cancelReplyBtn');
const forwardModal = document.getElementById('forwardModal');
const forwardTargetList = document.getElementById('forwardTargetList');
const forwardModalCancel = document.getElementById('forwardModalCancel');
const pinnedBanner = document.getElementById('pinnedBanner');
const pinnedBannerText = document.getElementById('pinnedBannerText');
const unpinBtn = document.getElementById('unpinBtn');
const searchToggleBtn = document.getElementById('searchToggleBtn');
const searchBar = document.getElementById('searchBar');
const searchInput = document.getElementById('searchInput');
const searchCloseBtn = document.getElementById('searchCloseBtn');
const searchResultCount = document.getElementById('searchResultCount');
const notifyBtn = document.getElementById('notifyBtn');
const contactFormCancel = document.getElementById('contactFormCancel');
const contactFormSend = document.getElementById('contactFormSend');

const imageEditorOverlay = document.getElementById('imageEditorOverlay');
const editorCanvasWrap = document.getElementById('editorCanvasWrap');
const imageCanvas = document.getElementById('imageCanvas');
const drawCanvas = document.getElementById('drawCanvas');
const editorCancelBtn = document.getElementById('editorCancelBtn');
const editorRotateBtn = document.getElementById('editorRotateBtn');
const editorSendBtn = document.getElementById('editorSendBtn');
const filterStrip = document.getElementById('filterStrip');
const drawColorStrip = document.getElementById('drawColorStrip');
const cropBox = document.getElementById('cropBox');
const cropActions = document.getElementById('cropActions');
const cropCancelBtn = document.getElementById('cropCancelBtn');
const cropApplyBtn = document.getElementById('cropApplyBtn');

// ==================== TIME FORMATTING (hamesha CLIENT/PHONE ke local timezone me) ====================
// Server ab raw createdAt (ISO timestamp) bhejta hai. Time ko yahan, render hote waqt,
// browser/phone ke apne local timezone me format karte hain — isse time hamesha sahi dikhega,
// chahe server kisi bhi timezone (UTC) me chal raha ho.
function formatMsgTime(createdAt) {
  if (!createdAt) return '';
  return new Date(createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

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
  themePicker.classList.add('hidden');
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

// ==================== APP THEME (Telegram-style, poori app pe lagta hai) ====================
const themeBtn = document.getElementById('themeBtn');
const themePicker = document.getElementById('themePicker');
const THEME_KEY = 'chatadda_app_theme';

function applyAppTheme() {
  const saved = localStorage.getItem(THEME_KEY) || 'default';
  document.body.classList.remove('theme-telegram', 'theme-purple', 'theme-sunset', 'theme-ocean', 'theme-rose');
  if (saved !== 'default') document.body.classList.add(`theme-${saved}`);
  themePicker.querySelectorAll('.theme-opt').forEach((btn) => {
    btn.classList.toggle('selected', btn.dataset.theme === saved);
  });
}

themeBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  wallpaperPicker.classList.add('hidden');
  themePicker.classList.toggle('hidden');
});

themePicker.querySelectorAll('.theme-opt').forEach((btn) => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    localStorage.setItem(THEME_KEY, btn.dataset.theme);
    applyAppTheme();
    themePicker.classList.add('hidden');
  });
});

applyAppTheme();

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
    return `<img src="${escapeHtml(p.photoUrl)}" class="mini-avatar" alt="${escapeHtml(username)}">`;
  }
  return `<span class="mini-avatar mini-avatar-initial">${getInitials(username)}</span>`;
}

function setMyAvatar(url) {
  if (url) {
    myAvatarBtn.innerHTML = `<img src="${escapeHtml(url)}" alt="Mera DP">`;
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

// WhatsApp-style exact wording:
// "today at 10:57 AM", "yesterday at 5:37 PM", "on 7/15/2026" (purane dinon ke liye sirf date, time nahi)
function formatLastSeen(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const time = d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });

  if (d.toDateString() === now.toDateString()) return `today at ${time}`;

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return `yesterday at ${time}`;

  return `on ${d.toLocaleDateString('en-IN')}`;
}

// WhatsApp-style: header ke subtitle line mein Online / Last seen / Typing... teeno
// yahi ek jagah dikhte hain — isse "typing" wala text kabhi "Online" ke upar overlap nahi karta.
function updateHeaderPresence() {
  if (!currentChat || currentChat === 'public') {
    headerSubtitle.textContent = '';
    headerSubtitle.classList.remove('online');
    return;
  }
  const p = presenceMap[currentChat];
  if (p && p.isOnline) {
    headerSubtitle.textContent = 'online';
    headerSubtitle.classList.add('online');
  } else {
    headerSubtitle.textContent = p && p.lastSeen ? `last seen ${formatLastSeen(p.lastSeen)}` : '';
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
let replyingTo = null; // { messageId, fromUsername, type, text } — jis message ka reply likha ja raha hai
let forwardingMessage = null; // jo message forward ho raha hai
let pinnedMessages = {}; // { roomKey: {messageId, text, type, fromUsername} }
let searchMode = false;

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
  initPushNotifications();
});

function showEmptyState() {
  currentChat = null;
  publicRoomBtn.classList.remove('active');
  headerTitle.textContent = 'ChatAdda';
  chatActions.classList.add('hidden');
  searchToggleBtn.classList.add('hidden');
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
        replyTo: m.replyTo || null, forwarded: !!m.forwarded, pinned: !!m.pinned,
        contactName: m.contactName, contactPhone: m.contactPhone, mediaDuration: m.mediaDuration,
        createdAt: m.createdAt
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
  // Chat badalte waqt purana reply-in-progress clear kar do, warna galat chat me reply chala jaayega
  cancelReply();
  if (searchMode) closeSearch();

  // Adda Room se bahar jaate waqt presence hata do
  if (currentChat === 'public' && target !== 'public') {
    socket.emit('leavePublicRoom');
  }

  currentChat = target;
  messageForm.classList.remove('hidden');
  searchToggleBtn.classList.remove('hidden');
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
          replyTo: m.replyTo || null, forwarded: !!m.forwarded, pinned: !!m.pinned,
          contactName: m.contactName, contactPhone: m.contactPhone, mediaDuration: m.mediaDuration,
          createdAt: m.createdAt,
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

  // Is chat me koi pinned message hai to banner dikhao, warna hide karo
  const roomKey = target === 'public' ? 'public' : privateRoomKey(target);
  const list = conversations[target] || [];
  const pinnedMsg = list.find(m => m.pinned);
  if (pinnedMsg) {
    showPinnedBanner(roomKey, { messageId: String(pinnedMsg._id), type: pinnedMsg.type, text: pinnedMsg.text, fromUsername: pinnedMsg.username || pinnedMsg.from, contactName: pinnedMsg.contactName, mediaName: pinnedMsg.mediaName });
  } else {
    pinnedBanner.classList.add('hidden');
  }

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
function closeAllMessageActions() {
  document.querySelectorAll('.msg.actions-open').forEach(el => el.classList.remove('actions-open'));
}
// Chat ke khaali area pe tap karo to khula hua toolbar apne aap band ho jaaye
messagesEl.addEventListener('click', (e) => {
  if (e.target === messagesEl) closeAllMessageActions();
});

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
  } else if (data.type === 'audio') {
    bodyHtml = `<div class="msg-audio"><audio controls src="${data.mediaUrl}"></audio></div>`;
  } else if (data.type === 'contact') {
    const phone = escapeHtml(data.contactPhone || '');
    bodyHtml = `
      <a href="tel:${phone}" class="msg-contact-card" style="color:inherit;text-decoration:none;">
        <span class="msg-contact-icon">👤</span>
        <span class="msg-contact-info">
          <span class="msg-contact-name">${escapeHtml(data.contactName || 'Contact')}</span>
          <span class="msg-contact-phone">${phone}</span>
        </span>
      </a>`;
  } else {
    bodyHtml = `<span class="msg-text">${escapeHtml(data.text)}</span>${data.edited ? '<span class="edited-tag">(edited)</span>' : ''}`;
  }

  const delivered = isMine && isPrivate ? !!(presenceMap[data.to] && presenceMap[data.to].isOnline) : false;
  const ticksHtml = (isMine && isPrivate)
    ? `<span class="msg-ticks${data.read ? ' read' : ''}">${data.read ? '✓✓' : (delivered ? '✓✓' : '✓')}</span>`
    : '';

  // Time hamesha yahin, render hote waqt, phone ke local timezone se nikalte hain (createdAt se)
  div.innerHTML = `
    ${data.forwarded ? '<span class="msg-forwarded-tag">➡️ Forwarded</span>' : ''}
    ${isMine ? '' : `<span class="msg-user">${escapeHtml(data.username || data.from)}</span>`}
    ${!data.deleted ? buildReplyQuoteHtml(data.replyTo) : ''}
    ${bodyHtml}
    <span class="msg-time">${formatMsgTime(data.createdAt)}${ticksHtml}</span>
  `;

  if (!data.deleted) {
    const actions = document.createElement('div');
    actions.className = 'msg-actions';

    const replyActionBtn = document.createElement('button');
    replyActionBtn.title = 'Reply';
    replyActionBtn.textContent = '↩️';
    replyActionBtn.addEventListener('click', () => startReply(data));
    actions.appendChild(replyActionBtn);

    const forwardActionBtn = document.createElement('button');
    forwardActionBtn.title = 'Forward';
    forwardActionBtn.textContent = '➡️';
    forwardActionBtn.addEventListener('click', () => startForward(data));
    actions.appendChild(forwardActionBtn);

    const pinActionBtn = document.createElement('button');
    pinActionBtn.title = 'Pin';
    pinActionBtn.textContent = '📌';
    pinActionBtn.addEventListener('click', () => togglePinMessage(data));
    actions.appendChild(pinActionBtn);

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
    // Koi bhi action button dabate hi toolbar apne aap band ho jaaye
    actions.addEventListener('click', () => setTimeout(closeAllMessageActions, 30));
    div.appendChild(actions);

    // WhatsApp jaisa: message pe tap karo to toolbar khule/band ho, links/audio/reactions pe tap normal kaam kare
    div.addEventListener('click', (e) => {
      if (e.target.closest('a, audio, .msg-actions, .msg-reactions-row')) return;
      const wasOpen = div.classList.contains('actions-open');
      closeAllMessageActions();
      if (!wasOpen) div.classList.add('actions-open');
    });
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

// ==================== REPLY TO MESSAGE ====================
// Kisi bhi message type ka chhota preview text banata hai (quoted block aur reply-bar dono ke liye)
function replyPreviewSummary(data) {
  if (data.deleted) return '🚫 Ye message delete kar diya gaya';
  switch (data.type) {
    case 'image': return '📷 Photo';
    case 'document': return `📄 ${data.mediaName || 'Document'}`;
    case 'location': return '📍 Location';
    case 'audio': return '🎤 Voice message';
    case 'contact': return `👤 ${data.contactName || 'Contact'}`;
    default: return data.text || '';
  }
}

function startReply(data) {
  if (!data._id) { showToast('Ye purana message reply nahi ho sakta'); return; }
  replyingTo = {
    messageId: data._id,
    fromUsername: data.username || data.from,
    type: data.type,
    text: replyPreviewSummary(data)
  };
  replyPreviewLabel.textContent = replyingTo.fromUsername === myUsername ? 'Apne aap ko reply' : `${replyingTo.fromUsername} ko reply`;
  replyPreviewText.textContent = replyingTo.text;
  replyPreviewBar.classList.remove('hidden');
  messageInput.focus();
}

function cancelReply() {
  replyingTo = null;
  replyPreviewBar.classList.add('hidden');
}

cancelReplyBtn.addEventListener('click', cancelReply);

// Quoted reply block banata hai jo kisi bhejay hue message ke bubble ke andar upar dikhta hai
function buildReplyQuoteHtml(replyTo) {
  if (!replyTo || !replyTo.messageId) return '';
  const who = replyTo.fromUsername === myUsername ? 'Aap' : escapeHtml(replyTo.fromUsername || '');
  return `<div class="msg-reply-quote"><span class="msg-reply-quote-user">${who}</span><span class="msg-reply-quote-text">${escapeHtml(replyTo.text || '')}</span></div>`;
}

// ==================== FORWARD MESSAGE ====================
function startForward(data) {
  if (!data._id) { showToast('Ye purana message forward nahi ho sakta'); return; }
  forwardingMessage = data;
  buildForwardTargetList();
  forwardModal.classList.remove('hidden');
}

function closeForwardModal() {
  forwardingMessage = null;
  forwardModal.classList.add('hidden');
  forwardTargetList.innerHTML = '';
}

forwardModalCancel.addEventListener('click', closeForwardModal);

function buildForwardTargetList() {
  forwardTargetList.innerHTML = '';

  const targets = new Set();
  targets.add('public');
  Object.keys(conversations).forEach(k => { if (k !== 'public') targets.add(k); });
  onlineUsernames.forEach(u => { if (u !== myUsername) targets.add(u); });

  if (targets.size === 0) {
    forwardTargetList.innerHTML = '<p class="forward-empty">Koi chat available nahi hai</p>';
    return;
  }

  targets.forEach((target) => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'forward-target-item';
    item.textContent = target === 'public' ? '🌐 Adda Room (Public)' : `👤 ${target}`;
    item.addEventListener('click', () => sendForwardTo(target));
    forwardTargetList.appendChild(item);
  });
}

function sendForwardTo(target) {
  if (!forwardingMessage) return;
  const data = forwardingMessage;
  const payload = {
    type: data.type,
    text: data.text || '',
    mediaUrl: data.mediaUrl || '',
    mediaName: data.mediaName || '',
    duration: data.duration || 0,
    location: data.location || undefined,
    contactName: data.contactName || '',
    contactPhone: data.contactPhone || '',
    forwarded: true
  };

  if (target === 'public') {
    socket.emit('chatMessage', payload);
  } else {
    if (blockedUsers.has(target)) {
      showToast('Aapne isse block kiya hai. Pehle unblock karo.');
      return;
    }
    socket.emit('privateMessage', { toUsername: target, ...payload });
  }

  showToast('Message forward ho gaya');
  closeForwardModal();
}

// ==================== PIN MESSAGE ====================
function togglePinMessage(data) {
  if (!data._id) { showToast('Ye purana message pin nahi ho sakta'); return; }
  const room = currentChat === 'public' ? 'public' : privateRoomKey(currentChat);
  const isCurrentlyPinned = pinnedMessages[room] && pinnedMessages[room].messageId === String(data._id);
  if (isCurrentlyPinned) {
    socket.emit('unpinMessage', { messageId: data._id, room });
  } else {
    socket.emit('pinMessage', { messageId: data._id });
  }
}

// Private room ki id server jaisi hi banao (dono usernames ko sorted joda hua)
function privateRoomKey(otherUsername) {
  return [myUsername, otherUsername].sort().join('__');
}

function showPinnedBanner(room, info) {
  pinnedMessages[room] = info;
  const activeRoom = currentChat === 'public' ? 'public' : privateRoomKey(currentChat);
  if (room !== activeRoom) return;
  pinnedBannerText.textContent = `📌 ${info.fromUsername}: ${replyPreviewSummary(info)}`;
  pinnedBanner.classList.remove('hidden');
  pinnedBanner.onclick = (e) => {
    if (e.target === unpinBtn) return;
    const el = document.querySelector(`[data-msg-id="${info.messageId}"]`);
    if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.classList.add('msg-highlight'); setTimeout(() => el.classList.remove('msg-highlight'), 1500); }
  };
}

function hidePinnedBanner(room) {
  delete pinnedMessages[room];
  const activeRoom = currentChat === 'public' ? 'public' : privateRoomKey(currentChat);
  if (room === activeRoom) pinnedBanner.classList.add('hidden');
}

unpinBtn.addEventListener('click', () => {
  const room = currentChat === 'public' ? 'public' : privateRoomKey(currentChat);
  const info = pinnedMessages[room];
  if (info) socket.emit('unpinMessage', { messageId: info.messageId, room });
});

// Server se room id (public ya sorted-username pair) aaya hai, usse conversations{} ki key me convert karta hai
function conversationKeyForRoom(room) {
  if (room === 'public') return 'public';
  const parts = room.split('__');
  const other = parts.find(u => u !== myUsername);
  return other && conversations[other] ? other : null;
}

socket.on('messagePinned', (info) => {
  showPinnedBanner(info.room, info);
  const key = conversationKeyForRoom(info.room);
  if (key && conversations[key]) {
    conversations[key].forEach(m => { m.pinned = String(m._id) === info.messageId; });
  }
});

socket.on('messageUnpinned', ({ room }) => {
  hidePinnedBanner(room);
  const key = conversationKeyForRoom(room);
  if (key && conversations[key]) {
    conversations[key].forEach(m => { m.pinned = false; });
  }
});

// ==================== IN-CHAT SEARCH ====================
function openSearch() {
  searchMode = true;
  searchBar.classList.remove('hidden');
  searchInput.value = '';
  searchInput.focus();
  searchResultCount.textContent = '';
  clearSearchHighlights();
}

function closeSearch() {
  searchMode = false;
  searchBar.classList.add('hidden');
  clearSearchHighlights();
}

function clearSearchHighlights() {
  document.querySelectorAll('.msg-search-match').forEach(el => el.classList.remove('msg-search-match'));
}

function runSearch() {
  clearSearchHighlights();
  const q = searchInput.value.trim().toLowerCase();
  if (!q) { searchResultCount.textContent = ''; return; }

  const list = conversations[currentChat] || [];
  let matchCount = 0;
  let firstMatchEl = null;
  list.forEach((data) => {
    if (data.deleted || data.type !== 'text' || !data.text) return;
    if (data.text.toLowerCase().includes(q)) {
      matchCount++;
      const el = document.querySelector(`[data-msg-id="${data._id}"]`);
      if (el) {
        el.classList.add('msg-search-match');
        if (!firstMatchEl) firstMatchEl = el;
      }
    }
  });

  searchResultCount.textContent = matchCount > 0 ? `${matchCount} match mila` : 'Kuch nahi mila';
  if (firstMatchEl) firstMatchEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

searchToggleBtn.addEventListener('click', () => {
  if (searchMode) closeSearch(); else openSearch();
});
searchCloseBtn.addEventListener('click', closeSearch);
searchInput.addEventListener('input', runSearch);

// ==================== PUSH NOTIFICATIONS ====================
// VAPID public key ko browser ke format (Uint8Array) me convert karta hai
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

async function initPushNotifications() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  try {
    await navigator.serviceWorker.register('/sw.js');
    updateNotifyBtnState();
  } catch (err) {
    console.error('Service worker register nahi hua:', err);
  }
}

function updateNotifyBtnState() {
  if (!notifyBtn) return;
  if (!('Notification' in window)) { notifyBtn.classList.add('hidden'); return; }
  const on = Notification.permission === 'granted' && localStorage.getItem('chatadda_push_on') === '1';
  notifyBtn.textContent = on ? '🔔' : '🔕';
  notifyBtn.title = on ? 'Notifications ON — band karne ke liye tap karo' : 'Notifications OFF — chalu karne ke liye tap karo';
}

async function enablePushNotifications() {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    showToast('Notification permission nahi mili. Browser settings me jaake allow karo.');
    return;
  }
  try {
    const reg = await navigator.serviceWorker.ready;
    const keyRes = await fetch('/api/push/vapid-public-key');
    const { publicKey } = await keyRes.json();
    if (!publicKey) { showToast('Push abhi server pe setup nahi hai'); return; }

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });
    }
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: myUsername, subscription: sub })
    });
    localStorage.setItem('chatadda_push_on', '1');
    showToast('Notifications chalu ho gaye 🔔');
  } catch (err) {
    console.error('Push subscribe fail:', err);
    showToast('Notifications chalu nahi ho paaye');
  }
  updateNotifyBtnState();
}

async function disablePushNotifications() {
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: sub.endpoint })
      });
      await sub.unsubscribe();
    }
  } catch (err) { /* ignore */ }
  localStorage.setItem('chatadda_push_on', '0');
  showToast('Notifications band ho gaye 🔕');
  updateNotifyBtnState();
}

if (notifyBtn) {
  notifyBtn.addEventListener('click', () => {
    if (!('Notification' in window)) { showToast('Ye browser notifications support nahi karta'); return; }
    const isOn = Notification.permission === 'granted' && localStorage.getItem('chatadda_push_on') === '1';
    if (isOn) disablePushNotifications(); else enablePushNotifications();
  });
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

// ==================== TYPING INDICATOR (WhatsApp-style) ====================
// Private chat mein "typing..." seedha header ke subtitle line mein dikhta hai
// (jahan "Online" / "Last seen" dikhta hai) — isse kabhi overlap nahi hota,
// kyunki ek waqt mein sirf ek hi text us line mein hota hai.
// Adda Room (public) mein typing alag chhoti si line mein dikhta hai, jaise pehle tha.
socket.on('typing', (username) => {
  if (currentChat !== 'public' || blockedUsers.has(username)) return;
  showPublicTyping(username);
});
socket.on('privateTyping', (username) => {
  if (currentChat !== username || blockedUsers.has(username)) return;
  showPrivateTyping();
});

function showPublicTyping(username) {
  typingIndicator.textContent = `${username} likh raha/rahi hai...`;
  clearTimeout(typingIndicator._t);
  typingIndicator._t = setTimeout(() => { typingIndicator.textContent = ''; }, 1500);
}

function showPrivateTyping() {
  headerSubtitle.textContent = 'typing...';
  headerSubtitle.classList.add('online');
  clearTimeout(headerSubtitle._t);
  headerSubtitle._t = setTimeout(() => { updateHeaderPresence(); }, 1500);
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
  updateSendMicVisibility();
});

function sendMessage(payload) {
  if (!currentChat) return;
  if (replyingTo) {
    payload = { ...payload, replyTo: replyingTo };
  }
  if (currentChat === 'public') {
    socket.emit('chatMessage', payload);
  } else {
    if (blockedUsers.has(currentChat)) {
      showToast('Aapne isse block kiya hai. Pehle unblock karo.');
      return;
    }
    socket.emit('privateMessage', { toUsername: currentChat, ...payload });
  }
  cancelReply();
}

messageInput.addEventListener('input', () => {
  if (!currentChat) return;
  if (currentChat === 'public') socket.emit('typing');
  else socket.emit('privateTyping', currentChat);
});

// ==================== MIC / SEND TOGGLE (WhatsApp-style — dono kabhi ek saath nahi dikhte) ====================
function updateSendMicVisibility() {
  const hasText = messageInput.value.trim().length > 0;
  sendBtn.classList.toggle('hidden', !hasText);
  micBtn.classList.toggle('hidden', hasText);
}
messageInput.addEventListener('input', updateSendMicVisibility);
updateSendMicVisibility();

// ==================== "+" ATTACH MENU (Photo/Document, Location, Contact ek jagah) ====================
plusBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  attachMenu.classList.toggle('hidden');
});
document.addEventListener('click', () => {
  attachMenu.classList.add('hidden');
});
['attachBtn', 'locationBtn', 'contactBtn'].forEach((id) => {
  document.getElementById(id).addEventListener('click', () => {
    attachMenu.classList.add('hidden');
  });
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

  // Images edit screen se hokar jaate hain (crop/rotate/filter/draw/text)
  if (file.type.startsWith('image/')) {
    openImageEditor(file);
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

// ==================== IMAGE EDITOR (crop / rotate / filter / draw / text) ====================
const EDITOR_FILTERS = {
  none: 'none',
  clarendon: 'contrast(1.2) saturate(1.35) brightness(1.05)',
  juno: 'sepia(0.15) saturate(1.4) contrast(1.1) brightness(1.05)',
  lark: 'brightness(1.1) saturate(1.1) contrast(0.95)',
  gingham: 'brightness(1.05) sepia(0.1) contrast(0.9) saturate(0.85)',
  moon: 'grayscale(1) contrast(1.1) brightness(1.05)'
};

let editorImage = null;   // current base Image() object
let editorFilter = 'none';
let editorTool = null;    // 'crop' | 'filter' | 'draw' | 'text' | null
let editorDrawColor = '#ffffff';
let isDrawing = false;
let cropDragMode = null;  // 'move' | 'tl' | 'tr' | 'bl' | 'br' | null
let cropStart = null;

const imgCtx = imageCanvas.getContext('2d');
const drawCtx = drawCanvas.getContext('2d');

function openImageEditor(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      editorImage = img;
      editorFilter = 'none';
      setEditorTool(null);
      filterStrip.querySelectorAll('.editor-filter-btn').forEach((b) => b.classList.toggle('active', b.dataset.filter === 'none'));
      imageEditorOverlay.classList.remove('hidden');
      setupEditorCanvasSize();
      renderImageCanvas();
      clearDrawCanvas();
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function setupEditorCanvasSize() {
  const maxW = editorCanvasWrap.clientWidth * 0.94;
  const maxH = editorCanvasWrap.clientHeight * 0.94;
  const ratio = Math.min(maxW / editorImage.width, maxH / editorImage.height, 1);
  const w = Math.round(editorImage.width * ratio);
  const h = Math.round(editorImage.height * ratio);
  [imageCanvas, drawCanvas].forEach((c) => { c.width = w; c.height = h; });
}

function renderImageCanvas() {
  imgCtx.clearRect(0, 0, imageCanvas.width, imageCanvas.height);
  imgCtx.filter = EDITOR_FILTERS[editorFilter] || 'none';
  imgCtx.drawImage(editorImage, 0, 0, imageCanvas.width, imageCanvas.height);
  imgCtx.filter = 'none';
}

function clearDrawCanvas() {
  drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
}

// "Flatten" karta hai current image+draw ko ek nayi Image mein — rotate/crop ke baad
// state consistent rahe isliye (naya editorImage banta hai, filter/draw reset ho jaate hain)
function flattenComposite() {
  const tmp = document.createElement('canvas');
  tmp.width = imageCanvas.width;
  tmp.height = imageCanvas.height;
  const tctx = tmp.getContext('2d');
  tctx.drawImage(imageCanvas, 0, 0);
  tctx.drawImage(drawCanvas, 0, 0);
  return tmp;
}

function replaceEditorImageWithCanvas(canvas) {
  const img = new Image();
  img.onload = () => {
    editorImage = img;
    editorFilter = 'none';
    filterStrip.querySelectorAll('.editor-filter-btn').forEach((b) => b.classList.toggle('active', b.dataset.filter === 'none'));
    setupEditorCanvasSize();
    renderImageCanvas();
    clearDrawCanvas();
  };
  img.src = canvas.toDataURL('image/png');
}

// ---- Rotate 90° ----
editorRotateBtn.addEventListener('click', () => {
  const flattened = flattenComposite();
  const rotated = document.createElement('canvas');
  rotated.width = flattened.height;
  rotated.height = flattened.width;
  const rctx = rotated.getContext('2d');
  rctx.translate(rotated.width / 2, rotated.height / 2);
  rctx.rotate(Math.PI / 2);
  rctx.drawImage(flattened, -flattened.width / 2, -flattened.height / 2);
  replaceEditorImageWithCanvas(rotated);
});

// ---- Tool switching ----
document.querySelectorAll('.editor-tool-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const tool = editorTool === btn.dataset.tool ? null : btn.dataset.tool;
    setEditorTool(tool);
  });
});

function setEditorTool(tool) {
  editorTool = tool;
  document.querySelectorAll('.editor-tool-btn').forEach((b) => b.classList.toggle('active', b.dataset.tool === tool));
  filterStrip.classList.toggle('hidden', tool !== 'filter');
  drawColorStrip.classList.toggle('hidden', tool !== 'draw' && tool !== 'text');
  cropActions.classList.toggle('hidden', tool !== 'crop');
  drawCanvas.style.pointerEvents = (tool === 'draw' || tool === 'text') ? 'auto' : 'none';
  if (tool === 'crop') openCropBox(); else cropBox.classList.add('hidden');
}

// ---- Filters ----
filterStrip.querySelectorAll('.editor-filter-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    editorFilter = btn.dataset.filter;
    filterStrip.querySelectorAll('.editor-filter-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    renderImageCanvas();
  });
});

// ---- Draw / text color ----
drawColorStrip.querySelectorAll('.editor-color-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    editorDrawColor = btn.dataset.color;
    drawColorStrip.querySelectorAll('.editor-color-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

// ---- Draw (freehand pen) ----
function getCanvasPos(evt) {
  const rect = drawCanvas.getBoundingClientRect();
  const point = evt.touches ? evt.touches[0] : evt;
  return {
    x: (point.clientX - rect.left) * (drawCanvas.width / rect.width),
    y: (point.clientY - rect.top) * (drawCanvas.height / rect.height)
  };
}

function handleDrawStart(e) {
  if (editorTool === 'text') { handleTextTap(e); return; }
  if (editorTool !== 'draw') return;
  e.preventDefault();
  isDrawing = true;
  const p = getCanvasPos(e);
  drawCtx.beginPath();
  drawCtx.moveTo(p.x, p.y);
  drawCtx.lineCap = 'round';
  drawCtx.lineJoin = 'round';
  drawCtx.strokeStyle = editorDrawColor;
  drawCtx.lineWidth = 5;
}
function handleDrawMove(e) {
  if (!isDrawing || editorTool !== 'draw') return;
  e.preventDefault();
  const p = getCanvasPos(e);
  drawCtx.lineTo(p.x, p.y);
  drawCtx.stroke();
}
function handleDrawEnd() { isDrawing = false; }

drawCanvas.addEventListener('mousedown', handleDrawStart);
drawCanvas.addEventListener('mousemove', handleDrawMove);
drawCanvas.addEventListener('mouseup', handleDrawEnd);
drawCanvas.addEventListener('mouseleave', handleDrawEnd);
drawCanvas.addEventListener('touchstart', handleDrawStart, { passive: false });
drawCanvas.addEventListener('touchmove', handleDrawMove, { passive: false });
drawCanvas.addEventListener('touchend', handleDrawEnd);

// ---- Text tool: tap karo, chhota input box khulega, type karke Enter/blur pe draw ho jaata hai ----
function handleTextTap(e) {
  const rect = drawCanvas.getBoundingClientRect();
  const point = e.touches ? e.touches[0] : e;
  const screenX = point.clientX - rect.left;
  const screenY = point.clientY - rect.top;

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'editor-text-input';
  input.style.left = `${screenX}px`;
  input.style.top = `${screenY - 20}px`;
  input.style.color = editorDrawColor;
  editorCanvasWrap.appendChild(input);
  input.focus();

  function commitText() {
    const value = input.value.trim();
    if (value) {
      const p = getCanvasPos({ clientX: point.clientX, clientY: point.clientY });
      drawCtx.font = 'bold 26px Inter, sans-serif';
      drawCtx.fillStyle = editorDrawColor;
      drawCtx.textBaseline = 'top';
      drawCtx.fillText(value, p.x, p.y - 13);
    }
    input.remove();
  }
  input.addEventListener('blur', commitText);
  input.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') input.blur(); });
}

// ---- Crop ----
function openCropBox() {
  const wrapRect = editorCanvasWrap.getBoundingClientRect();
  const canvasRect = imageCanvas.getBoundingClientRect();
  const left = canvasRect.left - wrapRect.left + canvasRect.width * 0.08;
  const top = canvasRect.top - wrapRect.top + canvasRect.height * 0.08;
  const w = canvasRect.width * 0.84;
  const h = canvasRect.height * 0.84;
  cropBox.style.left = `${left}px`;
  cropBox.style.top = `${top}px`;
  cropBox.style.width = `${w}px`;
  cropBox.style.height = `${h}px`;
  cropBox.classList.remove('hidden');
}

cropBox.addEventListener('mousedown', startCropDrag);
cropBox.addEventListener('touchstart', startCropDrag, { passive: false });

function startCropDrag(e) {
  e.preventDefault();
  e.stopPropagation();
  const handle = e.target.closest('.crop-handle');
  cropDragMode = handle ? [...handle.classList].find((c) => c !== 'crop-handle') : 'move';
  const point = e.touches ? e.touches[0] : e;
  cropStart = {
    x: point.clientX, y: point.clientY,
    left: cropBox.offsetLeft, top: cropBox.offsetTop,
    width: cropBox.offsetWidth, height: cropBox.offsetHeight
  };
  document.addEventListener('mousemove', onCropDrag);
  document.addEventListener('touchmove', onCropDrag, { passive: false });
  document.addEventListener('mouseup', endCropDrag);
  document.addEventListener('touchend', endCropDrag);
}

function onCropDrag(e) {
  if (!cropDragMode) return;
  e.preventDefault();
  const point = e.touches ? e.touches[0] : e;
  const dx = point.clientX - cropStart.x;
  const dy = point.clientY - cropStart.y;
  const wrapRect = editorCanvasWrap.getBoundingClientRect();

  let { left, top, width, height } = cropStart;
  if (cropDragMode === 'move') {
    left += dx; top += dy;
  } else if (cropDragMode === 'tl') {
    left += dx; top += dy; width -= dx; height -= dy;
  } else if (cropDragMode === 'tr') {
    top += dy; width += dx; height -= dy;
  } else if (cropDragMode === 'bl') {
    left += dx; width -= dx; height += dy;
  } else if (cropDragMode === 'br') {
    width += dx; height += dy;
  }
  if (width < 40) width = 40;
  if (height < 40) height = 40;
  left = Math.max(0, Math.min(left, wrapRect.width - width));
  top = Math.max(0, Math.min(top, wrapRect.height - height));

  cropBox.style.left = `${left}px`;
  cropBox.style.top = `${top}px`;
  cropBox.style.width = `${width}px`;
  cropBox.style.height = `${height}px`;
}

function endCropDrag() {
  cropDragMode = null;
  document.removeEventListener('mousemove', onCropDrag);
  document.removeEventListener('touchmove', onCropDrag);
  document.removeEventListener('mouseup', endCropDrag);
  document.removeEventListener('touchend', endCropDrag);
}

cropCancelBtn.addEventListener('click', () => setEditorTool(null));

cropApplyBtn.addEventListener('click', () => {
  const canvasRect = imageCanvas.getBoundingClientRect();
  const scaleX = imageCanvas.width / canvasRect.width;
  const scaleY = imageCanvas.height / canvasRect.height;
  const cropRect = cropBox.getBoundingClientRect();

  const sx = Math.max(0, (cropRect.left - canvasRect.left) * scaleX);
  const sy = Math.max(0, (cropRect.top - canvasRect.top) * scaleY);
  const sw = Math.min(imageCanvas.width - sx, cropRect.width * scaleX);
  const sh = Math.min(imageCanvas.height - sy, cropRect.height * scaleY);

  const flattened = flattenComposite();
  const cropped = document.createElement('canvas');
  cropped.width = sw;
  cropped.height = sh;
  cropped.getContext('2d').drawImage(flattened, sx, sy, sw, sh, 0, 0, sw, sh);

  replaceEditorImageWithCanvas(cropped);
  setEditorTool(null);
});

// ---- Cancel / Send ----
editorCancelBtn.addEventListener('click', () => {
  imageEditorOverlay.classList.add('hidden');
  editorImage = null;
  setEditorTool(null);
});

editorSendBtn.addEventListener('click', () => {
  if (!editorImage || !currentChat) {
    showToast('Photo ya chat select nahi hai');
    return;
  }

  let finalCanvas;
  try {
    finalCanvas = flattenComposite();
  } catch (err) {
    console.error('Editor flatten error:', err);
    showToast('Photo process karne mein dikkat aayi, dobara try karo');
    return;
  }

  if (!finalCanvas.width || !finalCanvas.height) {
    showToast('Photo ka size sahi nahi hai — crop thoda bada karo');
    return;
  }

  finalCanvas.toBlob(async (blob) => {
    if (!blob) {
      showToast('Photo taiyar nahi ho paayi, dobara try karo');
      return;
    }
    imageEditorOverlay.classList.add('hidden');
    const formData = new FormData();
    formData.append('file', blob, `photo-${Date.now()}.png`);
    showToast('Photo bhej rahe hain...');
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || 'Upload fail hua'); return; }
      sendMessage({ type: 'image', mediaUrl: data.url, mediaName: data.name });
    } catch (err) {
      console.error('Photo upload error:', err);
      showToast('Upload fail hua, internet check karo');
    }
    editorImage = null;
    setEditorTool(null);
  }, 'image/png');
});


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

// ==================== VOICE MESSAGE (press-and-hold mic, WhatsApp-style) ====================
let mediaRecorder = null;
let recordedChunks = [];
let recordingStartTime = 0;
let recordingTimerInterval = null;
let recordingCancelled = false;

function formatRecordingTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

async function startRecording() {
  if (!currentChat || mediaRecorder) return;
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    showToast('Recording is browser me support nahi hai');
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    recordedChunks = [];
    recordingCancelled = false;
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) recordedChunks.push(e.data); };
    mediaRecorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      const duration = Math.round((Date.now() - recordingStartTime) / 1000);
      if (!recordingCancelled && recordedChunks.length && duration >= 1) {
        uploadAndSendVoice(new Blob(recordedChunks, { type: 'audio/webm' }), duration);
      }
      mediaRecorder = null;
    };
    mediaRecorder.start();
    recordingStartTime = Date.now();
    micBtn.classList.add('recording');
    recordingBar.classList.remove('hidden');
    recordingTimer.textContent = '0:00';
    recordingTimerInterval = setInterval(() => {
      recordingTimer.textContent = formatRecordingTime(Math.round((Date.now() - recordingStartTime) / 1000));
    }, 500);
  } catch (err) {
    showToast('Mic access nahi mila. Permission check karo.');
  }
}

function stopRecording(cancelled = false) {
  recordingCancelled = cancelled;
  micBtn.classList.remove('recording');
  recordingBar.classList.add('hidden');
  clearInterval(recordingTimerInterval);
  if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
}

async function uploadAndSendVoice(blob, duration) {
  const formData = new FormData();
  formData.append('file', blob, `voice-${Date.now()}.webm`);
  showToast('Voice message bhej rahe hain...');
  try {
    const res = await fetch('/api/upload', { method: 'POST', body: formData });
    const data = await res.json();
    if (!res.ok) { showToast(data.error || 'Voice message bhejna fail hua'); return; }
    sendMessage({ type: 'audio', mediaUrl: data.url, mediaName: 'Voice message', duration });
  } catch (err) {
    showToast('Voice message bhejna fail hua');
  }
}

// Press-and-hold: mouse (desktop) + touch (mobile)
micBtn.addEventListener('mousedown', (e) => { e.preventDefault(); startRecording(); });
micBtn.addEventListener('touchstart', (e) => { e.preventDefault(); startRecording(); }, { passive: false });
micBtn.addEventListener('mouseup', () => stopRecording(false));
micBtn.addEventListener('mouseleave', () => { if (mediaRecorder) stopRecording(false); });
micBtn.addEventListener('touchend', (e) => { e.preventDefault(); stopRecording(false); });
micBtn.addEventListener('touchcancel', () => stopRecording(true));

// ==================== CONTACT SHARE (WhatsApp-style) ====================
contactBtn.addEventListener('click', async () => {
  if (!currentChat) return;
  // Contact Picker API — Android Chrome mein kaam karta hai
  if ('contacts' in navigator && 'ContactsManager' in window) {
    try {
      const props = ['name', 'tel'];
      const opts = { multiple: false };
      const contacts = await navigator.contacts.select(props, opts);
      if (contacts.length) {
        const c = contacts[0];
        const name = (c.name && c.name[0]) || 'Contact';
        const phone = (c.tel && c.tel[0]) || '';
        sendMessage({ type: 'contact', contactName: name, contactPhone: phone });
        return;
      }
    } catch (err) {
      // User ne cancel kiya ya permission nahi di — manual form dikhao
    }
  }
  // Fallback: manual naam+number form (iPhone / desktop ke liye)
  contactNameInput.value = '';
  contactPhoneInput.value = '';
  contactFormModal.classList.remove('hidden');
  contactNameInput.focus();
});

contactFormCancel.addEventListener('click', () => {
  contactFormModal.classList.add('hidden');
});

contactFormSend.addEventListener('click', () => {
  const name = contactNameInput.value.trim();
  const phone = contactPhoneInput.value.trim();
  if (!name || !phone) { showToast('Naam aur number dono bharo'); return; }
  sendMessage({ type: 'contact', contactName: name, contactPhone: phone });
  contactFormModal.classList.add('hidden');
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

// ==================== HEADER MORE-OPTIONS DROPDOWN (WhatsApp-style) ====================
const moreOptionsBtn = document.getElementById('moreOptionsBtn');
const moreOptionsMenu = document.getElementById('moreOptionsMenu');

moreOptionsBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  moreOptionsMenu.classList.toggle('hidden');
});

document.addEventListener('click', () => {
  moreOptionsMenu.classList.add('hidden');
});

['wallpaperBtn', 'themeBtn', 'blockBtn', 'reportBtn'].forEach((id) => {
  document.getElementById(id).addEventListener('click', () => {
    moreOptionsMenu.classList.add('hidden');
  });
});

document.addEventListener('click', () => {
  themePicker.classList.add('hidden');
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
    { urls: 'stun:stun.relay.metered.ca:80' },
    {
      urls: 'turn:free.expressturn.com:3478?transport=udp',
      username: '000000002101598152',
      credential: 'Hz0blX9aG2mdTsAH3JX9pxCj'
    },
    {
      urls: 'turn:free.expressturn.com:3478?transport=tcp',
      username: '000000002101598152',
      credential: 'Hz0blX9aG2mdTsAH3JX9pxCj'
    }
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

// FIX: mobile browsers (khaaskar Android) mein 100dvh keyboard khulne/band hone par
// sahi se recalculate nahi hota, jisse header kabhi-kabhi viewport se bahar chala jaata hai
// ya poora layout gadbad dikhta hai. Yahan hum real visualViewport height nikal ke
// ek CSS variable (--app-height) mein set karte hain, jise style.css mein screen/body
// ki height ke liye use kiya gaya hai — ye 100dvh se zyada reliable hai.
function setAppHeight() {
  const h = window.visualViewport ? window.visualViewport.height : window.innerHeight;
  document.documentElement.style.setProperty('--app-height', `${h}px`);
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}
setAppHeight();
window.addEventListener('resize', setAppHeight);
window.addEventListener('orientationchange', setAppHeight);
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', setAppHeight);
  window.visualViewport.addEventListener('scroll', setAppHeight);
}
// Input pe focus/blur hone par (keyboard khulna/band hona) bhi turant recalculate karo
messageInput.addEventListener('focus', () => setTimeout(setAppHeight, 100));
messageInput.addEventListener('blur', () => setTimeout(setAppHeight, 100));
