// ==================== FIREBASE (Google Sign-In) ====================
const firebaseConfig = {
  apiKey: "AIzaSyDyDE41Dv-dovnAHGIhYr2WWDjTRhlFcIg",
  authDomain: "chatadda-cfd71.firebaseapp.com",
  projectId: "chatadda-cfd71",
  storageBucket: "chatadda-cfd71.firebasestorage.app",
  messagingSenderId: "840594705972",
  appId: "1:840594705972:web:673d5d74dc677b08c28461"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

const socket = io();

const joinScreen = document.getElementById('joinScreen');
const chatScreen = document.getElementById('chatScreen');
const googleSignInBtn = document.getElementById('googleSignInBtn');
const signedInAs = document.getElementById('signedInAs');
const joinBtn = document.getElementById('joinBtn');
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

let myUsername = '';
let currentChat = 'public';
let onlineUsernames = [];
let googleUser = null;

const conversations = { public: [] };

let blockedUsers = new Set(JSON.parse(localStorage.getItem('chatadda_blocked') || '[]'));

function saveBlocked() {
  localStorage.setItem('chatadda_blocked', JSON.stringify([...blockedUsers]));
}

// ---- Google Sign-In ----
googleSignInBtn.addEventListener('click', () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithRedirect(provider);
});

auth.getRedirectResult()
  .then((result) => {
    if (result.user) {
      googleUser = result.user;
      googleSignInBtn.classList.add('hidden');
      signedInAs.textContent = `Sign in ho gaye: ${googleUser.displayName}`;
      signedInAs.classList.remove('hidden');
      joinBtn.classList.remove('hidden');
    }
  })
  .catch((err) => {
    alert('Sign-in fail hua: ' + err.message);
  });

function joinChat() {
  if (!googleUser) return;
  socket.emit('join', googleUser.displayName);
}

joinBtn.addEventListener('click', joinChat);

socket.on('joined', (finalName) => {
  myUsername = finalName;
  joinScreen.classList.add('hidden');
  chatScreen.classList.remove('hidden');
  messageInput.focus();
});

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
      li.innerHTML = `<span class="uname">${escapeHtml(u)}</span>${isBlocked ? '<span class="block-tag">Blocked</span>' : ''}`;
      li.addEventListener('click', () => switchToChat(u));
      userListEl.appendChild(li);
    });
}

function switchToChat(target) {
  currentChat = target;
  publicRoomBtn.classList.toggle('active', target === 'public');
  headerTitle.textContent = target === 'public' ? 'Adda Room' : target;
  chatActions.classList.toggle('hidden', target === 'public');
  if (target !== 'public') {
    blockBtn.textContent = blockedUsers.has(target) ? '✅ Unblock' : '🚫 Block';
    blockBtn.classList.toggle('blocked-state', blockedUsers.has(target));
  }
  renderUserList();
  renderMessages();
  if (window.innerWidth <= 720) sidebar.classList.remove('open');
  messageInput.focus();
  updateCallButtonsVisibility();
}

publicRoomBtn.addEventListener('click', () => switchToChat('public'));

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
  const isMine = data.username === myUsername;
  const div = document.createElement('div');
  div.className = 'msg' + (isMine ? ' mine' : '');
  div.innerHTML = `
    ${isMine ? '' : `<span class="msg-user">${escapeHtml(data.username)}</span>`}
    <span class="msg-text">${escapeHtml(data.text)}</span>
    <span class="msg-time">${data.time}</span>
  `;
  messagesEl.appendChild(div);
}

socket.on('system', (text) => {
  conversations.public.push({ system: true, text });
  if (currentChat === 'public') {
    appendMessageToDOM({ system: true, text });
    scrollToBottom();
  }
});

socket.on('chatMessage', (data) => {
  if (blockedUsers.has(data.username)) return;
  conversations.public.push(data);
  if (currentChat === 'public') {
    appendMessageToDOM(data);
    scrollToBottom();
  }
});

socket.on('privateMessage', (data) => {
  const otherParty = data.from === myUsername ? data.to : data.from;
  if (blockedUsers.has(otherParty)) return;
  if (!conversations[otherParty]) conversations[otherParty] = [];
  conversations[otherParty].push(data);
  if (currentChat === otherParty) {
    appendMessageToDOM({ username: data.from, text: data.text, time: data.time });
    scrollToBottom();
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
  typingIndicator._t = setTimeout(() => {
    typingIndicator.textContent = '';
  }, 1500);
}

socket.on('reportReceived', (reportedUsername) => {
  showToast(`Report bhej diya gaya (${reportedUsername})`);
});

messageForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = messageInput.value.trim();
  if (!text) return;

  if (currentChat === 'public') {
    socket.emit('chatMessage', text);
  } else {
    if (blockedUsers.has(currentChat)) {
      showToast('Aapne isse block kiya hai. Pehle unblock karo.');
      return;
    }
    socket.emit('privateMessage', { toUsername: currentChat, text });
  }
  messageInput.value = '';
});

messageInput.addEventListener('input', () => {
  if (currentChat === 'public') {
    socket.emit('typing');
  } else {
    socket.emit('privateTyping', currentChat);
  }
});

blockBtn.addEventListener('click', () => {
  if (currentChat === 'public') return;
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
  if (currentChat === 'public') return;
  const reason = window.prompt(`${currentChat} ko report karne ki wajah likho (optional):`, '');
  if (reason === null) return;
  socket.emit('reportUser', { reportedUsername: currentChat, reason });
});

menuBtn.addEventListener('click', () => {
  sidebar.classList.toggle('open');
});

function scrollToBottom() {
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function showToast(text) {
  const div = document.createElement('div');
  div.className = 'toast';
  div.textContent = text;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 2500);
}

// ==================== AUDIO / VIDEO CALLING (WebRTC) ====================

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
const endCallBtn = document.getElementById('endCallBtn');
const filterBar = document.getElementById('filterBar');
const filterCanvas = document.getElementById('filterCanvas');
const filterCtx = filterCanvas.getContext('2d');

const rtcConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

let peerConnection = null;
let rawLocalStream = null;   // raw camera+mic
let localStream = null;      // stream actually sent over the call (filtered for video)
let currentCallWith = null;
let currentCallType = null;
let callTimerInterval = null;
let callSeconds = 0;
let pendingIncomingOffer = null;
let micOn = true;
let camOn = true;

// ---- Instagram-style filters (CSS filter syntax works inside canvas 2D context too) ----
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
  const showButtons = currentChat !== 'public' && !blockedUsers.has(currentChat);
  audioCallBtn.classList.toggle('hidden', !showButtons);
  videoCallBtn.classList.toggle('hidden', !showButtons);
}

audioCallBtn.addEventListener('click', () => startCall('audio'));
videoCallBtn.addEventListener('click', () => startCall('video'));

async function startCall(type) {
  if (currentChat === 'public') return;
  if (peerConnection) {
    showToast('Aap pehle se call me ho.');
    return;
  }
  currentCallWith = currentChat;
  currentCallType = type;

  try {
    rawLocalStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: type === 'video'
    });
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
  };

  peerConnection.onconnectionstatechange = () => {
    if (['disconnected', 'failed', 'closed'].includes(peerConnection.connectionState)) {
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
  incomingCallText.textContent = `${fromUsername} call kar raha/rahi hai`;
  incomingCallType.textContent = callType === 'video' ? '📹 Video Call' : '🎤 Audio Call';
  incomingCallModal.classList.remove('hidden');
});

acceptCallBtn.addEventListener('click', async () => {
  if (!pendingIncomingOffer) return;
  const { fromUsername, offer, callType } = pendingIncomingOffer;
  incomingCallModal.classList.add('hidden');

  currentCallWith = fromUsername;
  currentCallType = callType;

  try {
    rawLocalStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: callType === 'video'
    });
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
  if (pendingIncomingOffer) {
    socket.emit('callReject', { toUsername: pendingIncomingOffer.fromUsername });
  }
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
    try {
      await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (e) {
      console.error('ICE candidate error', e);
    }
  }
});

socket.on('callReject', ({ fromUsername }) => {
  if (currentCallWith === fromUsername) {
    showToast(`${fromUsername} ne call reject kar di`);
    cleanupCall();
  }
});

socket.on('callEnd', ({ fromUsername }) => {
  if (currentCallWith === fromUsername) {
    showToast(`Call khatam ho gayi`);
    cleanupCall();
  }
});

socket.on('callFailed', ({ toUsername }) => {
  showToast(`${toUsername} is waqt online nahi hai`);
  cleanupCall();
});

function openCallUI() {
  activeCallOverlay.classList.remove('hidden');
  callWithName.textContent = currentCallWith;

  if (currentCallType === 'video') {
    videoGrid.classList.remove('hidden');
    audioCallVisual.classList.add('hidden');
    filterBar.classList.remove('hidden');
    localVideo.srcObject = localStream;
  } else {
    videoGrid.classList.add('hidden');
    audioCallVisual.classList.remove('hidden');
    filterBar.classList.add('hidden');
  }

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
  if (notifyServer && currentCallWith) {
    socket.emit('callEnd', { toUsername: currentCallWith });
  }
  cleanupCall();
}

function cleanupCall() {
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }
  stopFilterProcessing();
  if (rawLocalStream) {
    rawLocalStream.getTracks().forEach((t) => t.stop());
    rawLocalStream = null;
  }
  localStream = null;
  remoteVideo.srcObject = null;
  localVideo.srcObject = null;
  activeCallOverlay.classList.add('hidden');
  incomingCallModal.classList.add('hidden');
  clearInterval(callTimerInterval);
  callTimerInterval = null;
  currentCallWith = null;
  currentCallType = null;
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
