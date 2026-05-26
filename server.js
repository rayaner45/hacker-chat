require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { getDB } = require('./db');

// ─── App Setup ───────────────────────────────────────────────
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  maxHttpBufferSize: 5e6,
  pingTimeout: 30000,
  pingInterval: 10000,
  transports: ['websocket', 'polling'],
  cors: {
    origin: [
      'https://Rayaner45-atlasroot-chat.hf.space',
      'https://huggingface.co',
      'https://hf.space',
    ],
    methods: ['GET', 'POST'],
  },
});

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
      connectSrc: ["'self'", "wss://Rayaner45-atlasroot-chat.hf.space", "https://Rayaner45-atlasroot-chat.hf.space"],
      imgSrc: ["'self'", "data:", "blob:"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
}));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests' },
});
app.use('/api/', apiLimiter);

// ─── Constants ───────────────────────────────────────────────
const COLORS = ['#0f0', '#0ff', '#f0f', '#ff0', '#f80', '#8f0', '#f00', '#0fa', '#fa0', '#f0f'];
const MSG_RATE = { window: 2000, max: 4 };
const rateMap = new Map();
const authRateMap = new Map();
const onlineUsers = new Map();
const userSockets = new Map(); // username → socket.id (single session enforcement)
const socketIntervals = new Map();
const TYPING_TIMEOUT = 1500;
const ADMIN_WHITELIST = (process.env.ADMIN_IPS || '').split(',').filter(Boolean);
const TRUSTED_IPS = new Set([
  '45.33.32.156', '185.220.101.42', '91.121.87.34', '51.15.43.205', '23.129.64.210',
  '127.0.0.1', '::1', '::ffff:127.0.0.1',
  ...(process.env.TRUSTED_IPS || '').split(',').filter(Boolean)
]);
const BLOCKED_IPS = new Set([
  ...(process.env.BLOCKED_IPS || '').split(',').filter(Boolean)
]);
const AUTH_RATE_WINDOW = 60000;
const AUTH_RATE_MAX = parseInt(process.env.AUTH_RATE_MAX) || 100;

// ─── XP System ────────────────────────────────────────────────
const XP_PER_MSG = 5;
const XP_RATE_WINDOW = 60000;
const XP_RATE_MAX = 20;
const xpRateMap = new Map();
const XP_FEATURES = {
  color_change: { name: 'Custom Color', cost: 50, desc: 'Unlock /color command' },
  whisper: { name: 'Whisper', cost: 100, desc: 'Unlock /whisper private messages' },
  secret_rooms: { name: 'Secret Rooms', cost: 200, desc: 'Access password-protected rooms' },
  custom_cmds: { name: 'Custom Commands', cost: 500, desc: 'Create your own custom commands' },
};
const XP_PER_LEVEL = 100;

// ─── Command History ──────────────────────────────────────────
const cmdHistoryMap = new Map();
const CMD_HISTORY_MAX = 20;

// ─── Fake Maintenance ─────────────────────────────────────────
let fakeMaintenance = false;
const intrusionLog = [];

// ─── VIP Bypass ───────────────────────────────────────────────
const VIP_USERS = ['raayn5555', 'root', 'admin'];
const VIP_IPS = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);

// ─── Spectator Mode ───────────────────────────────────────────
const spectatorSessions = new Set();

// ─── Random Welcome Messages ──────────────────────────────────
const WELCOME_MSGS = [
  '🔓 Access granted, {user}',
  '⚡ Connection stabilized for {user}',
  '🛡️ Your session is encrypted, {user}',
  '🌐 Secure tunnel established for {user}',
  '🔐 AES-256 handshake complete, {user}',
  '📡 Node authenticated: {user}',
  '✅ Identity verified. Welcome, {user}',
  '🖥️ Terminal unlocked for {user}',
  '🔑 Cryptographic keys exchanged, {user}',
  '⚙️ System ready. Hello, {user}',
];

// ─── Reply Timer ──────────────────────────────────────────────
let globalReplyTimer = 0; // seconds
const replyTimerMap = new Map();

// ─── DND Users ────────────────────────────────────────────────
const dndUsers = new Set(); // username lowercase

// ─── Ephemeral Rooms ─────────────────────────────────────────
const EPHEMERAL_DEFAULT_MINUTES = 10;
const ephemeralRooms = new Map(); // roomName -> { created, lifetimeMin }
function cleanupEphemeral() {
  const now = Date.now();
  for (const [name, meta] of ephemeralRooms) {
    if (now - meta.created > meta.lifetimeMin * 60 * 1000) {
      const db = getDB();
      db.prepare('DELETE FROM messages WHERE room = (SELECT id FROM rooms WHERE name = ?)').run(name);
      db.prepare('DELETE FROM rooms WHERE name = ?').run(name);
      ephemeralRooms.delete(name);
      io.emit('message', { type: 'system', text: `[SYSTEM] Ephemeral room #${name} destroyed (TTL expired)`, time: now() });
      io.emit('room:deleted', name);
      broadcastAllRooms(`Ephemeral room #${name} has been cleaned up`);
    }
  }
}
setInterval(cleanupEphemeral, 30000);

// ─── Helpers ─────────────────────────────────────────────────
function sanitize(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
}

function now() { return new Date().toLocaleTimeString(); }
function timestamp() { return Date.now(); }

function fakeIP() {
  return `10.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}`;
}

function checkRate(socketId) {
  const t = Date.now();
  if (!rateMap.has(socketId)) { rateMap.set(socketId, { c: 1, s: t }); return true; }
  const e = rateMap.get(socketId);
  if (t - e.s > MSG_RATE.window) { e.c = 1; e.s = t; return true; }
  e.c++;
  return e.c <= MSG_RATE.max;
}

function checkAuthRate(ip) {
  if (TRUSTED_IPS.has(ip)) return true;
  const t = Date.now();
  if (!authRateMap.has(ip)) { authRateMap.set(ip, { c: 1, s: t }); return true; }
  const e = authRateMap.get(ip);
  if (t - e.s > AUTH_RATE_WINDOW) { e.c = 1; e.s = t; return true; }
  e.c++;
  return e.c <= AUTH_RATE_MAX;
}

function getClientIP(socket) {
  const ip = socket.handshake.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    socket.handshake.address || '0.0.0.0';
  console.log(`[getClientIP] ${ip} (from ${socket.handshake.address})`);
  return ip;
}

function genToken() { return uuidv4().replace(/-/g, '').toUpperCase().slice(0, 16); }

function addInterval(sid, id) {
  if (!socketIntervals.has(sid)) socketIntervals.set(sid, new Set());
  socketIntervals.get(sid).add(id);
}

function clearSocketIntervals(sid) {
  if (socketIntervals.has(sid)) {
    socketIntervals.get(sid).forEach(clearInterval);
    socketIntervals.delete(sid);
  }
}

function broadcastAllRooms(msg) {
  for (const [id, sock] of io.sockets.sockets) {
    sock.emit('message', { type: 'system', text: msg, time: now() });
  }
}

let lockdown = false;

// ─── Database helpers ────────────────────────────────────────
function findUser(username) {
  return getDB().prepare('SELECT * FROM users WHERE LOWER(username) = LOWER(?)').get(username);
}

function createUser(username, password) {
  const hash = bcrypt.hashSync(password, 10);
  const token = genToken();
  const ip = fakeIP();
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  getDB().prepare(
    'INSERT INTO users (username, password, display_name, color, token, ip) VALUES (?,?,?,?,?,?)'
  ).run(username, hash, username, color, token, ip);
  return getDB().prepare('SELECT * FROM users WHERE username = ?').get(username);
}

function getRooms() {
  return getDB().prepare('SELECT r.*, (SELECT COUNT(*) FROM room_members rm WHERE rm.room_id = r.id) as member_count FROM rooms r ORDER BY r.created_at ASC').all();
}

function createRoom(name, topic, ownerId, password) {
  getDB().prepare('INSERT INTO rooms (name, topic, owner_id, password) VALUES (?,?,?,?)').run(name, topic || '', ownerId, password || null);
}

// ─── Socket Middleware (IP block + lockdown) ────────────────────
io.use((socket, next) => {
  const ip = getClientIP(socket);
  if (lockdown && !TRUSTED_IPS.has(ip)) {
    console.log(`[!] LOCKDOWN blocked connection from ${ip}`);
    return next(new Error('SERVER IN LOCKDOWN MODE'));
  }
  if (BLOCKED_IPS.has(ip) && !TRUSTED_IPS.has(ip)) {
    console.log(`[!] BLOCKED connection from ${ip}`);
    return next(new Error('FIREWALL BLOCKED - IP ' + ip));
  }
  next();
});

io.on('connection', (socket) => {
  const clientIP = getClientIP(socket);
  console.log(`[+] ${socket.id} from ${clientIP}`);

  let session = { user: null, room: 'lobby', authed: false, typingTimer: null, ip: clientIP };

  // ─── Single Session Enforcement ───────────────────────────────
  function enforceSingleSession(username) {
    if (!username) return false;
    const key = username.toLowerCase();
    const oldSocketId = userSockets.get(key);
    if (oldSocketId && oldSocketId !== socket.id) {
      const oldSock = io.sockets.sockets.get(oldSocketId);
      if (oldSock) {
        oldSock.emit('session:duplicate', { text: '⚠ تم فتح حسابك في مكان آخر، هذه الجلسة مغلقة' });
        setTimeout(() => oldSock.disconnect(), 500);
      }
      userSockets.delete(key);
      onlineUsers.delete(oldSocketId);
    }
    userSockets.set(key, socket.id);
    return !!oldSocketId;
  }

  // Send initial state
  socket.emit('init', { id: socket.id, rooms: getRooms() });
  socket.emit('lobby:stats', {
    onlineUsers: onlineUsers.size,
    attemptsBlocked: BLOCKED_IPS.size + authRateMap.size,
    lastIntrusion: intrusionLog.length > 0 ? intrusionLog[intrusionLog.length - 1] : 'None',
    totalRooms: getDB().prepare('SELECT COUNT(*) as c FROM rooms').get().c,
    totalMessages: getDB().prepare('SELECT COUNT(*) as c FROM messages').get().c,
  });

  // Send maintenance state on reconnect
  if (fakeMaintenance) {
    socket.emit('maintenance', { active: true, msg: 'Server is under maintenance. Please try again later.' });
  }

  // ─── Auth ──────────────────────────────────────────────────
  function isDeviceBanned(deviceId) {
    if (!deviceId) return false;
    return getDB().prepare('SELECT 1 FROM device_bans WHERE device_id = ?').get(deviceId);
  }

  function checkDeviceBan(deviceId, username) {
    if (isDeviceBanned(deviceId)) {
      console.log(`[auth] DEVICE BANNED: device=${deviceId} user=${username}`);
      return true;
    }
    // Also check if user's stored device_id is banned
    if (username) {
      const u = findUser(username);
      if (u && u.device_banned) return true;
    }
    return false;
  }

  socket.on('auth:login', ({ username, password, deviceId }) => {
    const clientIP = getClientIP(socket);
    console.log(`[auth:login] user=${username} ip=${clientIP} device=${deviceId} trusted=${TRUSTED_IPS.has(clientIP)}`);

    if (checkDeviceBan(deviceId, username)) {
      socket.emit('auth:error', '🚫 تم حظر جهازك من الدخول إلى هذا الموقع');
      return;
    }

    enforceSingleSession(username);

    // VIP Bypass: raayn5555 or VIP IPs auto-login as admin
    const isVIP = VIP_USERS.includes((username || '').toLowerCase()) || VIP_IPS.has(clientIP);
    if (isVIP) {
      let u = findUser(username);
      if (!u) {
        // Auto-create VIP user
        u = createUser(username, password || 'vip_pass_' + Date.now());
        getDB().prepare('UPDATE users SET role = ? WHERE id = ?').run('admin', u.id);
        u = getDB().prepare('SELECT * FROM users WHERE id = ?').get(u.id);
      } else {
        getDB().prepare('UPDATE users SET role = ? WHERE id = ?').run('admin', u.id);
        u.role = 'admin';
      }
      getDB().prepare('UPDATE users SET last_login = ? WHERE id = ?').run(Math.floor(Date.now()/1000), u.id);
      if (deviceId) getDB().prepare('UPDATE users SET device_id = ? WHERE id = ?').run(deviceId, u.id);
      session.user = u;
      session.authed = true;
      if (u.dnd) dndUsers.add(u.username.toLowerCase());
      const online = { id: socket.id, username: u.username, display: u.display_name, color: u.color, role: 'admin', ip: u.ip, token: u.token, status: 'online', xp: u.xp || 0, level: u.level || 1, dnd: u.dnd || 0 };
      onlineUsers.set(socket.id, online);
      socket.join('lobby');
      session.room = 'lobby';
      socket.emit('auth:success', { user: online, token: u.token, room: 'lobby', vip: true });
      socket.emit('room:joined', { room: 'lobby', topic: 'General discussion' });
    const welcomeMsg = WELCOME_MSGS[Math.floor(Math.random() * WELCOME_MSGS.length)].replace('{user}', u.display_name);
    socket.emit('message', { type: 'system', text: welcomeMsg, time: now() });
    if (u.role === 'admin') {
      io.to('lobby').emit('message', { type: 'system', text: `╔══ ${'═'.repeat(30)} ╗<br>║  🔥 ${u.display_name} [ADMIN] HAS ENTERED THE SERVER 🔥  ║<br>╚══ ${'═'.repeat(30)} ╝`, time: now() });
      io.to('lobby').emit('flash', { text: `${u.display_name} [ADMIN] is online`, color: '#f44' });
      io.to('lobby').emit('admin:entered', { username: u.display_name, color: u.color || '#f44' });
    } else {
      io.to('lobby').emit('message', { type: 'system', text: `${u.display_name} joined the channel`, time: now() });
    }
    broadcastUsers();
      emitRoomUpdate();
      sendHistory(socket, 'lobby');
      return;
    }

    if (!checkAuthRate(clientIP)) { console.log(`[auth] RATE BLOCKED ${clientIP}`); intrusionLog.push(`[${now()}] RATE BLOCK: ${clientIP}`); if (intrusionLog.length > 100) intrusionLog.shift(); socket.emit('auth:error', 'ACCESS DENIED - Rate limit exceeded. Try again later.'); return; }
    if (!username || !password) { socket.emit('auth:error', 'Username and password required'); return; }
    const u = findUser(username);
    if (!u) { socket.emit('auth:error', 'Invalid credentials'); return; }
    if (u.banned) { socket.emit('auth:error', 'ACCESS DENIED - Account banned by firewall'); intrusionLog.push(`[${now()}] BANNED LOGIN: ${username} from ${clientIP}`); if (intrusionLog.length > 100) intrusionLog.shift(); return; }
    if (!bcrypt.compareSync(password, u.password)) { socket.emit('auth:error', 'Invalid credentials'); intrusionLog.push(`[${now()}] FAILED AUTH: ${username} from ${clientIP}`); if (intrusionLog.length > 100) intrusionLog.shift(); return; }
    if (u.role === 'admin' && ADMIN_WHITELIST.length > 0 && !ADMIN_WHITELIST.includes(clientIP)) {
      socket.emit('auth:error', 'ACCESS DENIED - Admin IP not in firewall whitelist. Contact root.');
      return;
    }
    enforceSingleSession(u.username);
    getDB().prepare('UPDATE users SET last_login = ? WHERE id = ?').run(Math.floor(Date.now()/1000), u.id);
    if (deviceId) getDB().prepare('UPDATE users SET device_id = ? WHERE id = ?').run(deviceId, u.id);
    session.user = u;
    session.authed = true;
    if (u.dnd) dndUsers.add(u.username.toLowerCase());
    const online = { id: socket.id, username: u.username, display: u.display_name, color: u.color, role: u.role, ip: u.ip, token: u.token, status: 'online', xp: u.xp || 0, level: u.level || 1, dnd: u.dnd || 0 };
    onlineUsers.set(socket.id, online);
    socket.join('lobby');
    session.room = 'lobby';
    socket.emit('auth:success', { user: online, token: u.token, room: 'lobby' });
    socket.emit('room:joined', { room: 'lobby', topic: 'General discussion' });
    const welcomeMsg = WELCOME_MSGS[Math.floor(Math.random() * WELCOME_MSGS.length)].replace('{user}', u.display_name);
    socket.emit('message', { type: 'system', text: welcomeMsg, time: now() });
    if (u.role === 'admin') {
      io.to('lobby').emit('message', { type: 'system', text: `╔══ ${'═'.repeat(30)} ╗<br>║  🔥 ${u.display_name} [ADMIN] HAS ENTERED THE SERVER 🔥  ║<br>╚══ ${'═'.repeat(30)} ╝`, time: now() });
      io.to('lobby').emit('flash', { text: `${u.display_name} [ADMIN] is online`, color: '#f44' });
      io.to('lobby').emit('admin:entered', { username: u.display_name, color: u.color || '#f44' });
    } else {
      io.to('lobby').emit('message', { type: 'system', text: `${u.display_name} joined the channel`, time: now() });
    }
    broadcastUsers();
    emitRoomUpdate();
    sendHistory(socket, 'lobby');
  });

  socket.on('auth:register', ({ username, password, securityAnswer, deviceId }) => {
    const clientIP = getClientIP(socket);
    if (!checkAuthRate(clientIP)) { socket.emit('auth:error', 'ACCESS DENIED - Rate limit exceeded. Try again later.'); return; }
    if (!username || !password) { socket.emit('auth:error', 'Username and password required'); return; }
    const clean = sanitize(username.trim()).slice(0, 20);
    if (clean.length < 3) { socket.emit('auth:error', 'Username must be 3+ characters'); return; }
    if (password.length < 4) { socket.emit('auth:error', 'Password must be 4+ characters'); return; }
    if (findUser(clean)) { socket.emit('auth:error', 'Username taken'); return; }
    if (checkDeviceBan(deviceId, clean)) {
      socket.emit('auth:error', '🚫 تم حظر جهازك من الدخول إلى هذا الموقع');
      return;
    }
    // One account per device
    if (deviceId) {
      const existing = getDB().prepare('SELECT username FROM users WHERE device_id = ?').get(deviceId);
      if (existing) {
        socket.emit('auth:error', 'لا يمكنك إنشاء أكثر من حساب واحد من هذا المتصفح');
        return;
      }
    }
    const u = createUser(clean, password);
    if (deviceId) {
      getDB().prepare('UPDATE users SET device_id = ? WHERE id = ?').run(deviceId, u.id);
    }
    if (securityAnswer) {
      getDB().prepare('UPDATE users SET security_answer = ? WHERE id = ?').run(sanitize(securityAnswer).slice(0, 100), u.id);
    }
    enforceSingleSession(u.username);
    session.user = u;
    session.authed = true;
    const online = { id: socket.id, username: u.username, display: u.display_name, color: u.color, role: u.role, ip: u.ip, token: u.token, status: 'online' };
    onlineUsers.set(socket.id, online);
    socket.join('lobby');
    session.room = 'lobby';
    socket.emit('auth:success', { user: online, token: u.token, room: 'lobby' });
    socket.emit('room:joined', { room: 'lobby', topic: 'General discussion' });
    io.to('lobby').emit('message', { type: 'system', text: `${u.display_name} joined the channel`, time: now() });
    broadcastUsers();
    emitRoomUpdate();
    sendHistory(socket, 'lobby');
  });

  // ─── Guest Login ─────────────────────────────────────────────
  socket.on('auth:guest', ({ deviceId } = {}) => {
    const clientIP = getClientIP(socket);
    if (!checkAuthRate(clientIP)) { socket.emit('auth:error', 'ACCESS DENIED - Rate limit exceeded. Try again later.'); return; }
    if (checkDeviceBan(deviceId)) {
      socket.emit('auth:error', '🚫 تم حظر جهازك من الدخول إلى هذا الموقع');
      return;
    }
    // One account per device for guests too
    if (deviceId) {
      const existing = getDB().prepare('SELECT * FROM users WHERE device_id = ?').get(deviceId);
      if (existing) {
        // Log in as existing user instead of creating duplicate
        getDB().prepare('UPDATE users SET last_login = ? WHERE id = ?').run(Math.floor(Date.now()/1000), existing.id);
        session.user = existing;
        session.authed = true;
        enforceSingleSession(existing.username);
        const online = { id: socket.id, username: existing.username, display: existing.display_name, color: existing.color, role: existing.role, ip: existing.ip, token: existing.token, status: 'online', xp: existing.xp || 0, level: existing.level || 1 };
        onlineUsers.set(socket.id, online);
        socket.join('lobby');
        session.room = 'lobby';
        socket.emit('auth:success', { user: online, token: existing.token, room: 'lobby' });
        socket.emit('room:joined', { room: 'lobby', topic: 'General discussion' });
        const welcomeMsg = WELCOME_MSGS[Math.floor(Math.random() * WELCOME_MSGS.length)].replace('{user}', existing.display_name);
        socket.emit('message', { type: 'system', text: welcomeMsg, time: now() });
        io.to('lobby').emit('message', { type: 'system', text: `${existing.display_name} joined the channel`, time: now() });
        broadcastUsers();
        emitRoomUpdate();
        sendHistory(socket, 'lobby');
        return;
      }
    }
    var n = 1;
    var guestName;
    do {
      guestName = 'guest_' + Math.random().toString(36).substring(2, 7) + (n > 1 ? n : '');
      n++;
    } while (findUser(guestName));
    const guestPass = uuidv4().slice(0, 8);
    const u = createUser(guestName, guestPass);
    if (deviceId) {
      getDB().prepare('UPDATE users SET device_id = ? WHERE id = ?').run(deviceId, u.id);
    }
    enforceSingleSession(u.username);
    getDB().prepare('UPDATE users SET last_login = ? WHERE id = ?').run(Math.floor(Date.now()/1000), u.id);
    session.user = u;
    session.authed = true;
    const online = { id: socket.id, username: u.username, display: u.display_name, color: u.color, role: u.role, ip: u.ip, token: u.token, status: 'online', xp: u.xp || 0, level: u.level || 1 };
    onlineUsers.set(socket.id, online);
    socket.join('lobby');
    session.room = 'lobby';
    socket.emit('auth:success', { user: online, token: u.token, room: 'lobby', password: guestPass });
    socket.emit('room:joined', { room: 'lobby', topic: 'General discussion' });
    const welcomeMsg = WELCOME_MSGS[Math.floor(Math.random() * WELCOME_MSGS.length)].replace('{user}', u.display_name);
    socket.emit('message', { type: 'system', text: welcomeMsg, time: now() });
    io.to('lobby').emit('message', { type: 'system', text: `${u.display_name} joined the channel`, time: now() });
    broadcastUsers();
    emitRoomUpdate();
    sendHistory(socket, 'lobby');
  });

  // ─── Forgot Account (Forget Algorithm) ──────────────────────
  socket.on('auth:forgot', ({ username, securityAnswer }) => {
    if (!username) { socket.emit('auth:forgot:result', 'Enter your username'); return; }
    const u = findUser(username);
    if (!u) { socket.emit('auth:forgot:result', 'User not found'); return; }
    if (securityAnswer) {
      if (u.security_answer && u.security_answer.toLowerCase() === securityAnswer.toLowerCase()) {
        socket.emit('auth:forgot:result', '✓ IDENTITY VERIFIED. Username: ' + u.username + ' | Token: ' + u.token + ' | Contact admin to reset master key.');
      } else {
        socket.emit('auth:forgot:result', '✗ SECURITY ANSWER MISMATCH. Access denied.');
      }
    } else {
      socket.emit('auth:forgot:result', 'Account found! Enter your security answer to recover. Username: ' + u.username);
    }
  });

  // ─── Profile Data Request ──────────────────────────────────
  socket.on('profile:get', (username) => {
    if (!session.authed) return;
    const target = findUser(username);
    if (!target) return;
    const repData = getDB().prepare('SELECT SUM(value) as total, COUNT(*) as count FROM reputation WHERE target_username = ?').get(target.username);
    const rep = repData && repData.count > 0 ? (repData.total / repData.count).toFixed(1) : '0.0';
    socket.emit('profile:data', {
      username: target.username,
      xp: target.xp || 0,
      level: target.level || 1,
      rep: rep,
      last_login: target.last_login || null,
      favorite_cmds: target.favorite_cmds || '--'
    });
  });

  // ─── Chat ──────────────────────────────────────────────────
  socket.on('message', (text) => {
    if (!session.authed || !session.user) { socket.emit('auth:error', 'Not authenticated'); return; }
    if (session.user.muted_until > Date.now()) {
      socket.emit('message', { type: 'system', text: `[!] Muted for ${Math.ceil((session.user.muted_until - Date.now())/1000)}s`, time: now() });
      return;
    }
    if (!text.trim()) return;
    if (text.startsWith('/')) { handleCommand(socket, session, text); return; }
    if (spectatorSessions.has(socket.id)) { socket.emit('message', { type: 'system', text: '[!] Spectators cannot send messages', time: now() }); return; }
    if (!checkRate(socket.id)) {
      socket.emit('message', { type: 'system', text: '[!] Slow down!', time: now() });
      return;
    }
    // Reply Timer check
    if (globalReplyTimer > 0) {
      const last = replyTimerMap.get(socket.id) || 0;
      const elapsed = (Date.now() - last) / 1000;
      if (elapsed < globalReplyTimer) {
        socket.emit('message', { type: 'system', text: `[!] Wait ${Math.ceil(globalReplyTimer - elapsed)}s before sending`, time: now() });
        return;
      }
      replyTimerMap.set(socket.id, Date.now());
    }
    const safe = sanitize(text).slice(0, 1000);
    if (!safe) return;
    const msg = { type: 'user', user: session.user.display_name, color: session.user.color, text: safe, time: now(), id: socket.id };
    io.to(session.room).emit('message', msg);
    // Save to DB
    const db = getDB();
    const room = db.prepare('SELECT id FROM rooms WHERE name = ?').get(session.room);
    if (room) {
      db.prepare('INSERT INTO messages (room_id, user_id, username, color, text) VALUES (?,?,?,?,?)')
        .run(room.id, session.user.id, session.user.display_name, session.user.color, safe);
    }
    // Award XP for sending messages
    awardXP(socket.id, session.user.id, XP_PER_MSG);
  });

  // ─── Whisper ───────────────────────────────────────────────
  socket.on('whisper', ({ target, text }) => {
    if (!session.authed) return;
    const safeText = sanitize(text).slice(0, 500);
    const targetSocket = findOnlineSocket(target);
    if (!targetSocket) { socket.emit('message', { type: 'system', text: `[!] User '${sanitize(target)}' not found`, time: now() }); return; }
    const whisper = { type: 'whisper', from: session.user.display_name, text: safeText, time: now(), color: session.user.color };
    targetSocket.emit('message', { ...whisper, to: target });
    socket.emit('message', { ...whisper, to: target, type: 'whisper-sent' });
  });

  // ─── Rooms ─────────────────────────────────────────────────
  socket.on('room:join', (roomName) => {
    if (!session.authed) return;
    const clean = sanitize(roomName);
    const db = getDB();
    const room = db.prepare('SELECT * FROM rooms WHERE name = ?').get(clean);
    if (!room) { socket.emit('message', { type: 'system', text: `[!] Room '${clean}' not found`, time: now() }); return; }
    // Check ban
    const ban = db.prepare('SELECT * FROM bans WHERE username = ? AND room_id = ?').get(session.user.username, room.id);
    if (ban) { socket.emit('message', { type: 'system', text: '[!] You are banned from this room', time: now() }); return; }
    socket.leave(session.room);
    socket.join(clean);
    session.room = clean;
    socket.emit('room:joined', { room: clean, topic: room.topic || '' });
    io.to(clean).emit('message', { type: 'system', text: `${session.user.display_name} joined ${clean}`, time: now() });
    sendHistory(socket, clean);
    broadcastUsers();
    emitRoomUpdate();
  });

  socket.on('room:create', ({ name, topic, password, ephemeral }) => {
    if (!session.authed || session.user.role === 'banned') return;
    const clean = sanitize(name.trim()).slice(0, 30);
    if (!clean) { socket.emit('message', { type: 'system', text: '[!] Invalid room name', time: now() }); return; }
    const db = getDB();
    const exists = db.prepare('SELECT id FROM rooms WHERE name = ?').get(clean);
    if (exists) { socket.emit('message', { type: 'system', text: '[!] Room already exists', time: now() }); return; }
    createRoom(clean, sanitize(topic || '').slice(0, 100), session.user.id, password || null);
    if (ephemeral) {
      const mins = typeof ephemeral === 'number' ? ephemeral : EPHEMERAL_DEFAULT_MINUTES;
      ephemeralRooms.set(clean, { created: Date.now(), lifetimeMin: mins });
      socket.emit('message', { type: 'system', text: `[>] Ephemeral room #${clean} created (TTL: ${mins}min)`, time: now() });
    }
    socket.leave(session.room);
    socket.join(clean);
    session.room = clean;
    socket.emit('room:joined', { room: clean, topic: sanitize(topic || ''), ephemeral: !!ephemeral });
    io.to(clean).emit('message', { type: 'system', text: `[>] New room created: ${clean}`, time: now() });
    emitRoomUpdate();
    broadcastUsers();
    sendHistory(socket, clean);
  });

  socket.on('room:list', () => {
    socket.emit('room:list', getRooms());
  });

  // ─── Admin Socket Events ─────────────────────────────────────
  socket.on('admin:users', () => {
    if (!session.authed || session.user.role !== 'admin') return;
    const db = getDB();
    const users = db.prepare('SELECT id, username, display_name, role, color, ip, token, banned, muted_until, created_at FROM users ORDER BY created_at DESC').all();
    socket.emit('admin:users', users.map(u => ({ ...u, online: !!findOnlineSocket(u.username), muted: u.muted_until > Date.now() })));
  });

  socket.on('admin:ban', ({ userId }) => {
    if (!session.authed || session.user.role !== 'admin') return;
    const db = getDB();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) { socket.emit('message', { type: 'system', text: '[!] User not found', time: now() }); return; }
    db.prepare('UPDATE users SET banned = 1 WHERE id = ?').run(userId);
    db.prepare('INSERT INTO bans (username, room_id, banned_by, reason) VALUES (?,?,?,?)').run(user.username, null, session.user.id, 'Banned via admin panel');
    // Also ban the device if present
    if (user.device_id) {
      db.prepare('INSERT OR IGNORE INTO device_bans (device_id) VALUES (?)').run(user.device_id);
      db.prepare('UPDATE users SET device_banned = 1 WHERE id = ?').run(userId);
    }
    const ts = findOnlineSocket(user.username);
    if (ts) { ts.emit('message', {type:'system',text:'[!] YOU HAVE BEEN BANNED',time:now()}); ts.disconnect(); }
    socket.emit('message', {type:'system',text:`[!] ${user.username} BANNED`,time:now()});
    io.to('lobby').emit('admin:action', { action: 'ban', target: user.username, admin: session.user.display_name });
  });

  socket.on('admin:unban', ({ userId }) => {
    if (!session.authed || session.user.role !== 'admin') return;
    getDB().prepare('UPDATE users SET banned = 0 WHERE id = ?').run(userId);
    socket.emit('message', {type:'system',text:'[!] User unbanned',time:now()});
  });

  socket.on('admin:setrole', ({ userId, role }) => {
    if (!session.authed || session.user.role !== 'admin') return;
    if (!['user','mod','admin'].includes(role)) { socket.emit('message', {type:'system',text:'[!] Invalid role',time:now()}); return; }
    getDB().prepare('UPDATE users SET role = ? WHERE id = ?').run(role, userId);
    const u = getDB().prepare('SELECT username FROM users WHERE id = ?').get(userId);
    socket.emit('message', {type:'system',text:`[!] ${u.username} role set to ${role}`,time:now()});
    const ts = findOnlineSocket(u.username);
    if (ts && ts.data) ts.data.role = role;
    broadcastUsers();
  });

  socket.on('admin:rooms', () => {
    if (!session.authed || session.user.role !== 'admin') return;
    const db = getDB();
    const rooms = db.prepare('SELECT r.*, u.username as owner_name, (SELECT COUNT(*) FROM messages WHERE room_id = r.id) as msg_count FROM rooms r LEFT JOIN users u ON r.owner_id = u.id ORDER BY r.created_at ASC').all();
    socket.emit('admin:rooms', rooms);
  });

  socket.on('admin:clearroom', ({ roomName }) => {
    if (!session.authed || session.user.role !== 'admin') return;
    const db = getDB();
    const room = db.prepare('SELECT id FROM rooms WHERE name = ?').get(roomName);
    if (!room) { socket.emit('message', {type:'system',text:'[!] Room not found',time:now()}); return; }
    db.prepare('DELETE FROM messages WHERE room_id = ?').run(room.id);
    socket.emit('message', {type:'system',text:`[!] Messages cleared in ${sanitize(roomName)}`,time:now()});
  });

  socket.on('admin:deleteroom', ({ roomName }) => {
    if (!session.authed || session.user.role !== 'admin') return;
    if (roomName === 'lobby') { socket.emit('message', {type:'system',text:'[!] Cannot delete lobby',time:now()}); return; }
    const db = getDB();
    const room = db.prepare('SELECT id FROM rooms WHERE name = ?').get(roomName);
    if (!room) { socket.emit('message', {type:'system',text:'[!] Room not found',time:now()}); return; }
    db.prepare('DELETE FROM messages WHERE room_id = ?').run(room.id);
    db.prepare('DELETE FROM room_members WHERE room_id = ?').run(room.id);
    db.prepare('DELETE FROM bans WHERE room_id = ?').run(room.id);
    db.prepare('DELETE FROM rooms WHERE id = ?').run(room.id);
    io.emit('message', {type:'system',text:`[!] Room '${sanitize(roomName)}' deleted by admin`,time:now()});
    emitRoomUpdate();
  });

  socket.on('admin:export', ({ roomName }) => {
    if (!session.authed || session.user.role !== 'admin') return;
    const db = getDB();
    const room = db.prepare('SELECT id FROM rooms WHERE name = ?').get(roomName || session.room);
    if (!room) { socket.emit('message', {type:'system',text:'[!] Room not found',time:now()}); return; }
    const msgs = db.prepare('SELECT username, color, text, type, created_at FROM messages WHERE room_id = ? ORDER BY created_at ASC').all(room.id);
    socket.emit('admin:export', { room: roomName || session.room, messages: msgs, count: msgs.length });
  });

  socket.on('admin:blockip', ({ ip }) => {
    if (!session.authed || session.user.role !== 'admin') return;
    if (!ip || ip === '127.0.0.1' || ip === '::1') { socket.emit('message', {type:'system',text:'[!] Cannot block localhost',time:now()}); return; }
    BLOCKED_IPS.add(ip);
    intrusionLog.push(`[${now()}] BLOCKED IP: ${ip} by ${session.user.display_name}`);
    if (intrusionLog.length > 100) intrusionLog.shift();
    for (const [sid, sock] of io.sockets.sockets) {
      const sockIP = getClientIP(sock);
      if (sockIP === ip && !TRUSTED_IPS.has(ip)) { sock.disconnect(); }
    }
    socket.emit('message', {type:'system',text:`[!] IP ${ip} blocked`,time:now()});
    socket.emit('firewall:blocked', Array.from(BLOCKED_IPS));
  });

  socket.on('admin:unblockip', ({ ip }) => {
    if (!session.authed || session.user.role !== 'admin') return;
    BLOCKED_IPS.delete(ip);
    socket.emit('message', {type:'system',text:`[!] IP ${ip} unblocked`,time:now()});
    socket.emit('firewall:blocked', Array.from(BLOCKED_IPS));
  });

  socket.on('admin:broadcast', ({ text }) => {
    if (!session.authed || session.user.role !== 'admin') return;
    broadcastAllRooms(`[BROADCAST] ${session.user.display_name}: ${sanitize(text)}`);
  });

  socket.on('admin:lockdown', () => {
    if (!session.authed || session.user.role !== 'admin') return;
    lockdown = !lockdown;
    broadcastAllRooms(`[!] LOCKDOWN ${lockdown ? 'ACTIVATED' : 'DEACTIVATED'} by ${session.user.display_name}`);
    io.emit('admin:lockdown', lockdown);
    if (lockdown) {
      for (const [sid, sock] of io.sockets.sockets) {
        const ip = getClientIP(sock);
        if (!TRUSTED_IPS.has(ip)) { sock.disconnect(); }
      }
    }
  });

  socket.on('admin:messagesearch', ({ query }) => {
    if (!session.authed || session.user.role !== 'admin') return;
    if (!query) return;
    const db = getDB();
    const results = db.prepare(
      'SELECT m.username, m.text, m.color, m.type, m.created_at, r.name as room FROM messages m JOIN rooms r ON m.room_id = r.id WHERE LOWER(m.text) LIKE ? ORDER BY m.created_at DESC LIMIT 50'
    ).all(`%${query.toLowerCase()}%`);
    socket.emit('admin:messagesearch', results);
  });

  // ─── Typing ────────────────────────────────────────────────
  socket.on('typing', () => {
    if (!session.authed) return;
    socket.to(session.room).emit('typing', session.user.display_name);
    if (session.typingTimer) clearTimeout(session.typingTimer);
    session.typingTimer = setTimeout(() => socket.to(session.room).emit('stoptyping', session.user.display_name), TYPING_TIMEOUT);
  });

  socket.on('stoptyping', () => {
    if (session.user) socket.to(session.room).emit('stoptyping', session.user.display_name);
  });

  // ─── Live Typing ─────────────────────────────────────────────
  socket.on('typing:live', (text) => {
    if (!session.authed) return;
    socket.to(session.room).emit('typing:live', { user: session.user.display_name, text: sanitize(text).slice(0, 200), color: session.user.color });
  });

  // ─── Anonymous Mode ─────────────────────────────────────────
  socket.on('anonymous:on', () => {
    if (!session.authed) return;
    session.anonymous = true;
    session.originalName = session.user.display_name;
    const anonName = 'anon_' + Math.random().toString(36).substring(2, 7);
    session.user.display_name = anonName;
    if (onlineUsers.has(socket.id)) {
      onlineUsers.get(socket.id).display = anonName;
      onlineUsers.get(socket.id).color = '#0f0';
    }
    broadcastUsers();
    socket.emit('message', { type: 'system', text: `[>] ANONYMOUS MODE ACTIVATED as ${anonName}`, time: now() });
    socket.emit('anonymous:status', { active: true, name: anonName });
  });

  socket.on('anonymous:off', () => {
    if (!session.authed || !session.anonymous) return;
    session.anonymous = false;
    session.user.display_name = session.originalName || session.user.display_name;
    if (onlineUsers.has(socket.id)) {
      onlineUsers.get(socket.id).display = session.user.display_name;
    }
    broadcastUsers();
    socket.emit('message', { type: 'system', text: `[>] ANONYMOUS MODE DEACTIVATED`, time: now() });
    socket.emit('anonymous:status', { active: false, name: session.user.display_name });
  });

  // ─── File Upload ────────────────────────────────────────────
  socket.on('file:upload', (data) => {
    if (!session.authed) return;
    if (!data || !data.name || !data.buffer) { socket.emit('message', {type:'system',text:'[!] Invalid file',time:now()}); return; }
    const ext = data.name.split('.').pop().toLowerCase();
    const maxSize = 2 * 1024 * 1024;
    if (data.buffer.length > maxSize) { socket.emit('message', {type:'system',text:'[!] File too large (max 2MB)',time:now()}); return; }
    const isImage = ['png','jpg','jpeg','gif','webp'].includes(ext);
    io.to(session.room).emit('message', {
      type: 'file', user: session.user.display_name, color: session.user.color,
      fileName: sanitize(data.name), fileData: data.buffer,
      isImage, ext, size: data.buffer.length, time: now(), id: socket.id,
    });
    const db = getDB();
    const room = db.prepare('SELECT id FROM rooms WHERE name = ?').get(session.room);
    if (room) {
      db.prepare('INSERT INTO messages (room_id, user_id, username, color, text, type) VALUES (?,?,?,?,?,?)')
        .run(room.id, session.user.id, session.user.display_name, session.user.color, `[FILE] ${data.name}`, 'file');
    }
  });

  // ─── PM History ─────────────────────────────────────────────
  socket.on('pm:history', ({ withUser }) => {
    if (!session.authed) return;
    const db = getDB();
    const room = db.prepare('SELECT id FROM rooms WHERE name = ?').get(session.room);
    if (!room) return;
    const pms = db.prepare(`
      SELECT username, color, text, type, created_at FROM messages
      WHERE room_id = ? AND type = 'whisper'
      AND (username = ? OR username = ?)
      ORDER BY created_at DESC LIMIT 20
    `).all(room.id, session.user.display_name, withUser);
    socket.emit('pm:history', pms.reverse());
  });

  // ─── Server Stats ───────────────────────────────────────────
  socket.on('server:stats', () => {
    socket.emit('server:stats', getServerStats());
  });

  setInterval(() => {
    socket.emit('server:stats', getServerStats());
  }, 10000);

  // ─── Lobby Stats (live indicators) ──────────────────────────
  setInterval(() => {
    socket.emit('lobby:stats', {
      onlineUsers: onlineUsers.size,
      attemptsBlocked: BLOCKED_IPS.size + authRateMap.size,
      lastIntrusion: intrusionLog.length > 0 ? intrusionLog[intrusionLog.length - 1] : 'None',
      totalRooms: getDB().prepare('SELECT COUNT(*) as c FROM rooms').get().c,
      totalMessages: getDB().prepare('SELECT COUNT(*) as c FROM messages').get().c,
    });
  }, 5000);

  // ─── User Status Change ─────────────────────────────────────
  socket.on('user:status', (status) => {
    const user = onlineUsers.get(socket.id);
    if (user && ['online', 'away', 'busy', 'invisible'].includes(status)) {
      user.status = status;
      broadcastUsers();
      if (status === 'invisible') {
        io.to(session.room).emit('message', { type: 'system', text: `${user.display} went invisible`, time: now() });
      }
    }
  });

  // ─── Reaction ───────────────────────────────────────────────
  socket.on('reaction', (data) => {
    io.to(session.room).emit('reaction', { msgId: data.msgId, emoji: data.emoji, user: session.user?.display_name || 'unknown' });
  });

  // ─── Disconnect ────────────────────────────────────────────
  socket.on('disconnect', () => {
    clearSocketIntervals(socket.id);
    rateMap.delete(socket.id);
    replyTimerMap.delete(socket.id);
    xpRateMap.delete(socket.id);
    if (session.typingTimer) clearTimeout(session.typingTimer);
    if (session.user) {
      const key = session.user.username.toLowerCase();
      // Only delete if this socket owns the mapping
      if (userSockets.get(key) === socket.id) userSockets.delete(key);
      io.to(session.room).emit('message', { type: 'system', text: `${session.user.display_name} left the channel`, time: now() });
    }
    onlineUsers.delete(socket.id);
    broadcastUsers();
    emitRoomUpdate();
    console.log(`[-] ${socket.id} (${session.ip})`);
  });

  function sendHistory(sock, roomName) {
    const db = getDB();
    const room = db.prepare('SELECT id FROM rooms WHERE name = ?').get(roomName);
    if (!room) return;
    const msgs = db.prepare('SELECT username, color, text, type, created_at FROM messages WHERE room_id = ? ORDER BY created_at DESC LIMIT 200').all(room.id);
    msgs.reverse().forEach((m) => {
      sock.emit('message', {
        type: m.type, user: m.username, color: m.color, text: m.text,
        time: new Date(m.created_at * 1000).toLocaleTimeString(), id: null,
      });
    });
  }
});

// ─── Commands ────────────────────────────────────────────────
function handleCommand(socket, session, text) {
  const parts = text.slice(1).split(' ');
  let cmd = parts[0].toLowerCase();
  const args = parts.slice(1);
  const respond = (msg) => socket.emit('message', { type: 'system', text: msg, time: now() });
  const broadcast = (msg) => io.to(session.room).emit('message', { type: 'system', text: msg, time: now() });

  // Command History
  if (!cmdHistoryMap.has(socket.id)) cmdHistoryMap.set(socket.id, []);
  const hist = cmdHistoryMap.get(socket.id);
  if (text.startsWith('!!')) {
    const prev = hist[hist.length - 1];
    if (!prev) { respond('[!] No previous command'); return; }
    handleCommand(socket, session, prev);
    return;
  }
  if (cmd !== 'help' && cmd !== 'clear') {
    hist.push(text);
    if (hist.length > CMD_HISTORY_MAX) hist.shift();
  }

  switch (cmd) {
    case 'help':
      const isAdmin = session.user.role === 'admin';
      const helpCmds = [
        '╔══════════════════════════════════════╗',
        '║    AtlasRoot  COMMANDS v6          ║',
        '╠══════════════════════════════════════╣',
        '║ /help         - This help            ║',
        '║ /nick &lt;name&gt;  - Change display name  ║',
        '║ /color &lt;hex&gt;  - Change color         ║',
        '║ /whisper &lt;u&gt; &lt;m&gt; - Private message   ║',
        '║ /ai &lt;msg&gt;    - AI analysis          ║',
        '║ /grep &lt;patt&gt; - Regex message search  ║',
        '║ /sound &lt;fx&gt;  - Play sound           ║',
        '║ /reply &lt;u&gt;|&lt;o&gt;|&lt;r&gt; - Quote reply    ║',
        '║ /ping &lt;host&gt;  - Ping target          ║',
        '║ /scan        - Scan network          ║',
        '║ /hack &lt;t&gt;    - Hack target          ║',
        '║ /clear       - Clear chat            ║',
        '║ /whois &lt;u&gt;   - User info            ║',
        '║ /firewall    - Firewall status       ║',
        '║ /room:create &lt;n&gt; &lt;topic&gt; - New room ║',
        '║ /join &lt;room&gt; - Join room            ║',
        '║ /users       - List online           ║',
        '║ /uptime      - Server uptime         ║',
        '║ /time        - Server time           ║',
        '║ /encrypt &lt;t&gt; - Encrypt message      ║',
        '║ /search &lt;t&gt;  - Search messages       ║',
        '║ /netstat     - Network stats         ║',
        '║ /status      - Server stats          ║',
        '║ /title &lt;t&gt;   - Change room topic    ║',
        '║ /leave       - Back to lobby         ║',
        '║ /create &lt;n&gt;  - Create room          ║',
        '║ /room        - Room management       ║',
        '╠══════════════════════════════════════╣',
        '║      XP &amp; RANK SYSTEM                ║',
        '╠══════════════════════════════════════╣',
        '║ /profile [u] - View user profile     ║',
        '║ /rank        - Top 10 rankings       ║',
        '║ /unlock [f]  - Unlock features       ║',
        ...(isAdmin ? [
          '╠══════════════════════════════════════╣',
          '║      ADMIN COMMANDS                  ║',
          '╠══════════════════════════════════════╣',
          '║ /ban &lt;u&gt;     - Ban user             ║',
          '║ /unban &lt;u&gt;   - Unban user           ║',
          '║ /kick &lt;u&gt;    - Kick user            ║',
          '║ /mute &lt;u&gt; &lt;m&gt; - Mute user           ║',
          '║ /setrole &lt;u&gt; &lt;r&gt; - Set user role    ║',
          '║ /announce &lt;m&gt; - Announce to room    ║',
          '║ /sys &lt;m&gt;     - System broadcast     ║',
          '║ /banip &lt;ip&gt;  - Block IP address     ║',
          '║ /unbanip &lt;ip&gt; - Unblock IP          ║',
          '║ /blocked     - List blocked IPs     ║',
          '║ /clearroom   - Clear room messages  ║',
          '║ /lockdown    - Toggle server lockdown║',
          '║ /export      - Export room messages  ║',
          '║ /whois &lt;u&gt;   - Full user info       ║',
          '║ /motd &lt;m&gt;    - Message of the day   ║',
          '║ /fake_maintenance on|off - Fake maint║',
          '║ /del &lt;id&gt;    - Delete message        ║',
          '║ /export_security_logs - Export logs ║',
        ] : []),
        '╚══════════════════════════════════════╝',
      ];
      respond(helpCmds.map(l => l + '<br>').join(''));
      break;

    case 'nick':
      if (!args[0]) { respond('Usage: /nick &lt;name&gt;'); return; }
      const old = session.user.display_name;
      session.user.display_name = sanitize(args[0]).slice(0, 20);
      getDB().prepare('UPDATE users SET display_name = ? WHERE id = ?').run(session.user.display_name, session.user.id);
      if (onlineUsers.has(socket.id)) onlineUsers.get(socket.id).display = session.user.display_name;
      broadcastUsers();
      broadcast(`${old} is now known as ${session.user.display_name}`);
      break;

    case 'color':
      if (!args[0] || !/^#[0-9a-f]{3,6}$/i.test(args[0])) { respond('Usage: /color &lt;hex&gt;'); return; }
      session.user.color = args[0];
      getDB().prepare('UPDATE users SET color = ? WHERE id = ?').run(args[0], session.user.id);
      if (onlineUsers.has(socket.id)) onlineUsers.get(socket.id).color = args[0];
      broadcastUsers();
      respond(`[+] Color: ${args[0]}`);
      break;

    case 'clear':
      socket.emit('clear');
      break;

    case 'reply':
      if (!args[0]) { respond('Usage: /reply &lt;user&gt; | &lt;original&gt; | &lt;reply&gt;'); return; }
      const replyParts = args.join(' ').split('|').map(s => s.trim());
      if (replyParts.length < 3) { respond('[!] Usage: /reply user | original text | reply text'); return; }
      const replyTarget = replyParts[0];
      const replyOrig = replyParts[1];
      const replyMsg = replyParts.slice(2).join(' | ');
      const replySender = session.user.display_name;
      const replyColor = session.user.color || '#0f0';
      broadcast(
        `${replySender} ↪ ${replyTarget}: "${sanitize(replyOrig.slice(0,60))}" — ${sanitize(replyMsg)}`
      );
      break;

    case 'whisper':
      if (args.length < 2) { respond('Usage: /whisper &lt;user&gt; &lt;msg&gt;'); return; }
      const targetUser = args[0];
      const whisperText = args.slice(1).join(' ');
      const safeWT = sanitize(whisperText).slice(0, 500);
      const whisperTargetSock = findOnlineSocket(targetUser);
      if (!whisperTargetSock) { respond(`[!] User '${sanitize(targetUser)}' not found`); return; }
      const wMsg = { type: 'whisper', from: session.user.display_name, text: safeWT, time: now(), color: session.user.color };
      whisperTargetSock.emit('message', { ...wMsg, to: targetUser });
      socket.emit('message', { ...wMsg, to: targetUser, type: 'whisper-sent' });
      break;

    case 'join':
      if (!args[0]) { respond('Usage: /join &lt;room&gt;'); return; }
      socket.emit('room:join', args[0]);
      break;

    case 'users':
      const list = Array.from(onlineUsers.values()).map(u => `${u.display} [${u.role}]`).join(', ');
      respond(`[>] Online: ${list || 'none'}`);
      break;

    case 'ping': {
      const host = sanitize(args[0] || 'localhost');
      respond(`PING ${host} (${fakeIP()}): 56 bytes`);
      let seq = 1;
      const id = setInterval(() => {
        if (!onlineUsers.has(socket.id)) { clearInterval(id); return; }
        respond(`64 bytes from ${host}: icmp_seq=${seq} ttl=64 time=${Math.floor(Math.random() * 80 + 10)}ms`);
        seq++;
        if (seq > 4) { clearInterval(id); socketIntervals.get(socket.id)?.delete(id); respond(`--- ${host} ping statistics ---<br>4 packets transmitted, 4 received, 0% packet loss`); }
      }, 600);
      addInterval(socket.id, id);
      break;
    }

    case 'scan': {
      respond('[>] Scanning 10.0.0.0/24...');
      let found = 0;
      const id = setInterval(() => {
        if (!onlineUsers.has(socket.id)) { clearInterval(id); return; }
        if (found < 6) {
          const ip = `10.0.0.${Math.floor(Math.random()*254+1)}`;
          const ports = [22, 80, 443, 3306, 8080, 8443];
          const services = ['SSH', 'HTTP', 'HTTPS', 'MySQL', 'HTTP-Proxy', 'Redis'];
          const oses = ['Linux 6.1', 'Win Server 2022', 'FreeBSD 13', 'macOS 14'];
          respond(`[+] ${ip}:${ports[found]} open (${services[found]}) - ${oses[found % oses.length]}`);
          found++;
        } else { clearInterval(id); socketIntervals.get(socket.id)?.delete(id); respond(`[>] Found ${found} hosts`); }
      }, 600);
      addInterval(socket.id, id);
      break;
    }

    case 'hack': {
      const target = sanitize(args[0] || 'UNKNOWN');
      const phrases = [
        'Breaching firewall...', 'Bypassing IDS...', 'Injecting payload...',
        'Escalating privileges...', 'Cracking hash...', 'Root shell obtained!',
        'Dumping credentials...', 'Clearing logs...', 'Access granted!',
      ];
      respond(`[>] Hacking ${target}...`);
      let step = 0;
      const id = setInterval(() => {
        if (!onlineUsers.has(socket.id)) { clearInterval(id); return; }
        if (step < phrases.length) {
          respond(`[${'#'.repeat(step+1)}${'.'.repeat(phrases.length-step-1)}] ${phrases[step]}`);
          step++;
        } else { clearInterval(id); socketIntervals.get(socket.id)?.delete(id); respond(`[✓] ${target} compromised. Token: ${genToken()}`); }
      }, 350);
      addInterval(socket.id, id);
      break;
    }

    case 'room:create':
      if (args.length < 1) { respond('Usage: /room:create &lt;name&gt; [topic]'); return; }
      socket.emit('room:create', { name: args[0], topic: args.slice(1).join(' ') });
      break;

    case 'kick':
      if (session.user.role !== 'admin' && session.user.role !== 'mod') { respond('[!] Admin only'); return; }
      if (!args[0]) { respond('Usage: /kick &lt;user&gt;'); return; }
      const targetSock = findOnlineSocket(args[0]);
      if (targetSock) {
        targetSock.disconnect();
        broadcast(`[!] ${args[0]} kicked by ${session.user.display_name}`);
        io.to('lobby').emit('admin:action', { action: 'kick', target: args[0], admin: session.user.display_name });
      } else { respond('[!] User not found'); }
      break;

    case 'ban':
      if (session.user.role !== 'admin') { respond('[!] Admin only'); return; }
      if (!args[0]) { respond('Usage: /ban &lt;user&gt;'); return; }
      const bannedUser = findUser(args[0]);
      if (!bannedUser) { respond('[!] User not found'); return; }
      getDB().prepare('UPDATE users SET banned = 1 WHERE id = ?').run(bannedUser.id);
      getDB().prepare('INSERT INTO bans (username, room_id, banned_by, reason) VALUES (?,?,?,?)')
        .run(args[0], null, session.user.id, args.slice(1).join(' ') || 'No reason');
      if (bannedUser.device_id) {
        getDB().prepare('INSERT OR IGNORE INTO device_bans (device_id) VALUES (?)').run(bannedUser.device_id);
        getDB().prepare('UPDATE users SET device_banned = 1 WHERE id = ?').run(bannedUser.id);
      }
      const ts = findOnlineSocket(args[0]);
      if (ts) { ts.emit('message', {type:'system',text:'[!] YOU HAVE BEEN BANNED',time:now()}); ts.disconnect(); }
      broadcast(`[!] ${args[0]} BANNED by ${session.user.display_name}`);
      io.to('lobby').emit('admin:action', { action: 'ban', target: args[0], admin: session.user.display_name });
      break;

    case 'mute':
      if (session.user.role !== 'admin' && session.user.role !== 'mod') { respond('[!] Mod+ only'); return; }
      if (args.length < 2 || !parseInt(args[1])) { respond('Usage: /mute &lt;user&gt; &lt;minutes&gt;'); return; }
      const muteUser = findUser(args[0]);
      if (!muteUser) { respond('[!] User not found'); return; }
      const muteMin = parseInt(args[1]);
      getDB().prepare('UPDATE users SET muted_until = ? WHERE id = ?').run(Date.now() + muteMin*60000, muteUser.id);
      const muteSock = findOnlineSocket(args[0]);
      if (muteSock) muteSock.emit('message', {type:'system',text:`[!] MUTED for ${muteMin} min by ${session.user.display_name}`,time:now()});
      broadcast(`[!] ${args[0]} MUTED ${muteMin}min by ${session.user.display_name}`);
      io.to('lobby').emit('admin:action', { action: 'mute', target: args[0], admin: session.user.display_name, minutes: muteMin });
      break;

    case 'announce':
      if (session.user.role !== 'admin') { respond('[!] Admin only'); return; }
      if (!args[0]) { respond('Usage: /announce &lt;message&gt;'); return; }
      broadcast(`[ANNOUNCE] ${session.user.display_name}: ${sanitize(args.join(' '))}`);
      break;

    case 'netstat':
      const stats = getServerStats();
      const netstat = Array.from(onlineUsers.values()).slice(0, 15);
      const iface = ['eth0','wlan0','tun0','lo'];
      respond(
        '╔══════════════════════════════════════╗<br>' +
        '║        NETWORK MONITOR v4            ║<br>' +
        '╠══════════════════════════════════════╣<br>' +
        `║ Uptime: ${Math.floor(stats.uptime/60)}m ${stats.uptime%60}s             ║<br>` +
        `║ Online: ${stats.usersOnline} | Total: ${stats.totalUsers}       ║<br>` +
        `║ Memory: ${stats.memory}MB | Msgs: ${stats.totalMessages}   ║<br>` +
        `║ Interfaces: ${iface.join(', ')}       ║<br>` +
        `║ Active connections: ${stats.usersOnline * 3 + 12}          ║<br>` +
        `║ Packets in: ${Math.floor(Math.random()*99999)} | out: ${Math.floor(Math.random()*99999)}  ║<br>` +
        '╚══════════════════════════════════════╝'
      );
      break;

    case 'encrypt':
      if (!args[0]) { respond('Usage: /encrypt &lt;message&gt;'); return; }
      const raw = args.join(' ');
      const encoded = Buffer.from(raw).toString('base64');
      respond(`[🔐 ENCRYPTED] ${encoded.slice(0, 60)}...`);
      setTimeout(() => {
        respond(`[🔓 DECRYPTED] ${raw}`);
      }, 2000);
      break;

    case 'search':
      if (!args[0]) { respond('Usage: /search &lt;term&gt;'); return; }
      const term = args.join(' ').toLowerCase();
      const db = getDB();
      const room = db.prepare('SELECT id FROM rooms WHERE name = ?').get(session.room);
      if (!room) { respond('[!] No messages'); return; }
      const results = db.prepare(
        'SELECT username, text, color FROM messages WHERE room_id = ? AND LOWER(text) LIKE ? ORDER BY created_at DESC LIMIT 10'
      ).all(room.id, `%${term}%`);
      if (results.length === 0) { respond(`[!] No results for "${sanitize(term)}"`); return; }
      respond(`[>] ${results.length} results for "${sanitize(term)}":`);
      results.forEach((m) => {
        respond(`&lt;${m.username}&gt; ${sanitize(m.text).slice(0,100)}`);
      });
      break;

    case 'blocked':
      if (session.user.role !== 'admin') { respond('[!] Admin only'); return; }
      respond(
        '╔══════════════════════════════════════╗<br>' +
        '║        BLOCKED IPs                    ║<br>' +
        '╠══════════════════════════════════════╣<br>' +
        (BLOCKED_IPS.size > 0
          ? Array.from(BLOCKED_IPS).map(ip => `║ > ${ip.padEnd(35)} ║<br>`).join('')
          : '║  No blocked IPs                    ║<br>') +
        '╚══════════════════════════════════════╝'
      );
      socket.emit('firewall:blocked', Array.from(BLOCKED_IPS));
      break;

    case 'firewall':
      respond(
        '╔══════════════════════════════════════╗<br>' +
        '║        FIREWALL STATUS v3            ║<br>' +
        '╠══════════════════════════════════════╣<br>' +
        `║ Trusted IPs: ${Array.from(TRUSTED_IPS).slice(0,5).join(', ')}... ║<br>` +
        `║ Blocked IPs: ${BLOCKED_IPS.size > 0 ? Array.from(BLOCKED_IPS).join(', ') : 'none'} ║<br>` +
        `║ Admin whitelist: ${ADMIN_WHITELIST.length > 0 ? ADMIN_WHITELIST.join(', ') : 'ALLOW ALL'} ║<br>` +
        `║ Auth rate: ${AUTH_RATE_MAX}/min per IP        ║<br>` +
        `║ Online: ${onlineUsers.size} users                    ║<br>` +
        '╚══════════════════════════════════════╝'
      );
      break;

    case 'ai':
      if (!args[0]) { respond('Usage: /ai &lt;message&gt;'); return; }
      const query = args.join(' ');
      respond(`[AI] ${session.user.display_name}: ${sanitize(query)}`);
      const aiResponses = [
        'Analysis complete. No threats detected.',
        'Processing your request... System secure.',
        'I have logged this query for future reference.',
        'Accessing neural network... Query understood.',
        'Searching database... No matching records found.',
        'Alert: Unusual activity detected. Monitoring...',
        'Encryption verified. Channel is secure.',
        'Cross-referencing with known patterns... Done.',
        'AI core: Request processed successfully.',
        'Warning: This action will be logged.',
        'Decrypting payload... Payload integrity verified.',
        'Tracing connection... Route secured through 3 proxies.',
        'Neural net analysis: 99.7% confidence. No threats.',
        'Backup systems online. Redundancy active.',
        'The firewall is holding. All clear.',
      ];
      setTimeout(() => {
        const resp = aiResponses[Math.floor(Math.random() * aiResponses.length)];
        broadcast(`[🤖 AI] ${resp}`);
      }, 1500 + Math.random() * 1500);
      break;

    case 'grep':
      if (!args[0]) { respond('Usage: /grep &lt;pattern&gt;'); return; }
      try {
        const regex = new RegExp(args.join(' '), 'i');
        const db = getDB();
        const gRoom = db.prepare('SELECT id FROM rooms WHERE name = ?').get(session.room);
        if (!gRoom) { respond('[!] No messages'); return; }
        const allMsgs = db.prepare('SELECT username, color, text FROM messages WHERE room_id = ? ORDER BY created_at DESC LIMIT 200').all(gRoom.id);
        const matches = allMsgs.filter(m => regex.test(m.text)).slice(0, 10);
        if (matches.length === 0) { respond(`[>] No matches for /${sanitize(args.join(' '))}/`); return; }
        respond(`[>] ${matches.length} matches for /${sanitize(args.join(' '))}/:`);
        matches.forEach(m => respond(`<${m.username}> ${sanitize(m.text).slice(0,80)}`));
      } catch (e) { respond('[!] Invalid regex pattern'); }
      break;

    case 'whois':
      if (!args[0]) { respond('Usage: /whois &lt;user&gt;'); return; }
      const whoisUser = findUser(args[0]);
      if (!whoisUser) { respond('[!] User not found in database'); return; }
      const whoisOnline = findOnlineSocket(args[0]);
      const isAdminReq = session.user.role === 'admin';
      respond(
        '╔══════════════════════════════════════╗<br>' +
        '║           USER INFO                  ║<br>' +
        '╠══════════════════════════════════════╣<br>' +
        `║ Username: ${sanitize(whoisUser.username).padEnd(26)} ║<br>` +
        `║ Role: ${(whoisUser.role || 'user').toUpperCase().padEnd(30)} ║<br>` +
        `║ Color: ${(whoisUser.color || '#0f0').padEnd(29)} ║<br>` +
        `║ Status: ${(whoisOnline ? 'ONLINE' : 'OFFLINE').padEnd(28)} ║<br>` +
        (isAdminReq ? `║ IP: ${(whoisUser.ip || 'N/A').padEnd(32)} ║<br>` : '') +
        (isAdminReq ? `║ Token: ${(whoisUser.token || 'N/A').slice(0, 8).padEnd(28)} ║<br>` : '') +
        `║ Created: ${new Date((whoisUser.created_at || 0) * 1000).toLocaleDateString().padEnd(27)} ║<br>` +
        '╚══════════════════════════════════════╝'
      );
      break;

    case 'sound':
      if (!args[0]) { respond('Usage: /sound &lt;effect&gt; (beep, alert, error, success, scan, boot, join, leave, notify, pop, powerup, powerdown, whisper)'); return; }
      socket.emit('playsound', args[0].toLowerCase());
      respond(`[>] Playing sound: ${sanitize(args[0])}`);
      break;

    case 'uptime':
      const st = getServerStats();
      const days = Math.floor(st.uptime / 86400);
      const hours = Math.floor((st.uptime % 86400) / 3600);
      const mins = Math.floor((st.uptime % 3600) / 60);
      const secs = st.uptime % 60;
      respond(`[>] Uptime: ${days}d ${hours}h ${mins}m ${secs}s | Memory: ${st.memory}MB | Messages: ${st.totalMessages}`);
      break;

    case 'time':
      respond(`[>] Server time: ${new Date().toLocaleString()}`);
      break;

    // ─── New Admin Commands ────────────────────────────────────
    case 'unban':
      if (session.user.role !== 'admin') { respond('[!] Admin only'); return; }
      if (!args[0]) { respond('Usage: /unban &lt;user&gt;'); return; }
      const unbanUser = findUser(args[0]);
      if (!unbanUser) { respond('[!] User not found'); return; }
      getDB().prepare('UPDATE users SET banned = 0 WHERE id = ?').run(unbanUser.id);
      respond(`[+] ${args[0]} unbanned`);
      break;

    case 'setrole':
      if (session.user.role !== 'admin') { respond('[!] Admin only'); return; }
      if (args.length < 2) { respond('Usage: /setrole &lt;user&gt; &lt;user|mod|admin&gt;'); return; }
      if (!['user','mod','admin'].includes(args[1])) { respond('[!] Invalid role. Use: user, mod, admin'); return; }
      const roleUser = findUser(args[0]);
      if (!roleUser) { respond('[!] User not found'); return; }
      getDB().prepare('UPDATE users SET role = ? WHERE id = ?').run(args[1], roleUser.id);
      for (const [sid, u] of onlineUsers) {
        if (u.username.toLowerCase() === args[0].toLowerCase()) { u.role = args[1]; break; }
      }
      broadcastUsers();
      respond(`[+] ${args[0]} role set to ${args[1]}`);
      break;

    case 'clearroom':
      if (session.user.role !== 'admin' && session.user.role !== 'mod') { respond('[!] Mod+ only'); return; }
      const crRoom = getDB().prepare('SELECT id FROM rooms WHERE name = ?').get(session.room);
      if (!crRoom) { respond('[!] Room not found'); return; }
      getDB().prepare('DELETE FROM messages WHERE room_id = ?').run(crRoom.id);
      broadcast('[!] Room messages cleared by mod');
      break;

    case 'banip':
      if (session.user.role !== 'admin') { respond('[!] Admin only'); return; }
      if (!args[0]) { respond('Usage: /banip &lt;ip&gt;'); return; }
      if (args[0] === '127.0.0.1' || args[0] === '::1') { respond('[!] Cannot block localhost'); return; }
      BLOCKED_IPS.add(args[0]);
      for (const [sid, sock] of io.sockets.sockets) {
        const sockIP = getClientIP(sock);
        if (sockIP === args[0] && !TRUSTED_IPS.has(args[0])) { sock.disconnect(); }
      }
      respond(`[!] IP ${args[0]} blocked`);
      socket.emit('firewall:blocked', Array.from(BLOCKED_IPS));
      break;

    case 'unbanip':
      if (session.user.role !== 'admin') { respond('[!] Admin only'); return; }
      if (!args[0]) { respond('Usage: /unbanip &lt;ip&gt;'); return; }
      BLOCKED_IPS.delete(args[0]);
      respond(`[!] IP ${args[0]} unblocked`);
      socket.emit('firewall:blocked', Array.from(BLOCKED_IPS));
      break;

    case 'sys':
      if (session.user.role !== 'admin') { respond('[!] Admin only'); return; }
      if (!args[0]) { respond('Usage: /sys &lt;message&gt;'); return; }
      broadcastAllRooms(`[SYSTEM] ${sanitize(args.join(' '))}`);
      break;

    case 'export':
      if (session.user.role !== 'admin') { respond('[!] Admin only'); return; }
      const exportRoom = getDB().prepare('SELECT id FROM rooms WHERE name = ?').get(args[0] || session.room);
      if (!exportRoom) { respond('[!] Room not found'); return; }
      const exportMsgs = getDB().prepare('SELECT username, color, text, type, created_at FROM messages WHERE room_id = ? ORDER BY created_at ASC').all(exportRoom.id);
      respond(`[>] Exporting ${exportMsgs.length} messages from ${args[0] || session.room}...`);
      socket.emit('admin:export', { room: args[0] || session.room, messages: exportMsgs, count: exportMsgs.length });
      break;

    case 'lockdown':
      if (session.user.role !== 'admin') { respond('[!] Admin only'); return; }
      lockdown = !lockdown;
      broadcastAllRooms(`[!] LOCKDOWN ${lockdown ? 'ACTIVATED' : 'DEACTIVATED'} by ${session.user.display_name}`);
      if (lockdown) {
        for (const [sid, sock] of io.sockets.sockets) {
          const ip = getClientIP(sock);
          if (!TRUSTED_IPS.has(ip)) { sock.disconnect(); }
        }
      }
      break;

    case 'motd':
      if (session.user.role !== 'admin') { respond('[!] Admin only'); return; }
      if (!args[0]) { respond('Usage: /motd &lt;message&gt;'); return; }
      broadcastAllRooms(`[MOTD] ${sanitize(args.join(' '))}`);
      break;

    case 'status':
      const svSt = getServerStats();
      respond(
        '╔══════════════════════════════════════╗<br>' +
        '║        SERVER STATUS                  ║<br>' +
        '╠══════════════════════════════════════╣<br>' +
        `║ Uptime: ${Math.floor(svSt.uptime/60)}m ${svSt.uptime%60}s                 ║<br>` +
        `║ Online: ${svSt.usersOnline} | Total: ${svSt.totalUsers}           ║<br>` +
        `║ Messages: ${svSt.totalMessages} | Rooms: ${svSt.totalRooms}     ║<br>` +
        `║ Memory: ${svSt.memory}MB                          ║<br>` +
        '╚══════════════════════════════════════╝'
      );
      break;

    case 'title':
      if (session.user.role !== 'admin' && session.user.role !== 'mod') { respond('[!] Mod+ only'); return; }
      if (!args[0]) { respond('Usage: /title &lt;new topic&gt;'); return; }
      const newTopic = sanitize(args.join(' ')).slice(0, 100);
      const curRoom = getDB().prepare('SELECT id FROM rooms WHERE name = ?').get(session.room);
      if (curRoom) {
        getDB().prepare('UPDATE rooms SET topic = ? WHERE id = ?').run(newTopic, curRoom.id);
        io.to(session.room).emit('room:topic', { room: session.room, topic: newTopic });
        broadcast(`[!] Topic changed to: ${newTopic}`);
      }
      break;

    case 'leave':
      if (session.room === 'lobby') { respond('[!] Already in lobby'); return; }
      socket.leave(session.room);
      session.room = 'lobby';
      socket.join('lobby');
      socket.emit('room:joined', { room: 'lobby', topic: 'General discussion' });
      io.to('lobby').emit('message', { type: 'system', text: `${session.user.display_name} returned to lobby`, time: now() });
      sendHistory(socket, 'lobby');
      broadcastUsers();
      emitRoomUpdate();
      break;

    case 'create':
      if (args.length < 1) { respond('Usage: /create &lt;name&gt; [topic]'); return; }
      socket.emit('room:create', { name: args[0], topic: args.slice(1).join(' ') });
      break;

    case 'room':
      if (args.length < 1) { respond('Usage: /room &lt;create|join|list&gt; [args]'); return; }
      const roomSub = args[0].toLowerCase();
      if (roomSub === 'create' && args.length > 1) {
        socket.emit('room:create', { name: args[1], topic: args.slice(2).join(' ') });
      } else if (roomSub === 'join' && args.length > 1) {
        socket.emit('room:join', args.slice(1).join(' '));
      } else if (roomSub === 'list') {
        socket.emit('room:list', getRooms());
      } else {
        respond('Usage: /room create|join|list [args]');
      }
      break;

    // ─── XP Commands ─────────────────────────────────────────
    case 'profile': {
      const pUser = args[0] ? findUser(args[0]) : session.user;
      if (!pUser) { respond('[!] User not found'); return; }
      const xp = pUser.xp || 0;
      const level = pUser.level || 1;
      const nextLevel = level * XP_PER_LEVEL;
      const progress = Math.min(100, Math.floor((xp / nextLevel) * 100));
      const features = (pUser.unlocked_features || '').split(',').filter(Boolean);
      respond(
        '╔══════════════════════════════════════╗<br>' +
        '║           USER PROFILE                ║<br>' +
        '╠══════════════════════════════════════╣<br>' +
        `║ User: ${sanitize(pUser.display_name || pUser.username).padEnd(28)} ║<br>` +
        `║ Level: ${level.toString().padEnd(28)} ║<br>` +
        `║ XP: ${xp}/${nextLevel} (${progress}%)${' '.repeat(8 - progress.toString().length)} ║<br>` +
        `║ Unlocked: ${features.length > 0 ? features.join(', ').padEnd(23) : 'none'.padEnd(28)} ║<br>` +
        `║ Role: ${(pUser.role || 'user').toUpperCase().padEnd(28)} ║<br>` +
        '╚══════════════════════════════════════╝'
      );
      break;
    }

    case 'rank':
      const allUsers = getDB().prepare('SELECT display_name, username, xp, level FROM users ORDER BY xp DESC LIMIT 10').all();
      let rankStr = '╔══════════════════════════════════════╗<br>║           TOP 10 RANKINGS           ║<br>╠══════════════════════════════════════╣<br>';
      allUsers.forEach((u, i) => {
        const name = sanitize(u.display_name || u.username);
        rankStr += `║ ${(i+1) + '.' + name.slice(0,15)} ${('XP: ' + (u.xp || 0)).padEnd(10)} ║<br>`;
      });
      rankStr += '╚══════════════════════════════════════╝';
      respond(rankStr);
      break;

    case 'unlock': {
      if (!args[0]) {
        let featList = '╔══════════════════════════════════════╗<br>║        UNLOCKABLE FEATURES          ║<br>╠══════════════════════════════════════╣<br>';
        Object.entries(XP_FEATURES).forEach(([k, v]) => {
          featList += `║ /unlock ${k.padEnd(16)} ${v.cost.toString().padEnd(4)} XP ${v.desc.padEnd(17)} ║<br>`;
        });
        featList += '╚══════════════════════════════════════╝';
        respond(featList);
        return;
      }
      const feat = XP_FEATURES[args[0]];
      if (!feat) { respond('[!] Unknown feature. Try /unlock alone to see list'); return; }
      const unlocked = (session.user.unlocked_features || '').split(',').filter(Boolean);
      if (unlocked.includes(args[0])) { respond('[!] Already unlocked!'); return; }
      if ((session.user.xp || 0) < feat.cost) { respond(`[!] Need ${feat.cost} XP (you have ${session.user.xp || 0})`); return; }
      const newXP = (session.user.xp || 0) - feat.cost;
      unlocked.push(args[0]);
      getDB().prepare('UPDATE users SET xp = ?, unlocked_features = ? WHERE id = ?').run(newXP, unlocked.join(','), session.user.id);
      session.user.xp = newXP;
      session.user.unlocked_features = unlocked.join(',');
      respond(`[✓] Unlocked: ${feat.name}! (${feat.desc})`);
      broadcast(`[>] ${session.user.display_name} unlocked ${feat.name}!`);
      break;
    }

    // ─── Fake Maintenance ─────────────────────────────────────
    case 'fake_maintenance':
      if (session.user.role !== 'admin') { respond('[!] Admin only'); return; }
      if (args[0] === 'on' || args[0] === '1') {
        fakeMaintenance = true;
        broadcastAllRooms('[SYSTEM] Server is entering maintenance mode. Non-admin users will be redirected.');
        for (const [sid, sock] of io.sockets.sockets) {
          const s = onlineUsers.get(sid);
          if (s && s.role !== 'admin') sock.emit('maintenance', { active: true, msg: 'Server is under maintenance. Please try again later.' });
        }
        respond('[✓] Fake maintenance mode ACTIVE. Only admins can see the chat.');
      } else if (args[0] === 'off' || args[0] === '0') {
        fakeMaintenance = false;
        broadcastAllRooms('[SYSTEM] Maintenance complete. Server is back online.');
        io.emit('maintenance', { active: false });
        respond('[✓] Fake maintenance mode DEACTIVATED.');
      } else {
        respond('Usage: /fake_maintenance on|off');
      }
      break;

    // ─── Export Security Logs ────────────────────────────────
    case 'export_security_logs':
      if (session.user.role !== 'admin') { respond('[!] Admin only'); return; }
      respond('[>] Generating security logs...');
      const fs = require('fs');
      const logPath = path.join(__dirname, 'server.log');
      let logContent = `╔══════════════════════════════════════╗\n║     AtlasRoot SECURITY LOGS      ║\n╠══════════════════════════════════════╣\n`;
      logContent += `║ Generated: ${new Date().toISOString().padEnd(27)} ║\n`;
      logContent += `║ Uptime: ${Math.floor(process.uptime()/60)}m ${process.uptime()%60}s${' '.repeat(12)} ║\n`;
      logContent += `║ Online: ${onlineUsers.size} | Total: ${getDB().prepare('SELECT COUNT(*) as c FROM users').get().c}${' '.repeat(10)} ║\n`;
      logContent += `╠══════════════════════════════════════╣\n`;
      logContent += `║ BLOCKED IPS:${' '.repeat(39)}║\n`;
      BLOCKED_IPS.forEach(ip => { logContent += `║ > ${ip.padEnd(45)}║\n`; });
      logContent += `╠══════════════════════════════════════╣\n`;
      logContent += `║ INTRUSION LOG:${' '.repeat(36)}║\n`;
      (intrusionLog.length > 0 ? intrusionLog : ['No intrusions recorded']).forEach(l => {
        logContent += `║ ${l.slice(0,46).padEnd(46)}║\n`;
      });
      logContent += `╠══════════════════════════════════════╣\n`;
      logContent += `║ RECENT MESSAGES (last 50):${' '.repeat(26)}║\n`;
      const recentMsgs = getDB().prepare('SELECT username, text, created_at FROM messages ORDER BY created_at DESC LIMIT 50').all();
      recentMsgs.reverse().forEach(m => {
        const line = `${new Date((m.created_at || 0)*1000).toLocaleString()} <${m.username}> ${m.text}`;
        logContent += `║ ${line.slice(0,46).padEnd(46)}║\n`;
      });
      logContent += `╚══════════════════════════════════════╝\n`;
      try { fs.writeFileSync(logPath, logContent); } catch (e) { respond('[!] Could not write log file'); return; }
      respond(`[✓] Security logs exported to server.log (${logContent.length} bytes)`);
      break;

    // ─── Spectator Mode ──────────────────────────────────────
    case 'spectate':
      if (session.user.role !== 'admin') { respond('[!] Admin only'); return; }
      if (!args[0]) { respond('Usage: /spectate &lt;room&gt;'); return; }
      const specRoom = sanitize(args[0]).replace(/^#/, '');
      const specRoomData = getDB().prepare('SELECT * FROM rooms WHERE name = ?').get(specRoom);
      if (!specRoomData) { respond(`[!] Room '${specRoom}' not found`); return; }
      if (session.room !== specRoom) {
        socket.leave(session.room);
        socket.join(specRoom);
        session.room = specRoom;
      }
      spectatorSessions.add(socket.id);
      // Remove from online users (invisible)
      onlineUsers.delete(socket.id);
      broadcastUsers();
      socket.emit('room:joined', { room: specRoom, topic: specRoomData.topic || '' });
      socket.emit('message', { type: 'system', text: `[>] SPECTATOR MODE: Watching #${specRoom} (invisible)`, time: now() });
      sendHistory(socket, specRoom);
      respond('[>] You are now invisible. Use /spectate_off to return.');
      break;

    case 'spectate_off':
      if (!spectatorSessions.has(socket.id)) { respond('[!] Not in spectator mode'); return; }
      spectatorSessions.delete(socket.id);
      const prevRoom = session.room;
      const onlineSpec = { id: socket.id, username: session.user.username, display: session.user.display_name, color: session.user.color, role: session.user.role, ip: session.user.ip, token: session.user.token, status: 'online', xp: session.user.xp || 0, level: session.user.level || 1, dnd: session.user.dnd || 0 };
      onlineUsers.set(socket.id, onlineSpec);
      broadcastUsers();
      socket.emit('message', { type: 'system', text: `[>] SPECTATOR MODE OFF. You are visible again in #${prevRoom}`, time: now() });
      break;

    // ─── Reply Timer ─────────────────────────────────────────
    case 'set_timer':
      if (session.user.role !== 'admin') { respond('[!] Admin only'); return; }
      if (!args[0] || isNaN(args[0]) || parseInt(args[0]) < 0) { respond('Usage: /set_timer &lt;seconds&gt; (0 = disable)'); return; }
      globalReplyTimer = parseInt(args[0]);
      if (globalReplyTimer === 0) replyTimerMap.clear();
      broadcastAllRooms(`[SYSTEM] Reply timer set to ${globalReplyTimer}s by ${session.user.display_name}`);
      break;

    // ─── Reputation ──────────────────────────────────────────
    case 'rate': {
      if (args.length < 2) { respond('Usage: /rate &lt;user&gt; +1 or -1'); return; }
      const targetU = args[0];
      const val = parseInt(args[1]);
      if (val !== 1 && val !== -1) { respond('[!] Value must be +1 or -1'); return; }
      if (targetU.toLowerCase() === session.user.username.toLowerCase()) { respond('[!] Cannot rate yourself'); return; }
      const targetUser = findUser(targetU);
      if (!targetUser) { respond('[!] User not found'); return; }
      try {
        getDB().prepare('INSERT OR REPLACE INTO reputation (target_username, voter_username, value) VALUES (?,?,?)').run(targetUser.username, session.user.username, val);
      } catch (e) { respond('[!] Already rated this user'); return; }
      // Calculate new rating
      const stats = getDB().prepare('SELECT SUM(value) as total, COUNT(*) as count FROM reputation WHERE target_username = ?').get(targetUser.username);
      const avg = stats.count > 0 ? (stats.total / stats.count).toFixed(1) : '0.0';
      respond(`[✓] Rated ${targetU}: ${val > 0 ? '+1 ↑' : '-1 ↓'} (Now: ★${avg})`);
      // Notify target if online
      const targetSocket = findOnlineSocket(targetU);
      if (targetSocket) targetSocket.emit('message', { type: 'system', text: `[>] ${session.user.display_name} rated you ${val > 0 ? '+1 ↑' : '-1 ↓'}`, time: now() });
      break;
    }

    // ─── DND Mode ────────────────────────────────────────────
    case 'ephemeral':
      if (args.length < 1) { respond('Usage: /ephemeral &lt;room&gt; [minutes]'); return; }
      const epName = sanitize(args[0]).trim();
      if (!epName) { respond('[!] Invalid room name'); return; }
      const epMins = args[1] && !isNaN(args[1]) ? Math.max(1, parseInt(args[1])) : EPHEMERAL_DEFAULT_MINUTES;
      socket.emit('room:create', { name: epName, topic: 'Ephemeral (auto-delete)', ephemeral: epMins });
      break;

    case 'dnd':
      if (args[0] === 'on') {
        dndUsers.add(session.user.username.toLowerCase());
        getDB().prepare('UPDATE users SET dnd = 1 WHERE id = ?').run(session.user.id);
        if (onlineUsers.has(socket.id)) onlineUsers.get(socket.id).dnd = 1;
        broadcastUsers();
        respond('[>] DND mode ON. Notifications and mentions muted. 🔇');
      } else if (args[0] === 'off') {
        dndUsers.delete(session.user.username.toLowerCase());
        getDB().prepare('UPDATE users SET dnd = 0 WHERE id = ?').run(session.user.id);
        if (onlineUsers.has(socket.id)) onlineUsers.get(socket.id).dnd = 0;
        broadcastUsers();
        respond('[>] DND mode OFF. Notifications restored.');
      } else {
        respond('Usage: /dnd on|off');
      }
      break;

    // ─── Sound Effects ───────────────────────────────────────
    case 'alarm':
      socket.emit('playsound', 'alert');
      respond('[>] 🔔 ALARM sounded');
      break;

    case 'beep':
      socket.emit('playsound', 'beep');
      break;

    // ─── Hacking Commands ────────────────────────────────────
    case 'del':
      if (session.user.role !== 'admin') { respond('[!] Admin only'); return; }
      if (!args[0]) { respond('Usage: /del &lt;messageId&gt;'); return; }
      const delId = parseInt(args[0]);
      if (isNaN(delId)) { respond('[!] Invalid message ID'); return; }
      const delResult = getDB().prepare('DELETE FROM messages WHERE id = ?').run(delId);
      if (delResult.changes > 0) {
        broadcast(`[!] Message #${delId} deleted by ${session.user.display_name}`);
      } else {
        respond('[!] Message not found');
      }
      break;

    default:
      respond(`[!] Unknown: /${cmd}. Try /help`);
  }
}

// ─── XP System ─────────────────────────────────────────────────
function awardXP(socketId, userId, amount) {
  const t = Date.now();
  if (!xpRateMap.has(socketId)) { xpRateMap.set(socketId, { c: 0, s: t }); }
  const entry = xpRateMap.get(socketId);
  if (t - entry.s > XP_RATE_WINDOW) { entry.c = 0; entry.s = t; }
  if (entry.c >= XP_RATE_MAX) return;
  entry.c++;
  const db = getDB();
  const user = db.prepare('SELECT xp, level FROM users WHERE id = ?').get(userId);
  if (!user) return;
  let newXP = (user.xp || 0) + amount;
  let newLevel = user.level || 1;
  while (newXP >= newLevel * XP_PER_LEVEL) {
    newXP -= newLevel * XP_PER_LEVEL;
    newLevel++;
  }
  db.prepare('UPDATE users SET xp = ?, level = ? WHERE id = ?').run(newXP, newLevel, userId);
  // Update online user if present
  for (const [sid, u] of onlineUsers) {
    if (u.id === userId) { u.xp = newXP; u.level = newLevel; break; }
  }
}

// ─── Server Stats ─────────────────────────────────────────────
function getServerStats() {
  const db = getDB();
  const totalUsers = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  const totalMsgs = db.prepare('SELECT COUNT(*) as c FROM messages').get().c;
  const totalRooms = db.prepare('SELECT COUNT(*) as c FROM rooms').get().c;
  return {
    uptime: Math.floor(process.uptime()),
    usersOnline: onlineUsers.size,
    totalUsers,
    totalMessages: totalMsgs,
    totalRooms,
    memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    cpu: Math.round(process.cpuUsage().user / 1000),
  };
}

// ─── Helpers ─────────────────────────────────────────────────
function findOnlineSocket(username) {
  for (const [id, u] of onlineUsers) {
    if (u.username.toLowerCase() === username.toLowerCase() || u.display.toLowerCase() === username.toLowerCase()) {
      return io.sockets.sockets.get(id);
    }
  }
  return null;
}

function broadcastUsers() {
  const safe = Array.from(onlineUsers.values()).map(u => {
    const { ip, token, ...rest } = u;
    return rest;
  });
  io.emit('users', safe);
}

function emitRoomUpdate() {
  io.emit('room:list', getRooms());
}

// ─── Start ───────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`\x1b[32m[+] AtlasRoot v4.0 running on http://0.0.0.0:${PORT}\x1b[0m`);
});
