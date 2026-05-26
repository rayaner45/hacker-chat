// ─── Boot Screen ──────────────────────────────────────────────
(function () {
  var bootScreen = document.getElementById('boot-screen');
  var bootOutput = document.getElementById('boot-output');
  var bootBar = document.getElementById('boot-bar-fill');
  var bootStatus = document.getElementById('boot-status');
  var bootLogo = document.querySelector('.boot-logo');
  var bootFlash = document.querySelector('.boot-flash');

  // Power-on flash
  if (bootFlash) {
    bootFlash.style.animation = 'flashIn 0.2s ease-out 0.05s forwards';
    setTimeout(function () { if (bootFlash) bootFlash.remove(); }, 500);
  }

  // Glitch logo periodically
  if (bootLogo) {
    setInterval(function () {
      bootLogo.style.opacity = 0.7 + Math.random() * 0.3;
      bootLogo.style.filter = 'brightness(' + (0.9 + Math.random() * 0.2) + ')';
      if (Math.random() > 0.85) {
        var glitchX = (Math.random() > 0.5 ? 1 : -1) * (1 + Math.random() * 2);
        var glitchY = (Math.random() > 0.5 ? 1 : -1) * (1 + Math.random() * 2);
        bootLogo.style.transform = 'translate(' + glitchX + 'px,' + glitchY + 'px) skewX(' + (Math.random() > 0.5 ? 1 : -1) * 0.5 + 'deg)';
        bootLogo.style.textShadow = '0 0 15px var(--fg), 0 0 40px var(--fg), ' + (Math.random() > 0.5 ? '2px 0 #0ff' : '-2px 0 #f0f');
        setTimeout(function () { bootLogo.style.transform = ''; bootLogo.style.textShadow = ''; bootLogo.style.filter = ''; }, 100 + Math.random() * 80);
      }
    }, 2000);
  }

  var bootLines = [
    { text: 'SYS: Booting AtlasRoot v4.0.1', type: 'info', delay: 80 },
    { text: 'OK  CPU: 4 cores @ 2.8GHz | RAM: 8GB DDR4 | L2 cache: 256KB', type: 'ok', delay: 100 },
    { text: 'OK  POST: Memory test passed (8192MB)', type: 'ok', delay: 90 },
    { text: 'OK  Network: eth0 - 10.0.0.42/24 (LINK UP | 1Gbps)', type: 'ok', delay: 100 },
    { text: 'OK  Loading kernel modules: crypto.ko, netfilter.ko, iptables.ko', type: 'ok', delay: 140 },
    { text: 'OK  entropy pool: 256/256 bits (sufficient)', type: 'ok', delay: 100 },
    { text: 'OK  GPG keyring: 4096-bit RSA | 23 trusted CAs loaded', type: 'ok', delay: 120 },
    { text: 'OK  socket.io@4.7.2 | encryption.service (AES-256-GCM)', type: 'ok', delay: 140 },
    { text: 'OK  firewall.service (12 rules) | auth.service (2FA)', type: 'ok', delay: 130 },
    { text: 'OK  TLS 1.3 handshake (X25519) | session secured', type: 'ok', delay: 160 },
    { text: 'WRN  IDS: 3 port scans detected since last boot', type: 'warn', delay: 180 },
    { text: 'OK  Intrusion prevention: ACTIVE | 0 threats', type: 'ok', delay: 120 },
    { text: 'OK  Message bus | rate limiter | chat protocol ready', type: 'ok', delay: 140 },
    { text: 'OK  Tor circuit: 3 hops | IP masked', type: 'ok', delay: 240 },
    { text: 'OK  Dark web relay: connected to 8 nodes', type: 'ok', delay: 200 },
    { text: 'OK  Anon DNS: enabled | WebRTC leak protection: ON', type: 'ok', delay: 180 },
    { text: '', type: 'info', delay: 60 },
    { text: '> Verifying system integrity...', type: 'warn', delay: 300 },
    { text: '> Checksums: ALL MATCH (SHA-256 verified)', type: 'ok', delay: 200 },
    { text: '> Deobfuscating network layers...', type: 'warn', delay: 250 },
    { text: '', type: 'info', delay: 50 },
    { text: '> ESTABLISHING SECURE CONNECTION...', type: 'warn', delay: 400 },
    { text: '> 802.1X authentication: PASSED', type: 'ok', delay: 150 },
    { text: '> VPN tunnel: ESTABLISHED (WireGuard)', type: 'ok', delay: 200 },
    { text: '', type: 'info', delay: 50 },
    { text: '> SYSTEM READY. AWAITING AUTHENTICATION...', type: 'warn', delay: 150 },
  ];

  var bootIdx = 0;
  function addBootLine(line) {
    var div = document.createElement('div');
    div.className = 'line ' + (line.type || 'info');
    if (line.text === '') { div.innerHTML = '&nbsp;'; }
    bootOutput.appendChild(div);
    bootOutput.scrollTop = bootOutput.scrollHeight;
    // Fast typewriter effect
    var chars = line.text.split('');
    div.textContent = '';
    var ci = 0;
    function typeChar() {
      if (ci < chars.length) {
        div.textContent += chars[ci++];
        bootOutput.scrollTop = bootOutput.scrollHeight;
        setTimeout(typeChar, ci % 3 === 0 ? 2 + Math.random() * 2 : 0);
      } else {
        // Line complete
        var pct = Math.floor((bootIdx / bootLines.length) * 100);
        bootBar.style.width = pct + '%';
        var msgs = ['INITIALIZING KERNEL...','LOADING MODULES...','CONFIGURING FIREWALL...','ESTABLISHING TUNNEL...','ENCRYPTING CHANNEL...','FINALIZING...'];
        bootStatus.textContent = msgs[Math.min(Math.floor(bootIdx / bootLines.length * msgs.length), msgs.length - 1)] + ' ' + pct + '%';
        // Activate footer items based on progress
        var fwEl = document.querySelector('.boot-fw');
        var encEl = document.querySelector('.boot-enc');
        if (pct > 30 && fwEl) fwEl.classList.add('active');
        if (pct > 60 && encEl) encEl.classList.add('active');
        // Pause longer on blank line
        var pause = bootIdx >= bootLines.length - 1 ? 150 : (line.delay || 30 + Math.random() * 20);
        setTimeout(bootTick, pause);
      }
    }
    typeChar();
  }

  function bootTick() {
    if (bootIdx < bootLines.length) {
      var ln = bootLines[bootIdx];
      bootIdx++;
      addBootLine(ln);
    } else {
      bootBar.style.width = '100%';
      bootStatus.textContent = '✓ READY';
      bootStatus.className = 'boot-status ready';
      SFX.boot();
      // Animate footer items active
      document.querySelectorAll('.boot-footer span').forEach(function (s) { s.classList.add('active'); });
      setTimeout(function () {
        // Fade out
        bootScreen.style.animation = 'bootFadeOut 0.6s ease-in forwards';
        bootScreen.classList.add('hidden');
        setTimeout(function() {
          bootScreen.style.display = 'none';
          var urlParams = new URLSearchParams(window.location.search);
          var saved = localStorage.getItem('hackerchat-auth');
          var guestSaved = sessionStorage.getItem('hackerchat-guest');
          if (urlParams.has('fresh') || urlParams.has('logout')) {
            localStorage.removeItem('hackerchat-auth');
            sessionStorage.removeItem('hackerchat-guest');
            saved = null;
            guestSaved = null;
          }
          if (guestSaved) {
            var g = guestSaved.split(':');
            App.autoLogin = { user: g[0], pass: g[1] };
            sessionStorage.setItem('hackerchat-guest', guestSaved);
          } else {
            var autoUser = urlParams.get('user') || (saved ? saved.split(':')[0] : null);
            var autoPass = urlParams.get('pass') || (saved ? saved.split(':')[1] : null);
            if (autoUser && autoPass) {
              App.autoLogin = { user: autoUser, pass: autoPass };
            }
          }
          if (App.autoLogin) {
            App.skipAuth = true;
            var retries = 100;
            function directLogin() {
              if (App.socket && App.socket.connected) {
                App.socket.emit('auth:login', { username: App.autoLogin.user, password: App.autoLogin.pass, deviceId: getDeviceId() });
              } else if (retries > 0) { retries--; setTimeout(directLogin, 100); }
            }
            directLogin();
          } else {
            document.getElementById('auth-screen').classList.add('active');
          }
        }, 800);
      }, 400);
    }
  }
  bootTick();
})();

// ─── CPU/RAM Monitor ─────────────────────────────────────────
(function () {
  function updateMetrics() {
    var cpu = 20 + Math.random() * 50;
    var ram = 128 + Math.random() * 512;
    var cpuVal = document.getElementById('cpu-val');
    var ramVal = document.getElementById('ram-val');
    var cpuFill = document.getElementById('cpu-fill');
    var ramFill = document.getElementById('ram-fill');
    if (cpuVal) cpuVal.textContent = cpu.toFixed(0) + '%';
    if (ramVal) ramVal.textContent = ram.toFixed(0) + 'MB';
    if (cpuFill) cpuFill.style.width = cpu.toFixed(0) + '%';
    if (ramFill) ramFill.style.width = Math.min(100, ram / 8) + '%';
  }
  setInterval(updateMetrics, 2000);
  updateMetrics();
})();

// ─── Matrix Rain ────────────────────────────────────────────
(function () {
  var canvas = document.getElementById('matrix');
  var ctx = canvas.getContext('2d');
  var chars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲンヴ0123456789ABCDEF<>/[]{}|&^%$#@!アカサタナハマヤラワ';
  var interval = null;
  var particles = [];

  function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }

  function start() {
    resize();
    var cols = Math.floor(canvas.width / 11);
    var halfCols = Math.floor(cols / 2);
    var drops = Array(halfCols).fill(1).map(function () { return Math.random() * 100; });
    var speeds = Array(halfCols).fill(1).map(function () { return 0.5 + Math.random() * 1.5; });
    var brightness = Array(halfCols).fill(1).map(function () { return 0.3 + Math.random() * 0.7; });
    if (interval) clearInterval(interval);
    interval = setInterval(function () {
      var root = getComputedStyle(document.documentElement);
      var color = root.getPropertyValue('--fg').trim() || '#0f0';
      ctx.fillStyle = 'rgba(0,0,0,0.06)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      for (var i = 0; i < drops.length; i++) {
        var alpha = brightness[i];
        ctx.fillStyle = color;
        ctx.globalAlpha = Math.min(1, alpha + 0.3);
        ctx.font = 'bold 11px monospace';
        ctx.fillText(chars[Math.floor(Math.random() * chars.length)], i * 22, drops[i] * 11);
        ctx.globalAlpha = alpha * 0.25;
        ctx.font = '11px monospace';
        for (var t = 1; t < 4; t++) {
          if (drops[i] - t > 0) {
            ctx.fillText(chars[Math.floor(Math.random() * chars.length)], i * 22, (drops[i] - t) * 11);
          }
        }
        ctx.globalAlpha = 1;
        if (drops[i] * 11 > canvas.height && Math.random() > 0.975) drops[i] = 0;
        drops[i] += speeds[i];
      }
    }, 45);
  }

  start();
  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { if (interval) { clearInterval(interval); interval = null; } }
    else { start(); }
  });
})();

// ─── Floating Particles ──────────────────────────────────────
(function () {
  var canvas = document.getElementById('particles');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var particles = [];
  var MAX = 25;

  function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
  resize();
  window.addEventListener('resize', resize);

  for (var i = 0; i < MAX; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      r: Math.random() * 2 + 1,
      alpha: Math.random() * 0.5 + 0.1,
    });
  }

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    var style = getComputedStyle(document.documentElement);
    var color = style.getPropertyValue('--fg').trim() || '#0f0';
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.globalAlpha = p.alpha;
      ctx.fill();
    }
    // Draw connecting lines between nearby particles
    for (var i = 0; i < particles.length; i++) {
      for (var j = i + 1; j < particles.length; j++) {
        var dx = particles[i].x - particles[j].x;
        var dy = particles[i].y - particles[j].y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = color;
          ctx.globalAlpha = (1 - dist / 120) * 0.08;
          ctx.stroke();
        }
      }
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(animate);
  }
  animate();

})();

// ─── Audio ─────────────────────────────────────────────────
var audioCtx = null;
function initAudio() {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
}
document.addEventListener('click', initAudio, { once: true });
document.addEventListener('keydown', initAudio, { once: true });

function beep(freq, dur) {
  if (!audioCtx) return;
  try {
    var o = audioCtx.createOscillator();
    var g = audioCtx.createGain();
    o.connect(g); g.connect(audioCtx.destination);
    o.frequency.value = freq || 660;
    o.type = 'square';
    g.gain.setValueAtTime(0.05, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + (dur || 60) / 1000);
    o.start(); o.stop(audioCtx.currentTime + (dur || 60) / 1000);
  } catch (e) {}
}

function playTone(freq, dur, type, vol) {
  if (!audioCtx || !App.soundEnabled) return;
  try {
    var o = audioCtx.createOscillator();
    var g = audioCtx.createGain();
    o.connect(g); g.connect(audioCtx.destination);
    o.frequency.value = freq;
    o.type = type || 'square';
    g.gain.setValueAtTime(vol || 0.05, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur / 1000);
    o.start(); o.stop(audioCtx.currentTime + dur / 1000);
  } catch (e) {}
}

function playChord(freqs, dur, vol) {
  if (!audioCtx || !App.soundEnabled) return;
  freqs.forEach(function (f) {
    try {
      var o = audioCtx.createOscillator();
      var g = audioCtx.createGain();
      o.connect(g); g.connect(audioCtx.destination);
      o.frequency.value = f;
      o.type = 'square';
      g.gain.setValueAtTime((vol || 0.03) / freqs.length, audioCtx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur / 1000);
      o.start(); o.stop(audioCtx.currentTime + dur / 1000);
    } catch (e) {}
  });
}

function playSweep(startFreq, endFreq, dur) {
  if (!audioCtx || !App.soundEnabled) return;
  try {
    var o = audioCtx.createOscillator();
    var g = audioCtx.createGain();
    o.connect(g); g.connect(audioCtx.destination);
    o.frequency.setValueAtTime(startFreq, audioCtx.currentTime);
    o.frequency.linearRampToValueAtTime(endFreq, audioCtx.currentTime + dur / 1000);
    o.type = 'sine';
    g.gain.setValueAtTime(0.04, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur / 1000);
    o.start(); o.stop(audioCtx.currentTime + dur / 1000);
  } catch (e) {}
}

function playNoise(dur) {
  if (!audioCtx || !App.soundEnabled) return;
  try {
    var bufSize = audioCtx.sampleRate * dur / 1000;
    var buf = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < bufSize; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i/bufSize, 2);
    var s = audioCtx.createBufferSource();
    s.buffer = buf;
    var g = audioCtx.createGain();
    s.connect(g); g.connect(audioCtx.destination);
    g.gain.setValueAtTime(0.04, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur / 1000);
    s.start();
  } catch (e) {}
}

// Sound effects map
var SFX = {
  join: function () { initAudio(); if (!App.soundEnabled) return; playTone(523, 80, 'sine', 0.04); setTimeout(function () { playTone(659, 80, 'sine', 0.04); }, 90); setTimeout(function () { playTone(784, 100, 'sine', 0.04); }, 180); },
  leave: function () { initAudio(); if (!App.soundEnabled) return; playTone(784, 80, 'sine', 0.04); setTimeout(function () { playTone(659, 80, 'sine', 0.04); }, 90); setTimeout(function () { playTone(523, 120, 'sine', 0.04); }, 180); },
  error: function () { initAudio(); if (!App.soundEnabled) return; playTone(200, 200, 'sawtooth', 0.04); setTimeout(function () { playTone(160, 250, 'sawtooth', 0.03); }, 150); },
  success: function () { initAudio(); if (!App.soundEnabled) return; playTone(523, 60, 'sine', 0.04); setTimeout(function () { playTone(784, 80, 'sine', 0.04); }, 70); },
  notify: function () { initAudio(); if (!App.soundEnabled) return; playTone(1200, 40, 'sine', 0.03); setTimeout(function () { playTone(1000, 40, 'sine', 0.03); }, 50); },
  click: function () { initAudio(); if (!App.soundEnabled) return; playTone(1500, 15, 'sine', 0.02); },
  pop: function () { initAudio(); if (!App.soundEnabled) return; playTone(800, 30, 'sine', 0.04); playTone(1200, 20, 'sine', 0.02); },
  whisper: function () { initAudio(); if (!App.soundEnabled) return; playTone(1500, 30, 'sine', 0.04); setTimeout(function () { playTone(1800, 40, 'sine', 0.04); }, 40); },
  boot: function () { initAudio(); if (!App.soundEnabled) return; if (!audioCtx) return; try { var o1 = audioCtx.createOscillator(); var g1 = audioCtx.createGain(); o1.connect(g1); g1.connect(audioCtx.destination); o1.frequency.value = 262; o1.type = 'sine'; g1.gain.setValueAtTime(0.04, audioCtx.currentTime); g1.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1); o1.start(); o1.stop(audioCtx.currentTime + 0.1); setTimeout(function () { var o = audioCtx.createOscillator(); var g = audioCtx.createGain(); o.connect(g); g.connect(audioCtx.destination); o.frequency.value = 330; o.type = 'sine'; g.gain.setValueAtTime(0.04, audioCtx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08); o.start(); o.stop(audioCtx.currentTime + 0.08); }, 120); setTimeout(function () { var o = audioCtx.createOscillator(); var g = audioCtx.createGain(); o.connect(g); g.connect(audioCtx.destination); o.frequency.value = 392; o.type = 'sine'; g.gain.setValueAtTime(0.04, audioCtx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08); o.start(); o.stop(audioCtx.currentTime + 0.08); }, 220); setTimeout(function () { var o = audioCtx.createOscillator(); var g = audioCtx.createGain(); o.connect(g); g.connect(audioCtx.destination); o.frequency.value = 523; o.type = 'sine'; g.gain.setValueAtTime(0.05, audioCtx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15); o.start(); o.stop(audioCtx.currentTime + 0.15); }, 320); } catch (e) {} },
  powerup: function () { initAudio(); if (!App.soundEnabled) return; if (!audioCtx) return; try { var o = audioCtx.createOscillator(); var g = audioCtx.createGain(); o.connect(g); g.connect(audioCtx.destination); o.frequency.setValueAtTime(200, audioCtx.currentTime); o.frequency.linearRampToValueAtTime(1200, audioCtx.currentTime + 0.25); o.type = 'sine'; g.gain.setValueAtTime(0.04, audioCtx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25); o.start(); o.stop(audioCtx.currentTime + 0.25); } catch (e) {} },
  powerdown: function () { initAudio(); if (!App.soundEnabled) return; playSweep(800, 100, 300); },
  scan: function () { initAudio(); if (!App.soundEnabled) return; playTone(1000, 30, 'sine', 0.02); setTimeout(function () { playTone(1400, 20, 'sine', 0.02); }, 35); },
  alert: function () { initAudio(); if (!App.soundEnabled) return; playTone(880, 100, 'square', 0.04); setTimeout(function () { playTone(660, 100, 'square', 0.04); }, 120); setTimeout(function () { playTone(880, 150, 'square', 0.04); }, 240); },
};

// ─── Glitch ────────────────────────────────────────────────
function glitch() {
  var el = document.getElementById('glitch-layer');
  el.classList.remove('active');
  void el.offsetWidth;
  el.classList.add('active');
}

// ─── Device ID (for single-account-per-browser enforcement) ─
function getDeviceId() {
  var id = localStorage.getItem('hackerchat-device-id');
  if (!id) {
    id = crypto.randomUUID ? crypto.randomUUID() : 'd' + Date.now() + Math.random().toString(36).slice(2, 10);
    localStorage.setItem('hackerchat-device-id', id);
  }
  return id;
}

// ─── Application State ─────────────────────────────────────
var App = {
  socket: null,
  user: null,
  token: null,
  room: 'lobby',
  myId: null,
  cmdHistory: [],
  cmdIdx: -1,
  typingTimer: null,
  soundEnabled: localStorage.getItem('hackerchat-sound') !== 'off',
  unread: 0,
  users: [],
  notifications: [],
  pms: {},
  autoLogin: null,
  smoothScroll: true,
};
App.socket = io({
  transports: ['websocket', 'polling'],
  upgrade: false,
  timeout: 60000,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 10000,
});

// ─── DOM refs ──────────────────────────────────────────────
var $ = function (id) { return document.getElementById(id); };
var authScreen = $('auth-screen');
var roomsScreen = $('rooms-screen');
var chatScreen = $('chat-screen');
var chatMessages = $('chat-messages');
var userListEl = $('user-list');
var messageInput = $('message-input');
var typingIndicator = $('typing-indicator');

// ─── Auth (Two-Step) ───────────────────────────────────────
var authTabs = document.querySelectorAll('.auth-tab');
var loginStep1 = $('login-step1');
var loginStep2 = $('login-step2');
var registerForm = $('register-form');
var authError = $('auth-error');

authTabs.forEach(function (tab) {
  tab.addEventListener('click', function () {
    authTabs.forEach(function (t) { t.classList.remove('active'); });
    tab.classList.add('active');
    document.querySelectorAll('.auth-form').forEach(function (f) { f.classList.remove('active'); });
    if (tab.dataset.tab === 'login') { loginStep1.classList.add('active'); $('login-user').focus(); }
    else { registerForm.classList.add('active'); $('reg-user').focus(); }
    authError.textContent = '';
    $('auth-terminal').innerHTML = '<div class="term-line system">> AUTHENTICATION REQUIRED</div><div class="term-line system">> STEP 1: ENTER USER ID</div>';
  });
});

var authTerminal = $('auth-terminal');

function addTermLine(text, className) {
  var div = document.createElement('div');
  div.className = 'term-line' + (className ? ' ' + className : '');
  div.textContent = text;
  authTerminal.appendChild(div);
  authTerminal.scrollTop = authTerminal.scrollHeight;
}

// Step 1 → Step 2
$('login-step1-btn').addEventListener('click', function () {
  var user = $('login-user').value.trim();
  if (!user) { authError.textContent = 'Enter your USER ID'; return; }
  if (!App.socket || !App.socket.connected) { ensureConnection(function(){}); return; }
  App.step1User = user;
  document.querySelectorAll('.auth-form').forEach(function (f) { f.classList.remove('active'); });
  loginStep2.classList.add('active');
  $('login-pass').focus();
  authTerminal.innerHTML = '';
  addTermLine('USER ID: ' + user.toUpperCase(), 'system');
  addTermLine('STEP 2: ENTER MASTER KEY', 'system');
  authError.textContent = '';
});
$('login-user').addEventListener('keydown', function (e) { if (e.key === 'Enter') $('login-step1-btn').click(); });

// Back to Step 1
$('login-back-btn').addEventListener('click', function () {
  document.querySelectorAll('.auth-form').forEach(function (f) { f.classList.remove('active'); });
  loginStep1.classList.add('active');
  $('login-user').focus();
  authTerminal.innerHTML = '<div class="term-line system">> AUTHENTICATION REQUIRED</div><div class="term-line system">> STEP 1: ENTER USER ID</div>';
  authError.textContent = '';
});

// Step 2 → Submit
$('login-form').addEventListener('click', function (e) {
  e.preventDefault();
  var user = App.step1User || $('login-user').value.trim();
  var pass = $('login-pass').value;
  if (!user || !pass) { authError.textContent = 'Fill all fields'; return; }
  if (!App.socket || !App.socket.connected) { ensureConnection(function(){}); return; }
  authError.textContent = '';
  authTerminal.innerHTML = '';
  addTermLine('DECRYPTING MASTER KEY...', 'processing');
  App.socket.emit('auth:login', { username: user, password: pass, deviceId: getDeviceId() });
});

$('login-pass').addEventListener('keydown', function (e) { if (e.key === 'Enter') $('login-form').click(); });

registerForm.addEventListener('submit', function (e) {
  e.preventDefault();
  var user = $('reg-user').value.trim();
  var pass = $('reg-pass').value;
  var secAns = ($('reg-sec-answer') ? $('reg-sec-answer').value.trim() : '');
  if (!user || !pass) { authError.textContent = 'Fill all fields'; return; }
  if (pass.length < 4) { authError.textContent = 'Master key 4+ chars'; return; }
  if (!App.socket || !App.socket.connected) { ensureConnection(function(){}); return; }
  authError.textContent = '';
  authTerminal.innerHTML = '';
  addTermLine('CREATING ACCOUNT...', 'processing');
  App.socket.emit('auth:register', { username: user, password: pass, securityAnswer: secAns, deviceId: getDeviceId() });
});

// Show security answer field on register tab focus
document.querySelector('.auth-tab[data-tab="register"]').addEventListener('click', function () {
  var sf = $('sec-q-field');
  if (sf) sf.style.display = 'flex';
});

// ─── Guest Login ──────────────────────────────────────────────
$('guest-btn').addEventListener('click', function () {
  if (!App.socket || !App.socket.connected) { ensureConnection(function(){}); return; }
  authTerminal.innerHTML = '';
  var guestSaved = sessionStorage.getItem('hackerchat-guest');
  if (guestSaved) {
    var g = guestSaved.split(':');
    addTermLine('RESTORING GUEST SESSION...', 'processing');
    App.socket.emit('auth:login', { username: g[0], password: g[1], deviceId: getDeviceId() });
  } else {
    addTermLine('CREATING GUEST ACCOUNT...', 'processing');
    App.socket.emit('auth:guest', { deviceId: getDeviceId() });
  }
});

// ─── Forget Algorithm (Account Recovery) ──────────────────────
$('forgot-btn').addEventListener('click', function () {
  var f = $('forgot-form');
  f.style.display = f.style.display === 'none' ? 'block' : 'none';
  $('forgot-result').textContent = '';
});
$('forgot-lookup-btn').addEventListener('click', function () {
  var user = $('forgot-user').value.trim();
  var answer = $('forgot-answer').value.trim();
  if (!user) { $('forgot-result').textContent = 'Enter your username'; return; }
  addTermLine('EXECUTING FORGET ALGORITHM...', 'processing');
  App.socket.emit('auth:forgot', { username: user, securityAnswer: answer });
});
App.socket.on('auth:forgot:result', function (msg) {
  $('forgot-result').textContent = msg;
  addTermLine(msg, 'system');
});

App.socket.on('auth:error', function (msg) {
  authError.textContent = msg || 'ACCESS DENIED';
  authTerminal.innerHTML = '<div class="term-line access-denied">> ACCESS DENIED</div>';
  initAudio();
  SFX.error();
});
App.socket.on('session:duplicate', function (data) {
  showToast(data.text || '⚠ تم فتح حسابك في مكان آخر، هذه الجلسة مغلقة', 'error');
  setTimeout(function () {
    window.location.reload();
  }, 2000);
});
App.socket.on('auth:success', function (data) {
  App.user = data.user;
  App.token = data.token;

  // Admin bypass for fake maintenance mode
  if (data.user.role === 'admin') {
    var maintOverlay = document.getElementById('maintenance-overlay');
    if (maintOverlay) maintOverlay.style.display = 'none';
  }

  $('my-role').textContent = '[' + data.user.role.toUpperCase() + ']';
  $('rooms-username').textContent = data.user.display;
  // XP/Level display with progress bar
  var xpWrap = document.getElementById('xp-bar-wrap');
  if (xpWrap) {
    xpWrap.style.display = 'flex';
    var xp = data.user.xp || 0;
    var level = data.user.level || 1;
    var xpPerLevel = 100;
    var xpInLevel = xp % xpPerLevel;
    var pct = Math.min(100, Math.floor((xpInLevel / xpPerLevel) * 100));
    document.getElementById('xp-bar-label').textContent = 'LVL ' + level;
    document.getElementById('xp-bar-fill').style.width = pct + '%';
    document.getElementById('xp-bar-text').textContent = xpInLevel + '/' + xpPerLevel;
  }
  // Show admin button if admin
  var adminBtn = document.getElementById('admin-panel-btn');
  if (adminBtn) adminBtn.style.display = data.user.role === 'admin' ? 'inline' : 'none';
  if (App.autoLogin) {
    localStorage.setItem('hackerchat-auth', App.autoLogin.user + ':' + App.autoLogin.pass);
  }
  if (data.password && data.user.username && data.user.username.indexOf('guest_') === 0) {
    sessionStorage.setItem('hackerchat-guest', data.user.username + ':' + data.password);
  }
  if (App.skipAuth) {
    authScreen.classList.remove('active');
    App.skipAuth = false;
    return;
  }
  // VIP bypass: directly go to admin panel
  if (data.vip) {
    authTerminal.innerHTML = '';
    addTermLine('VIP ACCESS GRANTED', 'access-granted');
    addTermLine('WELCOME ' + data.user.display.toUpperCase(), 'system');
    SFX.success();
    initAudio();
    setTimeout(function () {
      authScreen.classList.remove('active');
      if (data.user.role === 'admin') {
        setTimeout(function () {
          App.socket.emit('admin:users');
          App.socket.emit('admin:rooms');
          var ap = document.getElementById('admin-panel');
          if (ap) ap.classList.add('active');
        }, 500);
      }
    }, 400);
    return;
  }
  authTerminal.innerHTML = '';
  addTermLine('ACCESS GRANTED', 'access-granted');
  addTermLine('WELCOME ' + data.user.display.toUpperCase(), 'system');
  SFX.success();
  setTimeout(function () {
    authScreen.classList.remove('active');
  }, 800);
});

$('logout-btn').addEventListener('click', function () {
  localStorage.removeItem('hackerchat-auth');
  sessionStorage.removeItem('hackerchat-guest');
  App.socket.disconnect();
  location.reload();
});

// ─── Rooms ─────────────────────────────────────────────────
var roomsList = $('rooms-list');
var roomsSearch = document.getElementById('rooms-search');
var _allRooms = [];
App.socket.on('room:list', function (rooms) {
  _allRooms = rooms;
  renderRooms(rooms);
});
function renderRooms(rooms) {
  roomsList.innerHTML = '';
  $('rooms-count').textContent = rooms.length + ' rooms';
  rooms.forEach(function (r) {
    var div = document.createElement('div');
    div.className = 'room-item';
    var name = document.createElement('div');
    name.className = 'room-name';
    name.textContent = r.password ? '🔒 ' + r.name : '#' + r.name;
    if (r.topic) {
      var topic = document.createElement('div');
      topic.className = 'room-topic';
      topic.textContent = r.topic;
      div.appendChild(topic);
    }
    div.insertBefore(name, div.firstChild);
    var meta = document.createElement('div');
    meta.className = 'room-meta';
    meta.innerHTML = '<span class="room-online-dot"></span> ' + (r.member_count || 0) + ' online';
    div.appendChild(meta);
    var badge = document.createElement('span');
    badge.className = 'room-badge';
    badge.textContent = r.name === 'lobby' ? 'PUBLIC' : (r.password ? 'PRIVATE' : 'OPEN');
    div.querySelector('.room-name').appendChild(badge);
    div.addEventListener('click', function () {
      initAudio();
      App.socket.emit('room:join', r.name);
    });
    roomsList.appendChild(div);
  });
}
if (roomsSearch) {
  roomsSearch.addEventListener('input', function () {
    var q = this.value.toLowerCase().trim();
    if (!q) { renderRooms(_allRooms); return; }
    var filtered = _allRooms.filter(function (r) {
      return r.name.toLowerCase().includes(q) || (r.topic && r.topic.toLowerCase().includes(q));
    });
    renderRooms(filtered);
  });
}

$('create-room-btn').addEventListener('click', function () {
  var name = $('new-room-name').value.trim();
  var topic = $('new-room-topic').value.trim();
  var password = $('new-room-password').value.trim();
  if (!name) return;
  App.socket.emit('room:create', { name: name, topic: topic, password: password || undefined });
  $('new-room-name').value = '';
  $('new-room-topic').value = '';
  $('new-room-password').value = '';
});

$('new-room-name').addEventListener('keydown', function (e) {
  if (e.key === 'Enter') $('create-room-btn').click();
});

// Password-protected room handler
App.socket.on('room:password_required', function (data) {
  var pwd = prompt('🔐 Room "' + data.name + '" requires password:');
  if (pwd) App.socket.emit('room:join', { name: data.name, password: pwd });
});

// ─── Chat ──────────────────────────────────────────────────
App.socket.on('init', function (data) {
  App.myId = data.id || App.socket.id;
});

App.socket.on('message', function (data) {
  try {
    addMessage(data);
    if (data.user && data.type !== 'system' && data.type !== 'whisper') {
      App._lastMsg = { user: data.user, text: data.text || '' };
    }
    // Shake on unknown command
    if (data && data.type === 'system' && data.text && data.text.includes('Unknown')) {
      var inp = document.getElementById('message-input');
      if (inp) { inp.classList.add('shake'); inp.style.borderColor='#f00'; inp.style.boxShadow='0 0 15px rgba(255,0,0,0.4)'; setTimeout(function(){inp.classList.remove('shake');inp.style.borderColor='';inp.style.boxShadow='';},500); }
    }
    // Date separators for user messages
    if (data.type === 'user') {
      var today = new Date().toDateString();
      if (_lastMsgDate !== today) {
        _lastMsgDate = today;
        addMessage({ type: 'system', text: '─── ' + today + ' ───' });
      }
    }
    // Whisper sound
    if (data.type === 'whisper' && App.soundEnabled) {
      SFX.whisper();
    }
  } catch (e) {
    console.error('[MSG ERROR]', e);
    // Fallback: append raw text
    if (chatMessages && data.text) {
      var fallback = document.createElement('div');
      fallback.className = 'msg-line message system';
      fallback.textContent = '[RAW] ' + data.text;
      chatMessages.appendChild(fallback);
    }
  }
});
App.socket.on('clear', function () { chatMessages.innerHTML = ''; });

// Monitor chatMessages mutations for debugging
var chatObserver = new MutationObserver(function (mutations) {
  mutations.forEach(function (m) {
    if (m.type === 'childList' && m.removed.length > 0) {
      console.warn('[OBSERVER] Messages removed:', m.removed.length, 'target:', m.target.id);
    }
    if (m.type === 'characterData' || (m.type === 'childList' && m.added.length === 0 && m.removed.length > 0)) {
      // Track innerHTML replacements
    }
  });
});
chatObserver.observe(chatMessages, { childList: true, subtree: true, attributes: false });

App.socket.on('flash', function (data) {
  var el = document.createElement('div');
  el.style.cssText = 'position:fixed;top:0;left:0;right:0;padding:6px;background:'+(data.color||'#f44')+';color:#000;text-align:center;font-weight:bold;z-index:9999;font-size:10px;letter-spacing:2px;animation:fadeFlash 3s forwards';
  el.textContent = data.text || '';
  document.body.appendChild(el);
  setTimeout(function () { el.remove(); }, 3000);
});

// ─── Admin Entry Dramatic Effect ────────────────────────────
App.socket.on('admin:entered', function (data) {
  initAudio();
  SFX.alert();
  glitch();

  // Screen shake
  var chatContainer = document.querySelector('.chat-container');
  if (chatContainer) {
    chatContainer.style.animation = 'none';
    void chatContainer.offsetWidth;
    chatContainer.style.animation = 'screenShake 0.5s ease-out';
    setTimeout(function () { if (chatContainer) chatContainer.style.animation = ''; }, 600);
  }

  // Red flash overlay
  var flashOverlay = document.createElement('div');
  flashOverlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(255,0,0,0.15);z-index:9998;pointer-events:none;animation:flashFade 1.5s ease-out forwards';
  document.body.appendChild(flashOverlay);
  setTimeout(function () { flashOverlay.remove(); }, 1600);

  // Big dramatic notification in chat
  var adminMsg = document.createElement('div');
  adminMsg.className = 'msg-line message system';
  adminMsg.style.cssText = 'border:1px solid #f44;background:rgba(255,0,0,0.08);padding:8px 12px;margin:6px 0;text-align:center;font-size:12px;font-weight:bold;color:#f44;text-shadow:0 0 20px rgba(255,0,0,0.6),0 0 40px rgba(255,0,0,0.3);letter-spacing:3px;animation:adminEntryPulse 0.8s ease-in-out 3';
  adminMsg.textContent = '⚠ ' + (data.username || 'ADMIN') + ' HAS ENTERED THE SERVER ⚠';
  var chatMsgs = document.getElementById('chat-messages');
  if (chatMsgs) {
    chatMsgs.appendChild(adminMsg);
    chatMsgs.scrollTop = chatMsgs.scrollHeight;
    setTimeout(function () { adminMsg.style.opacity = '0.3'; adminMsg.style.transition = 'opacity 2s'; }, 3000);
  }

  // Flash the title
  var origTitle = document.title;
  document.title = '⚠ ' + (data.username || 'ADMIN').toUpperCase() + ' ONLINE ⚠';
  setTimeout(function () { document.title = origTitle; }, 2000);
});

App.socket.on('admin:action', function (data) {
  initAudio();
  SFX.alert();

  var chatContainer = document.querySelector('.chat-container');
  if (chatContainer) {
    chatContainer.style.animation = 'none';
    void chatContainer.offsetWidth;
  }

  var flashColor, emoji, titlePrefix, shakeStr, borderColor, bgColor, textColor, glowColor;
  switch (data.action) {
    case 'kick':
      flashColor = 'rgba(255,165,0,0.15)';
      emoji = '💥';
      titlePrefix = '💥 KICKED';
      shakeStr = 'screenShake 0.3s ease-out';
      borderColor = '#fa0';
      bgColor = 'rgba(255,165,0,0.08)';
      textColor = '#fa0';
      glowColor = 'rgba(255,165,0,0.6)';
      break;
    case 'ban':
      flashColor = 'rgba(255,0,0,0.2)';
      emoji = '⛔';
      titlePrefix = '⛔ BANNED';
      shakeStr = 'screenShake 0.6s ease-out';
      borderColor = '#f44';
      bgColor = 'rgba(255,0,0,0.1)';
      textColor = '#f44';
      glowColor = 'rgba(255,0,0,0.6)';
      break;
    case 'mute':
      flashColor = 'rgba(255,255,0,0.1)';
      emoji = '🔇';
      titlePrefix = '🔇 MUTED';
      shakeStr = 'screenShake 0.2s ease-out';
      borderColor = '#ff0';
      bgColor = 'rgba(255,255,0,0.06)';
      textColor = '#ff0';
      glowColor = 'rgba(255,255,0,0.4)';
      break;
    default:
      return;
  }

  if (chatContainer) {
    chatContainer.style.animation = shakeStr;
    setTimeout(function () { if (chatContainer) chatContainer.style.animation = ''; }, 600);
  }

  var flashOverlay = document.createElement('div');
  flashOverlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:' + flashColor + ';z-index:9998;pointer-events:none;animation:flashFade 1.5s ease-out forwards';
  document.body.appendChild(flashOverlay);
  setTimeout(function () { flashOverlay.remove(); }, 1600);

  var actionMsg = document.createElement('div');
  actionMsg.className = 'msg-line message system';
  actionMsg.style.cssText = 'border:1px solid ' + borderColor + ';background:' + bgColor + ';padding:8px 12px;margin:6px 0;text-align:center;font-size:12px;font-weight:bold;color:' + textColor + ';text-shadow:0 0 20px ' + glowColor + ',0 0 40px ' + glowColor.replace('0.6','0.3') + ';letter-spacing:2px;animation:adminEntryPulse 0.8s ease-in-out 3';
  if (data.action === 'mute') {
    actionMsg.textContent = emoji + ' ' + data.target + ' MUTED ' + data.minutes + 'min by ' + data.admin + ' ' + emoji;
  } else {
    actionMsg.textContent = emoji + ' ' + data.target + ' ' + titlePrefix + ' by ' + data.admin + ' ' + emoji;
  }
  var chatMsgs = document.getElementById('chat-messages');
  if (chatMsgs) {
    chatMsgs.appendChild(actionMsg);
    chatMsgs.scrollTop = chatMsgs.scrollHeight;
    setTimeout(function () { actionMsg.style.opacity = '0.3'; actionMsg.style.transition = 'opacity 2s'; }, 3000);
  }

  var origTitle = document.title;
  document.title = titlePrefix + ' ' + data.target.toUpperCase();
  setTimeout(function () { document.title = origTitle; }, 2000);
});

App.socket.on('playsound', function (effect) {
  initAudio();
  var sounds = {
    beep:   function () { SFX.click(); },
    alert:  function () { SFX.alert(); },
    error:  function () { SFX.error(); },
    success:function () { SFX.success(); },
    scan:   function () { SFX.scan(); },
    boot:   function () { SFX.boot(); },
    join:   function () { SFX.join(); },
    leave:  function () { SFX.leave(); },
    notify: function () { SFX.notify(); },
    pop:    function () { SFX.pop(); },
    powerup:function () { SFX.powerup(); },
    powerdown:function () { SFX.powerdown(); },
    whisper:function () { SFX.whisper(); },
  };
  var fn = sounds[effect];
  if (fn) { fn(); } else { SFX.click(); }
  if (effect === 'alert' || effect === 'error') { glitch(); }
});

App.socket.on('users', function (users) {
  renderUsers(users);
});

App.socket.on('typing', function (user) {
  typingIndicator.innerHTML = user + ' <span class="typing-dots"><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span></span>';
  // Animate avatar in user list
  var items = document.querySelectorAll('.user-item');
  for (var i = 0; i < items.length; i++) {
    var name = items[i].querySelector('.u-name');
    if (name && name.textContent.indexOf(user) !== -1) {
      items[i].classList.add('user-typing');
    }
  }
});
App.socket.on('stoptyping', function () {
  typingIndicator.innerHTML = '';
  var items = document.querySelectorAll('.user-item.user-typing');
  for (var i = 0; i < items.length; i++) {
    items[i].classList.remove('user-typing');
  }
});

// ─── Live Typing Display ────────────────────────────────────
var liveTypingEl = document.createElement('div');
liveTypingEl.className = 'live-typing';
document.querySelector('.chat-input-area').insertBefore(liveTypingEl, document.querySelector('.chat-input-row'));
var liveTypingTimers = {};

App.socket.on('typing:live', function (data) {
  var existing = document.querySelector('.live-typing-item[data-user="' + data.user + '"]');
  if (existing) {
    existing.querySelector('.lt-text').textContent = data.text;
  } else {
    var item = document.createElement('div');
    item.className = 'live-typing-item';
    item.dataset.user = data.user;
    item.innerHTML = '<span class="lt-user" style="color:' + (data.color || '#0f0') + '">' + data.user + '</span> <span class="lt-text">' + data.text + '</span><span class="lt-cursor">█</span>';
    liveTypingEl.appendChild(item);
  }
  if (liveTypingTimers[data.user]) clearTimeout(liveTypingTimers[data.user]);
  liveTypingTimers[data.user] = setTimeout(function () {
    var el = document.querySelector('.live-typing-item[data-user="' + data.user + '"]');
    if (el) el.remove();
    delete liveTypingTimers[data.user];
  }, 2000);
  liveTypingEl.style.display = 'block';
});

var notifs = [];
function addNotif(text, type) {
  notifs.push({ text: text, type: type || 'info', time: new Date().toLocaleTimeString() });
  if (notifs.length > 50) notifs.shift();
  renderNotifs();
  var badge = $('notif-badge');
  badge.textContent = notifs.length;
  badge.style.display = 'inline';
}

function renderNotifs() {
  var body = $('notif-panel-body');
  body.innerHTML = '';
  if (notifs.length === 0) { body.innerHTML = '<div class="notif-empty">No notifications</div>'; return; }
  notifs.slice(-20).reverse().forEach(function (n) {
    var div = document.createElement('div');
    div.className = 'notif-item';
    div.innerHTML = '<span>' + n.text + '</span><span class="notif-time">' + n.time + '</span>';
    body.appendChild(div);
  });
  $('notif-panel-count').textContent = notifs.length;
}

function addMessage(data, noTypewriter) {
  var div = document.createElement('div');
  div.className = 'msg-line';
  if (data.id) div.dataset.msgId = data.id;
  var isMention = false;
  var isAlert = false;

  if (data.type === 'file') {
    div.classList.add('message', 'file');
    div.style.borderLeftColor = data.color || '#0f0';
    var fileHeader = document.createElement('div');
    fileHeader.style.cssText = 'display:flex;align-items:center;gap:4px';
    var fileIcon = document.createElement('span');
    fileIcon.textContent = data.isImage ? '🖼' : '📎';
    fileIcon.style.fontSize = '10px';
    var uSpanF = document.createElement('span');
    uSpanF.className = 'msg-user';
    uSpanF.style.color = data.color || '#0f0';
    uSpanF.textContent = data.user;
    fileHeader.appendChild(fileIcon);
    fileHeader.appendChild(uSpanF);
    div.appendChild(fileHeader);
    if (data.isImage) {
      var imgWrap = document.createElement('div');
      imgWrap.className = 'file-preview';
      var imgEl = document.createElement('img');
      imgEl.src = 'data:image/'+(data.ext==='jpg'?'jpeg':data.ext)+';base64,'+data.fileData;
      imgEl.alt = data.fileName;
      imgEl.style.cssText = 'max-width:100%;display:block;cursor:pointer;transition:opacity 0.2s';
      imgEl.addEventListener('click', function () { window.open(this.src, '_blank'); });
      imgWrap.appendChild(imgEl);
      div.appendChild(imgWrap);
    }
    var info = document.createElement('div');
    info.className = 'file-info';
    info.textContent = '📎 ' + data.fileName + ' (' + (data.size > 1024 ? Math.round(data.size/1024)+'KB' : data.size+'B') + ')';
    info.style.cssText = 'font-size:9px;color:var(--fg-dim);margin-top:2px;cursor:pointer;transition:color 0.2s';
    info.addEventListener('click', function () {
      if (data.isImage) { window.open('data:image/'+(data.ext==='jpg'?'jpeg':data.ext)+';base64,'+data.fileData, '_blank'); }
    });
    div.appendChild(info);
    var tSpanF = document.createElement('span');
    tSpanF.className = 'msg-time';
    tSpanF.textContent = data.time;
    div.appendChild(tSpanF);
    addNotif(data.user + ' shared ' + data.fileName, 'file');
    isAlert = true;
  } else if (data.type === 'system') {
    div.classList.add('message', 'system');
    var sysIcon = '>';
    if (data.text.startsWith('[!]') || data.text.startsWith('⚠')) sysIcon = '⚠️';
    else if (data.text.startsWith('[✓]') || data.text.startsWith('✅')) sysIcon = '✅';
    else if (data.text.startsWith('[>]') || data.text.startsWith('⚡')) sysIcon = '⚡';
    else if (data.text.startsWith('[x]') || data.text.startsWith('❌')) sysIcon = '❌';
    if (data.text.includes('joined') || data.text.includes('left')) sysIcon = '👋';
    // If message contains <br>, render as scrollable block
    if (data.text.indexOf('<br>') !== -1) {
      var sysPre = document.createElement('div');
      sysPre.style.cssText = 'max-height:300px;overflow-y:auto;font-size:9px;line-height:1.6;padding:4px 0';
      sysPre.innerHTML = data.text.replace(/<br>/g, '\n').replace(/\n/g, '<br>');
      div.innerHTML = '<span class="msg-sys-icon">' + sysIcon + '</span> ';
      div.appendChild(sysPre);
    } else {
      div.innerHTML = '<span class="msg-sys-icon">' + sysIcon + '</span> ' + data.text;
    }
  } else if (data.type === 'whisper') {
    div.classList.add('message', 'whisper');
    div.style.borderLeftColor = '#f0f';
    var whisperHeader = document.createElement('div');
    whisperHeader.style.cssText = 'display:flex;align-items:center;gap:4px';
    var bellIcon = document.createElement('span');
    bellIcon.textContent = '🔔';
    bellIcon.style.cssText = 'font-size:8px;margin-right:2px';
    bellIcon.title = 'Private message';
    var badge = document.createElement('span');
    badge.className = 'msg-badge whisper';
    badge.textContent = 'WHISPER';
    var uSpan = document.createElement('span');
    uSpan.className = 'msg-user';
    uSpan.style.color = data.color || '#0f0';
    uSpan.textContent = data.from;
    whisperHeader.appendChild(bellIcon);
    whisperHeader.appendChild(uSpan);
    whisperHeader.appendChild(badge);
    div.appendChild(whisperHeader);
    var whisperText = document.createElement('span');
    whisperText.className = 'msg-text';
    whisperText.textContent = data.text;
    div.appendChild(whisperText);
    var tSpan = document.createElement('span');
    tSpan.className = 'msg-time';
    tSpan.textContent = data.time;
    div.appendChild(tSpan);
    if (App.soundEnabled) SFX.whisper();
    isMention = true;
  } else if (data.type === 'whisper-sent') {
    div.classList.add('message', 'whisper-sent');
    div.style.borderLeftColor = '#0ff';
    var wsHeader = document.createElement('div');
    wsHeader.style.cssText = 'display:flex;align-items:center;gap:4px';
    var badge2 = document.createElement('span');
    badge2.className = 'msg-badge whisper-sent';
    badge2.textContent = 'TO ' + data.to;
    var uSpan2 = document.createElement('span');
    uSpan2.className = 'msg-user';
    uSpan2.style.color = '#0ff';
    uSpan2.textContent = 'you →';
    wsHeader.appendChild(uSpan2);
    wsHeader.appendChild(badge2);
    div.appendChild(wsHeader);
    var wsText = document.createElement('span');
    wsText.className = 'msg-text';
    wsText.textContent = data.text;
    div.appendChild(wsText);
    var tSpan2 = document.createElement('span');
    tSpan2.className = 'msg-time';
    tSpan2.textContent = data.time;
    div.appendChild(tSpan2);
  } else {
    div.classList.add('message', 'user');
    if (data.id === App.myId) div.classList.add('own');
    div.style.borderLeftColor = data.id === App.myId ? '#ff0' : (data.color || '#0f0');
    var msgHeader = document.createElement('div');
    msgHeader.style.cssText = 'display:flex;align-items:center;gap:4px;flex-wrap:wrap';
    var tSpan3 = document.createElement('span');
    tSpan3.className = 'msg-time';
    tSpan3.textContent = '[' + (data.time || '') + ']';
    tSpan3.title = 'Click to reply';
    tSpan3.style.cssText = 'cursor:pointer;opacity:0.5;font-size:7px;color:var(--fg-dark);margin-right:2px';
    tSpan3.addEventListener('click', function () {
      App.replyTo = { user: data.user, text: data.text || '', color: data.color || '#0f0' };
      updateReplyIndicator();
      messageInput.focus();
    });
    msgHeader.appendChild(tSpan3);
    var uSpan3 = document.createElement('span');
    uSpan3.className = 'msg-user';
    uSpan3.style.color = data.color || '#0f0';
    uSpan3.textContent = data.user;
    uSpan3.addEventListener('click', function () { showProfile(data.user); });
    uSpan3.style.cursor = 'pointer';
    msgHeader.appendChild(uSpan3);

    var encBadge = document.createElement('span');
    encBadge.className = 'encrypt-badge';
    encBadge.textContent = '🔐';
    encBadge.title = 'AES-256 Encrypted';
    msgHeader.appendChild(encBadge);

    div.appendChild(msgHeader);

    // Typewriter effect for text
    var textStr = data.text || '';
    var textWrap = document.createElement('div');
    textWrap.className = 'msg-text';
    textWrap.style.cssText = 'margin-top:2px';
    div.appendChild(textWrap);
    // Fast rendering with mention highlighting
    textWrap.innerHTML = textStr.replace(/@(\w+)/g, '<span class="mention">@$1</span>');
    var mentionMatch = textStr.match(/@(\w+)/g);
    if (mentionMatch) {
      mentionMatch.forEach(function(m) {
        if (App.user && m.slice(1).toLowerCase() === App.user.display.toLowerCase()) isMention = true;
      });
    }

    // Reaction button
    var reactDiv = document.createElement('div');
    reactDiv.className = 'msg-reactions';
    var reactBtn = document.createElement('button');
    reactBtn.className = 'reaction-btn';
    reactBtn.textContent = '+1';
    reactBtn.dataset.msgId = data.id || data.time;
    reactBtn.addEventListener('click', function () {
      this.classList.toggle('active');
      if (this.classList.contains('active')) this.textContent = '+1 ✓';
      else this.textContent = '+1';
    });
    reactDiv.appendChild(reactBtn);
    div.appendChild(reactDiv);

    if (data.id !== App.myId && App.soundEnabled) {
      SFX.notify();
      glitch();
    }
  }

  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  // Notification badge & title
  if (data.id && data.id !== App.myId && data.type !== 'whisper-sent') {
    App.unread++;
    updateNotifBadge();
    if (isMention || isAlert) {
      addNotif((data.user || data.from) + ': ' + (data.text || '(file)'), isAlert ? 'alert' : 'mention');
    }
  }
}

function renderUsers(users) {
  App.users = users;
  userListEl.innerHTML = '';
  $('user-count').textContent = users.length;
  var panelCount = document.getElementById('user-count-panel');
  if (panelCount) panelCount.textContent = users.length;
  var footerCount = document.getElementById('user-count-footer');
  if (footerCount) footerCount.textContent = users.length + ' online';
  users.forEach(function (u) {
    var div = document.createElement('div');
    var roleClass = u.role === 'admin' ? 'admin' : u.role === 'mod' ? 'mod' : u.role === 'guest' || (u.display || u.username).startsWith('guest_') ? 'guest' : '';
    div.className = 'user-item' + (roleClass ? ' ' + roleClass : '');
    var dot = document.createElement('span');
    dot.className = 'u-dot';
    dot.style.background = u.color || '#0f0';
    var name = document.createElement('span');
    name.className = 'u-name';
    name.style.color = u.color || '#0f0';
    var roleIcon = '';
    if (u.role === 'admin') roleIcon = '👑 ';
    else if (u.role === 'mod') roleIcon = '⭐ ';
    else if (roleClass === 'guest') roleIcon = '👤 ';
    name.textContent = roleIcon + (u.display || u.username);
    var role = document.createElement('span');
    role.className = 'u-role';
    role.textContent = u.role ? u.role.toUpperCase().slice(0, 3) : 'USR';
    role.style.color = u.role === 'admin' ? 'var(--admin-color)' : u.role === 'mod' ? 'var(--mod-color)' : u.role === 'guest' ? 'var(--guest-color)' : 'var(--fg)';
    var statusIcon = document.createElement('span');
    statusIcon.className = 'u-status-icon';
    statusIcon.textContent = u.status === 'away' ? '◐' : u.status === 'busy' ? '●' : '◉';
    statusIcon.style.color = u.status === 'away' ? '#ff0' : u.status === 'busy' ? '#f00' : '#0f0';
    var dndIcon = document.createElement('span');
    dndIcon.className = 'u-dnd-icon';
    dndIcon.textContent = '🔇';
    dndIcon.style.display = u.dnd ? 'inline' : 'none';
    dndIcon.style.fontSize = '7px';
    div.appendChild(dot);
    div.appendChild(name);
    div.appendChild(dndIcon);
    div.appendChild(statusIcon);
    div.appendChild(role);
    var whisperIcon = document.createElement('span');
    whisperIcon.className = 'u-whisper-icon';
    whisperIcon.textContent = '💬';
    whisperIcon.style.cssText = 'font-size:7px;margin-left:auto;cursor:pointer;opacity:0;transition:opacity 0.15s;display:none';
    whisperIcon.title = 'Private chat';
    div.addEventListener('mouseenter', function () { whisperIcon.style.display = 'inline'; setTimeout(function () { whisperIcon.style.opacity = '1'; }, 10); });
    div.addEventListener('mouseleave', function () { whisperIcon.style.opacity = '0'; setTimeout(function () { whisperIcon.style.display = 'none'; }, 150); });
    whisperIcon.addEventListener('click', function (e) {
      e.stopPropagation();
      var pc = document.getElementById('private-chat');
      if (pc) { pc.style.display = 'flex'; }
      selectPrivateChat(u.display || u.username);
    });
    div.appendChild(whisperIcon);
    div.addEventListener('click', function () { showProfile(u.display || u.username); });
    userListEl.appendChild(div);
  });
}

// ─── Profile Modal ─────────────────────────────────────────
var modal = $('profile-modal');
var modalClose = $('modal-close');
var modalWhisper = $('modal-whisper');
var modalUsername = $('modal-username');
var modalRole = $('modal-role');
var modalStatus = $('modal-status');
var modalIp = $('modal-ip');
var modalToken = $('modal-token');
var modalColor = $('modal-color');

function showProfile(username) {
  var u = App.users.find(function (x) { return (x.display || x.username) === username; });
  if (!u) return;
  modalUsername.textContent = u.display || u.username;
  modalUsername.style.color = u.color || '#0f0';
  modalUsername.style.textShadow = '0 0 10px ' + (u.color || '#0f0');
  modalRole.textContent = (u.role || 'user').toUpperCase();
  modalRole.style.color = u.role === 'admin' ? '#f44' : u.role === 'mod' ? '#ff0' : '#0f0';
  modalStatus.textContent = (u.status || 'online').toUpperCase();
  modalStatus.className = 'status-' + (u.status || 'online');
  modalIp.textContent = '--';
  modalToken.textContent = '--';
  modalColor.textContent = u.color || '#0f0';
  modalColor.style.color = u.color || '#0f0';
  document.getElementById('modal-xp').textContent = 'LVL ' + (u.level || 1) + ' | ' + (u.xp || 0) + ' XP';
  document.getElementById('modal-rep').textContent = '★' + (u.rep || '0.0');
  document.getElementById('modal-lastlogin').textContent = u.last_login ? new Date(u.last_login * 1000).toLocaleString() : '--';
  document.getElementById('modal-favcmds').textContent = u.favorite_cmds || '--';
  modalWhisper.onclick = function () {
    messageInput.value = '/whisper ' + username + ' ';
    messageInput.focus();
    modal.classList.remove('active');
  };
  // Request extended profile data
  App.socket.emit('profile:get', username);
  modal.classList.add('active');
}

App.socket.on('profile:data', function (data) {
  if (!modal.classList.contains('active')) return;
  if (data.rep !== undefined) document.getElementById('modal-rep').textContent = '★' + data.rep;
  if (data.last_login) document.getElementById('modal-lastlogin').textContent = new Date(data.last_login * 1000).toLocaleString();
  if (data.favorite_cmds) document.getElementById('modal-favcmds').textContent = data.favorite_cmds;
  if (data.xp !== undefined) document.getElementById('modal-xp').textContent = 'LVL ' + (data.level || 1) + ' | ' + data.xp + ' XP';
});

modalClose.addEventListener('click', function () { modal.classList.remove('active'); });
modal.addEventListener('click', function (e) { if (e.target === modal) modal.classList.remove('active'); });

// ─── Sound Toggle ──────────────────────────────────────────
var soundBtn = $('sound-toggle');
soundBtn.textContent = App.soundEnabled ? '♪' : '♪̸';
if (!App.soundEnabled) soundBtn.style.opacity = '0.4';
soundBtn.addEventListener('click', function () {
  App.soundEnabled = !App.soundEnabled;
  localStorage.setItem('hackerchat-sound', App.soundEnabled ? 'on' : 'off');
  soundBtn.textContent = App.soundEnabled ? '♪' : '♪̸';
  soundBtn.style.opacity = App.soundEnabled ? '1' : '0.4';
  if (App.soundEnabled) { initAudio(); beep(880, 80); }
});

// ─── Anonymous Mode ─────────────────────────────────────────
var anonBtn = $('anon-btn');
var anonActive = false;
anonBtn.addEventListener('click', function () {
  anonActive = !anonActive;
  if (anonActive) {
    App.socket.emit('anonymous:on');
    anonBtn.textContent = '👤!';
    anonBtn.style.color = '#f80';
    anonBtn.style.borderColor = '#f80';
    addMessage({ type: 'system', text: '[✓] Anonymous mode ACTIVATED — identity hidden' });
    SFX.powerup();
  } else {
    App.socket.emit('anonymous:off');
    anonBtn.textContent = '👤';
    anonBtn.style.color = '';
    anonBtn.style.borderColor = '';
    addMessage({ type: 'system', text: '[✓] Anonymous mode DEACTIVATED — identity restored' });
    SFX.powerdown();
  }
});

App.socket.on('anonymous:status', function (data) {
  if (data.active) {
    addNotif('Anonymous mode: ' + data.name, 'alert');
    var badge = document.getElementById('anon-badge') || (function() {
      var b = document.createElement('span');
      b.id = 'anon-badge';
      b.className = 'anon-badge';
      document.querySelector('.chat-header-left').appendChild(b);
      return b;
    })();
    badge.textContent = '👤 ' + data.name;
  } else {
    var badge = document.getElementById('anon-badge');
    if (badge) badge.remove();
  }
});

// ─── Notification Badge ────────────────────────────────────
var notifDot = document.createElement('div');
notifDot.className = 'notif-dot';
document.body.appendChild(notifDot);

function updateNotifBadge() {
  if (App.unread > 0) {
    notifDot.classList.add('active');
    document.title = '(' + App.unread + ') AtlasRoot';
  } else {
    notifDot.classList.remove('active');
    document.title = 'AtlasRoot v4.0';
  }
}

chatMessages.addEventListener('scroll', function () {
  if (chatMessages.scrollTop + chatMessages.clientHeight >= chatMessages.scrollHeight - 50) {
    App.unread = 0;
    updateNotifBadge();
  }
});

// ─── Status ─────────────────────────────────────────────────
// Send status update
document.addEventListener('visibilitychange', function () {
  if (document.hidden) App.socket.emit('user:status', 'away');
  else { App.socket.emit('user:status', 'online'); App.unread = 0; updateNotifBadge(); }
});

// ─── Notification Center ───────────────────────────────────
var notifBtn = $('notif-btn');
var notifPanel = $('notif-panel');
notifBtn.addEventListener('click', function () {
  notifPanel.classList.toggle('active');
  if (notifPanel.classList.contains('active')) {
    $('notif-badge').style.display = 'none';
  }
});
document.addEventListener('click', function (e) {
  if (!notifPanel.contains(e.target) && e.target !== notifBtn) notifPanel.classList.remove('active');
});

// ─── File Upload ───────────────────────────────────────────
var fileBtn = $('file-btn');
var fileInput = $('file-input');
fileBtn.addEventListener('click', function () { fileInput.click(); });
fileInput.addEventListener('change', function () {
  var file = fileInput.files[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) { alert('File too large (max 2MB)'); return; }
  var reader = new FileReader();
  reader.onload = function (e) {
    var base64 = e.target.result.split(',')[1];
    App.socket.emit('file:upload', { name: file.name, buffer: base64 });
    fileInput.value = '';
  };
  reader.readAsDataURL(file);
});

// ─── Server Status ─────────────────────────────────────────
App.socket.on('server:stats', function (stats) {
  $('sv-uptime').textContent = Math.floor(stats.uptime/60) + 'm ' + stats.uptime%60 + 's';
  $('sv-online').textContent = stats.usersOnline;
  $('sv-total-users').textContent = stats.totalUsers;
  $('sv-msgs').textContent = stats.totalMessages;
  $('sv-rooms').textContent = stats.totalRooms;
  $('sv-mem').textContent = stats.memory + 'MB';
});

// Show server panel with /status command or button in footer
var serverPanel = document.getElementById('server-panel');
$('server-panel-close').addEventListener('click', function () { serverPanel.classList.remove('active'); });
serverPanel.addEventListener('click', function (e) { if (e.target === serverPanel) serverPanel.classList.remove('active'); });

// ─── Emergency Mode ─────────────────────────────────────────
var emergOverlay = document.getElementById('emergency-overlay');
var emergOutput = document.getElementById('emergency-output');
var emergBtn = document.getElementById('emergency-btn');
var emergDisable = document.getElementById('emergency-disable');
var emergActive = false;
var emergInterval;

function addEmergLine(text) {
  var div = document.createElement('div');
  div.className = 'line';
  div.textContent = text;
  emergOutput.appendChild(div);
  emergOutput.scrollTop = emergOutput.scrollHeight;
}

function startEmergency() {
  if (emergActive) return;
  emergActive = true;
  emergOverlay.classList.add('active');
  emergOutput.innerHTML = '';
  var phases = [
    '⚠ LOCKDOWN PROTOCOL ENGAGED',
    '🔒 Encrypting all connections...',
    '🛡 Activating firewall rules...',
    '✅ Firewall: 12 rules applied',
    '🔒 Tunnel encryption: AES-256-GCM',
    '📡 Monitoring network traffic...',
    '✅ All trusted IPs whitelisted',
    '✅ Lockdown active. System secure.',
  ];
  var pIdx = 0;
  emergInterval = setInterval(function () {
    if (pIdx < phases.length) {
      addEmergLine(phases[pIdx]);
      pIdx++;
    } else {
      addEmergLine('');
      addEmergLine('⚠ SYSTEM IN LOCKDOWN - ' + Math.floor(Math.random()*999) + ' threats blocked');
    }
  }, 600);
}

function stopEmergency() {
  emergActive = false;
  emergOverlay.classList.remove('active');
  if (emergInterval) clearInterval(emergInterval);
}

emergBtn.addEventListener('click', function () {
  startEmergency();
  emergBtn.classList.add('active');
});
emergDisable.addEventListener('click', function () {
  stopEmergency();
  emergBtn.classList.remove('active');
});

// Listen for server lockdown state
App.socket.on('admin:lockdown', function (state) {
  if (state) {
    startEmergency();
    emergBtn.classList.add('active');
  } else {
    stopEmergency();
    emergBtn.classList.remove('active');
  }
});

// Live clock in footer
(function startClock() {
  var timeEl = document.getElementById('clock-time');
  var dateEl = document.getElementById('clock-date');
  if (!timeEl) return;
  var days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  function tick() {
    var d = new Date();
    timeEl.textContent = d.toLocaleTimeString();
    if (dateEl) dateEl.textContent = days[d.getDay()] + ', ' + d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
  }
  tick();
  setInterval(tick, 1000);
})();

// Sidebar toggle & buttons
(function() {
  var toggle = document.getElementById('sidebar-toggle');
  var sidebar = document.getElementById('sidebar');
  if (!toggle || !sidebar) return;
  toggle.addEventListener('click', function () { sidebar.classList.toggle('open'); });
  document.addEventListener('click', function (e) {
    if (sidebar.classList.contains('open') && !sidebar.contains(e.target) && e.target !== toggle) sidebar.classList.remove('open');
  });

  // PROFILE button
  document.querySelector('[data-view="profile"]').addEventListener('click', function () {
    if (App.user) { showProfile(App.user.display || App.user.username); }
    sidebar.classList.remove('open');
  });

  // CHAT button — scroll to bottom
  document.querySelector('[data-view="chat"]').addEventListener('click', function () {
    chatMessages.scrollTop = chatMessages.scrollHeight;
    sidebar.classList.remove('open');
    messageInput.focus();
  });

  // SETTINGS button
  document.querySelector('[data-view="settings"]').addEventListener('click', function () {
    document.getElementById('settings-modal').classList.add('active');
    sidebar.classList.remove('open');
  });

  // EXIT button
  document.getElementById('sidebar-exit').addEventListener('click', function () {
    localStorage.removeItem('hackerchat-auth');
    sessionStorage.removeItem('hackerchat-guest');
    App.socket.disconnect();
    location.reload();
  });
})();

// Settings modal wiring
(function() {
  var settingsModal = document.getElementById('settings-modal');
  if (!settingsModal) return;
  document.getElementById('settings-modal-close').addEventListener('click', function () { settingsModal.classList.remove('active'); });
  settingsModal.addEventListener('click', function (e) { if (e.target === settingsModal) settingsModal.classList.remove('active'); });

  // Sound toggle inside settings
  var settingsSoundBtn = document.getElementById('settings-sound-toggle');
  settingsSoundBtn.textContent = App.soundEnabled ? '♪' : '♪̸';
  if (!App.soundEnabled) settingsSoundBtn.style.opacity = '0.4';
  settingsSoundBtn.addEventListener('click', function () {
    App.soundEnabled = !App.soundEnabled;
    localStorage.setItem('hackerchat-sound', App.soundEnabled ? 'on' : 'off');
    settingsSoundBtn.textContent = App.soundEnabled ? '♪' : '♪̸';
    settingsSoundBtn.style.opacity = App.soundEnabled ? '1' : '0.4';
    document.getElementById('sound-toggle').textContent = App.soundEnabled ? '♪' : '♪̸';
    document.getElementById('sound-toggle').style.opacity = App.soundEnabled ? '1' : '0.4';
    if (App.soundEnabled) { initAudio(); beep(880, 80); }
  });

  // Logout button in settings
  document.getElementById('settings-logout-btn').addEventListener('click', function () {
    settingsModal.classList.remove('active');
    localStorage.removeItem('hackerchat-auth');
    sessionStorage.removeItem('hackerchat-guest');
    App.socket.disconnect();
    location.reload();
  });
})();

// Add server status & admin buttons to footer
var footerRight = document.querySelector('.footer-right');
if (footerRight) {
  var svBtn = document.createElement('button');
  svBtn.textContent = '[SYS]';
  svBtn.style.cssText = 'background:transparent;border:1px solid var(--fg-darker);color:var(--fg-dark);font-family:inherit;font-size:8px;padding:1px 6px;cursor:pointer;letter-spacing:1px';
  svBtn.addEventListener('click', function () {
    App.socket.emit('server:stats');
    serverPanel.classList.add('active');
  });
  footerRight.appendChild(svBtn);
}
// Admin button (shown when user is admin)
var adminBtn = document.createElement('button');
adminBtn.textContent = '[ADMIN]';
adminBtn.id = 'admin-panel-btn';
adminBtn.style.cssText = 'background:transparent;border:1px solid var(--fg-darker);color:var(--fg-dim);font-family:inherit;font-size:8px;padding:1px 6px;cursor:pointer;letter-spacing:1px;display:none';
adminBtn.addEventListener('click', function () {
  if (!adminPanel.classList.contains('active')) {
    App.socket.emit('admin:users');
    App.socket.emit('admin:rooms');
  }
  adminPanel.classList.add('active');
});
footerRight.insertBefore(adminBtn, footerRight.firstChild);

// Users panel toggle (mobile overlay)
(function() {
  var btn = document.getElementById('users-toggle-btn');
  var panel = document.getElementById('chat-users-panel');
  if (btn && panel) {
    btn.addEventListener('click', function () { panel.classList.toggle('open'); });
    document.addEventListener('click', function (e) {
      if (panel.classList.contains('open') && !panel.contains(e.target) && e.target !== btn) panel.classList.remove('open');
    });
  }
})();

// ─── Back to rooms ─────────────────────────────────────────
$('back-btn').addEventListener('click', function () {
  if (App.soundEnabled) SFX.leave();
  roomsScreen.classList.add('active');
  chatScreen.classList.remove('active');
  App.socket.emit('room:list');
});

App.socket.on('room:joined', function (data) {
  var roomName = data.room || data;
  if (typeof data === 'string') roomName = data;
  $('current-room').textContent = roomName.toUpperCase();
  $('current-room').setAttribute('data-text', roomName.toUpperCase());
  $('current-room').className = 'glitch-title';
  $('current-topic').textContent = data.topic || '';
  chatMessages.innerHTML = '<div class="welcome-msg"><pre>\n  ╔════════════════════════╗\n  ║  JOINED: ' + roomName.toUpperCase().padEnd(15) + '║\n  ║  ' + (data.topic || 'Chat secure').padEnd(22) + '║\n  ╚════════════════════════╝</pre></div>';
  roomsScreen.classList.remove('active');
  chatScreen.classList.add('active');
  App.unread = 0;
  updateNotifBadge();
  if (App.soundEnabled) SFX.join();
});

App.socket.on('room:topic', function (data) {
  $('current-topic').textContent = data.topic || '';
});

// ─── Commands List (for autocomplete) ──────────────────────
var COMMANDS = ['help','nick','color','whisper','ping','scan','hack','clear','netstat','encrypt','search','ban','unban','setrole','mute','kick','announce','status','title','whois','time','uptime','motd','join','leave','create','users','room','firewall','blocked','banip','unbanip','clearroom','lockdown','export','sys','ai','grep','sound','reply','profile','rank','unlock','fake_maintenance','export_security_logs','del'];

// ─── Send ──────────────────────────────────────────────────
var SUSPICIOUS_DOMAINS = ['bit.ly','tinyurl','shorturl','short-link','t.co','rb.gy','shorturl.at','cutt.ly','ow.ly','is.gd','buff.ly','tiny.cc','tr.im','shorte.st'];
function hasSuspiciousLink(text) {
  var match = text.match(/https?:\/\/[^\s]+/ig);
  if (!match) return false;
  for (var i = 0; i < match.length; i++) {
    var url = match[i].toLowerCase();
    for (var d = 0; d < SUSPICIOUS_DOMAINS.length; d++) {
      if (url.indexOf(SUSPICIOUS_DOMAINS[d]) !== -1) return true;
    }
  }
  return false;
}
function send() {
  var text = messageInput.value.trim();
  if (!text) return;
  if (hasSuspiciousLink(text) && !confirm('⚠ Suspicious link detected: ' + text.match(/https?:\/\/[^\s]+/i)[0] + '\n\nSend anyway?')) return;
  if (!App.socket || !App.socket.connected) {
    addMessage({ type: 'system', text: '[!] Connection lost. Reconnecting...', time: '' });
    App.socket.connect();
    return;
  }
  if (App.cmdHistory.length === 0 || App.cmdHistory[App.cmdHistory.length - 1] !== text) {
    App.cmdHistory.push(text);
  }
  App.cmdIdx = App.cmdHistory.length;
  if (App.soundEnabled && !text.startsWith('/')) SFX.click();
  App.socket.emit('message', text);
  messageInput.value = '';
  messageInput.focus();
  App.socket.emit('stoptyping');
}

$('send-btn').addEventListener('click', send);
messageInput.addEventListener('keydown', function (e) {
  if (e.key === 'Enter') {
    if (App.replyTo) {
      var replyTxt = messageInput.value.trim();
      if (replyTxt) {
        App.socket.emit('message', '/reply ' + App.replyTo.user + ' | ' + App.replyTo.text.slice(0, 60) + ' | ' + replyTxt);
      }
      App.replyTo = null;
      updateReplyIndicator();
    }
    send(); return;
  }
  if (e.key === 'Tab') {
    e.preventDefault();
    var val = messageInput.value;
    var atIdx = val.lastIndexOf('@');
    var prefix = val.startsWith('/') ? val.slice(1) : '';
    if (prefix && atIdx === -1) {
      var match = COMMANDS.filter(function(c) { return c.startsWith(prefix); });
      if (match.length === 1) { messageInput.value = '/' + match[0] + ' '; }
    }
    // Quick mentions: @tab completion
    if (atIdx >= 0) {
      var partial = val.slice(atIdx + 1);
      var matches = (App.users || []).filter(function(u) { return (u.display || u.username).toLowerCase().startsWith(partial.toLowerCase()); });
      if (matches.length === 1) {
        messageInput.value = val.slice(0, atIdx + 1) + (matches[0].display || matches[0].username) + ' ';
      }
    }
    return;
  }
  if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (App.cmdIdx > 0) { App.cmdIdx--; messageInput.value = App.cmdHistory[App.cmdIdx]; }
    return;
  }
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (App.cmdIdx < App.cmdHistory.length - 1) { App.cmdIdx++; messageInput.value = App.cmdHistory[App.cmdIdx]; }
    else { App.cmdIdx = App.cmdHistory.length; messageInput.value = ''; }
    return;
  }
  App.socket.emit('typing');
  App.socket.emit('typing:live', messageInput.value);
  if (App.typingTimer) clearTimeout(App.typingTimer);
  App.typingTimer = setTimeout(function () { App.socket.emit('stoptyping'); }, 1500);
});

function updateReplyIndicator() {
  var ind = $('reply-indicator');
  if (App.replyTo) {
    ind.innerHTML = 'Replying to <span style="color:'+(App.replyTo.color||'#0f0')+'">' + App.replyTo.user + '</span>: "' + App.replyTo.text.slice(0,40) + '" <button onclick="App.replyTo=null;updateReplyIndicator()" style="background:transparent;border:none;color:var(--fg);cursor:pointer;font-family:inherit">✕</button>';
    ind.style.display = 'block';
  } else {
    ind.style.display = 'none';
  }
}

// ─── Theme Switcher ────────────────────────────────────────
document.querySelectorAll('.theme-btn').forEach(function (btn) {
  btn.addEventListener('click', function () {
    document.querySelectorAll('.theme-btn').forEach(function (b) { b.classList.remove('active'); });
    btn.classList.add('active');
    document.documentElement.setAttribute('data-theme', btn.dataset.theme);
    localStorage.setItem('hackerchat-theme', btn.dataset.theme);
  });
});

var savedTheme = localStorage.getItem('hackerchat-theme');
if (savedTheme) {
  document.documentElement.setAttribute('data-theme', savedTheme);
  document.querySelectorAll('.theme-btn').forEach(function (b) {
    b.classList.toggle('active', b.dataset.theme === savedTheme);
  });
}

// ─── Connection management ─────────────────────────────────
App.connError = null;
var bootMessages = [
  '> Initializing kernel...',
  '> Loading network modules...',
  '> Establishing secure tunnel...',
  '> Handshake in progress...',
  '> Encrypting channel (AES-256)...',
  '> Authenticating session...',
];
function updateAuthConnStatus() {
  var el = document.getElementById('auth-conn-status');
  var bar = document.getElementById('auth-loading-bar');
  var dot = document.getElementById('auth-conn-dot');
  var text = document.getElementById('auth-conn-text');
  if (!el) return;
  if (App.socket && App.socket.connected) {
    if (text) text.textContent = '● CONNECTED';
    el.style.color = '#0f0';
    if (dot) { dot.className = 'conn-status-dot connected'; }
    if (bar) bar.style.opacity = '0';
    var term = document.getElementById('auth-terminal');
    if (term) {
      term.innerHTML = '<div class="term-line system">> AUTHENTICATION REQUIRED</div><div class="term-line system">> STEP 1: ENTER USER ID</div>';
    }
  } else if (App.socket && App.socket.connecting) {
    if (text) text.textContent = '○ CONNECTING...';
    el.style.color = '#ff0';
    if (dot) { dot.className = 'conn-status-dot connecting'; }
    if (bar) bar.style.opacity = '1';
    var term = document.getElementById('auth-terminal');
    if (term && term.children.length < 8) {
      var idx = Math.floor(Date.now() / 1200) % bootMessages.length;
      var msg = bootMessages[idx];
      var existing = term.querySelector('.term-line:last-child');
      if (!existing || existing.textContent !== msg) {
        var div = document.createElement('div');
        div.className = 'term-line system';
        div.textContent = msg;
        term.appendChild(div);
        term.scrollTop = term.scrollHeight;
      }
    }
  } else {
    if (text) text.textContent = '✕ ' + (App.connError || 'DISCONNECTED');
    el.style.color = '#f44';
    if (dot) { dot.className = 'conn-status-dot disconnected'; }
    if (bar) bar.style.opacity = '0';
  }
}
App.socket.on('connect', function () {
  console.log('[SOCKET] connected');
  $('conn-status').textContent = 'connected';
  App.connError = null;
  updateAuthConnStatus();
});
App.socket.on('disconnect', function (reason) {
  console.warn('[SOCKET] disconnected:', reason);
  $('conn-status').textContent = 'disconnected';
  updateAuthConnStatus();
  addMessage({ type: 'system', text: '[!] Connection lost. Attempting to reconnect...', time: '' });
});
App.socket.on('connect_error', function (err) {
  console.error('[SOCKET] error:', err.message);
  App.connError = err.message;
  $('conn-status').textContent = 'ERROR';
  updateAuthConnStatus();
});
App.socket.on('reconnect_attempt', function () {
  console.log('[SOCKET] reconnecting...');
  $('conn-status').textContent = 'reconnecting...';
  updateAuthConnStatus();
});
App.socket.on('reconnect', function () {
  console.log('[SOCKET] reconnected');
  $('conn-status').textContent = 'connected';
  App.connError = null;
  updateAuthConnStatus();
  addMessage({ type: 'system', text: '[>] Connection restored', time: '' });
});

function ensureConnection(callback) {
  if (App.socket && App.socket.connected) { callback(); return; }
  var status;
  if (!App.socket) status = 'socket not initialized';
  else if (App.socket.connecting) status = 'connecting...';
  else status = App.connError || 'disconnected';
  authError.innerHTML = 'No connection (' + status + ')<br><small style="color:#f80;cursor:pointer" onclick="App.socket.connect();authError.innerHTML=\'Connecting...\';updateAuthConnStatus()">[retry]</small>';
  addTermLine('CONNECTION ERROR: ' + status.toUpperCase(), 'access-denied');
  if (App.socket && !App.socket.connected) { App.socket.connect(); updateAuthConnStatus(); }
}

// Initial auth connection status
setTimeout(updateAuthConnStatus, 500);

// ─── Lobby Live Stats ──────────────────────────────────────
App.socket.on('lobby:stats', function (stats) {
  var el = document.getElementById('lobby-stats');
  if (!el) {
    el = document.createElement('div');
    el.id = 'lobby-stats';
    el.style.cssText = 'display:flex;gap:8px;font-size:6px;color:var(--fg-dark);letter-spacing:1px';
    document.querySelector('.chat-header-left').appendChild(el);
  }
  el.innerHTML =
    '<span style="color:var(--fg)">USERS: ' + (stats.onlineUsers || 0) + '</span>' +
    '<span style="color:#f80">BLOCKED: ' + (stats.attemptsBlocked || 0) + '</span>' +
    '<span style="color:#f44">INTRUSION: ' + (stats.lastIntrusion || 'None').slice(0,30) + '</span>';
});

// ─── Fake Maintenance Handler (Hacker Movie Style) ─────────
App.socket.on('maintenance', function (data) {
  var overlay = document.getElementById('maintenance-overlay');
  if (!overlay) return;
  if (data.active) {
    overlay.style.display = 'flex';
    if (data.msg) document.getElementById('maintenance-msg').textContent = data.msg;
    // Start animated maintenance sequence
    var output = document.getElementById('maintenance-output');
    var bar = document.getElementById('maint-progress-bar');
    var status = document.getElementById('maint-status');
    if (App._maintInterval) clearInterval(App._maintInterval);
    var maintLines = [
      '> Initializing emergency protocol...',
      '> Encrypting all traffic (AES-256)...',
      '> Firewall: 12 rules updated',
      '> System integrity check: RUNNING',
      '> Scanning for rootkits...',
      '> Kernel modules: 23 loaded, 0 suspicious',
      '> Network connections: 142 active',
      '> IDS/IPS: 3 threats blocked',
      '> Memory dump: analyzing...',
      '> Decoy routing active: 8 nodes',
      '> Fake services online: 12',
      '> Honeypot traps: ACTIVE',
      '> All ports redirected to honeypot',
      '> Intruder trace: routed to 10.0.0.1',
      '> SYSTEM LOCKED - MAINTENANCE MODE',
    ];
    var idx = 0;
    var width = 0;
    if (App._maintTick) clearInterval(App._maintTick);
    App._maintTick = setInterval(function () {
      if (idx < maintLines.length) {
        var div = document.createElement('div');
        div.className = 'line maint-line';
        div.textContent = maintLines[idx];
        output.appendChild(div);
        output.scrollTop = output.scrollHeight;
        idx++;
        width = Math.min(100, Math.floor((idx / maintLines.length) * 100));
        if (bar) bar.style.width = width + '%';
        if (status) status.textContent = width + '% - ' + maintLines[Math.min(idx, maintLines.length - 1)].replace('> ', '');
      }
    }, 800);
  } else {
    overlay.style.display = 'none';
    if (App._maintTick) { clearInterval(App._maintTick); App._maintTick = null; }
  }
});
document.getElementById('maintenance-refresh').addEventListener('click', function () {
  location.reload();
});
// Emergency bypass for admins: triple-click status text to dismiss
var maintStatus = document.getElementById('maint-status');
var maintBypassClicks = 0;
if (maintStatus) {
  maintStatus.addEventListener('click', function () {
    maintBypassClicks++;
    if (maintBypassClicks >= 3) {
      maintBypassClicks = 0;
      var overlay = document.getElementById('maintenance-overlay');
      if (overlay) overlay.style.display = 'none';
      if (App._maintTick) { clearInterval(App._maintTick); App._maintTick = null; }
    }
  });
}

// ─── Role Changed Handler ────────────────────────────────
App.socket.on('role:changed', function (data) {
  if (App.user) {
    App.user.role = data.role;
    var myRole = document.getElementById('my-role');
    if (myRole) myRole.textContent = '[' + data.role.toUpperCase() + ']';
    var adminBtn = document.getElementById('admin-panel-btn');
    if (adminBtn) adminBtn.style.display = data.role === 'admin' ? 'inline' : 'none';
    if (data.role === 'admin') {
      var maintOverlay = document.getElementById('maintenance-overlay');
      if (maintOverlay) maintOverlay.style.display = 'none';
    }
  }
});

// ─── Admin Panel ────────────────────────────────────────────
var adminPanel = document.getElementById('admin-panel');
var adminPanelClose = document.getElementById('admin-panel-close');
var adminTabs = document.querySelectorAll('.admin-tab');

adminPanelClose.addEventListener('click', function () { adminPanel.classList.remove('active'); });
adminPanel.addEventListener('click', function (e) { if (e.target === adminPanel) adminPanel.classList.remove('active'); });

adminTabs.forEach(function (tab) {
  tab.addEventListener('click', function () {
    adminTabs.forEach(function (t) { t.classList.remove('active'); });
    tab.classList.add('active');
    document.querySelectorAll('.admin-tab-content').forEach(function (c) { c.classList.remove('active'); });
    var content = document.getElementById('admin-' + tab.dataset.atab);
    if (content) content.classList.add('active');
  });
});

// Admin Users
function renderAdminUsers(users) {
  var tbody = document.getElementById('admin-users-body');
  tbody.innerHTML = '';
  document.getElementById('admin-user-count').textContent = users.length + ' users';
  var filter = (document.getElementById('admin-user-search').value || '').toLowerCase();
  users.forEach(function (u) {
    if (filter && !u.username.toLowerCase().includes(filter) && !(u.display_name || '').toLowerCase().includes(filter)) return;
    var tr = document.createElement('tr');
    tr.innerHTML =
      '<td style="color:var(--fg-dark)">' + u.id + '</td>' +
      '<td style="color:' + (u.color || '#0f0') + '">' + (u.display_name || u.username) + '</td>' +
      '<td>' + (u.role || 'user').toUpperCase() + '</td>' +
      '<td>' + (u.online ? '<span style="color:#0f0">● ONLINE</span>' : '<span style="color:var(--fg-darker)">○ OFFLINE</span>') + '</td>' +
      '<td>' + (u.banned ? '<span style="color:#f00">BANNED</span>' : '<span style="color:var(--fg-dark)">—</span>') + '</td>' +
      '<td class="admin-actions">' +
        (u.banned
          ? '<button class="adm-btn adm-unban" data-id="' + u.id + '">UNBAN</button>'
          : '<button class="adm-btn adm-ban" data-id="' + u.id + '">BAN</button>') +
        '<button class="adm-btn adm-kick" data-id="' + u.id + '" data-user="' + u.username + '">KICK</button>' +
        '<select class="adm-select" data-id="' + u.id + '">' +
          '<option value="user"' + (u.role === 'user' ? ' selected' : '') + '>user</option>' +
          '<option value="mod"' + (u.role === 'mod' ? ' selected' : '') + '>mod</option>' +
          '<option value="admin"' + (u.role === 'admin' ? ' selected' : '') + '>admin</option>' +
        '</select>' +
      '</td>';
    tbody.appendChild(tr);
  });
  // Attach events
  tbody.querySelectorAll('.adm-ban').forEach(function (btn) {
    btn.addEventListener('click', function () { App.socket.emit('admin:ban', { userId: parseInt(this.dataset.id) }); });
  });
  tbody.querySelectorAll('.adm-unban').forEach(function (btn) {
    btn.addEventListener('click', function () { App.socket.emit('admin:unban', { userId: parseInt(this.dataset.id) }); });
  });
  tbody.querySelectorAll('.adm-kick').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (confirm('Kick ' + this.dataset.user + '?')) { App.socket.emit('message', '/kick ' + this.dataset.user); }
    });
  });
  tbody.querySelectorAll('.adm-select').forEach(function (sel) {
    sel.addEventListener('change', function () {
      if (confirm('Change role to ' + this.value + '?')) {
        App.socket.emit('admin:setrole', { userId: parseInt(this.dataset.id), role: this.value });
      } else { this.selectedIndex = 0; }
    });
  });
}

App.socket.on('admin:users', function (users) { renderAdminUsers(users); });

document.getElementById('admin-user-search').addEventListener('input', function () {
  App.socket.emit('admin:users');
});
document.getElementById('admin-users-refresh').addEventListener('click', function () {
  App.socket.emit('admin:users');
  setAdminStatus('Users refreshed');
});

// Admin Rooms
function renderAdminRooms(rooms) {
  var tbody = document.getElementById('admin-rooms-body');
  tbody.innerHTML = '';
  document.getElementById('admin-room-count').textContent = rooms.length + ' rooms';
  rooms.forEach(function (r) {
    var tr = document.createElement('tr');
    tr.innerHTML =
      '<td style="color:var(--fg)">' + r.name + '</td>' +
      '<td style="color:var(--fg-dark);font-size:10px">' + (r.topic || '—') + '</td>' +
      '<td>' + (r.owner_name || '—') + '</td>' +
      '<td>' + (r.msg_count || 0) + '</td>' +
      '<td class="admin-actions">' +
        '<button class="adm-btn adm-clear" data-room="' + r.name + '">CLEAR</button>' +
        (r.name !== 'lobby' ? '<button class="adm-btn adm-del" data-room="' + r.name + '">DELETE</button>' : '') +
      '</td>';
    tbody.appendChild(tr);
  });
  tbody.querySelectorAll('.adm-clear').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (confirm('Clear all messages in ' + this.dataset.room + '?')) {
        App.socket.emit('admin:clearroom', { roomName: this.dataset.room });
      }
    });
  });
  tbody.querySelectorAll('.adm-del').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (confirm('DELETE room ' + this.dataset.room + '? This cannot be undone!')) {
        App.socket.emit('admin:deleteroom', { roomName: this.dataset.room });
      }
    });
  });
}

App.socket.on('admin:rooms', function (rooms) { renderAdminRooms(rooms); });
document.getElementById('admin-rooms-refresh').addEventListener('click', function () {
  App.socket.emit('admin:rooms');
  setAdminStatus('Rooms refreshed');
});

// Admin Messages
document.getElementById('admin-msg-search-btn').addEventListener('click', function () {
  var query = document.getElementById('admin-msg-search').value.trim();
  if (!query) return;
  App.socket.emit('admin:messagesearch', { query: query });
  setAdminStatus('Searching: ' + query);
});
document.getElementById('admin-msg-search').addEventListener('keydown', function (e) {
  if (e.key === 'Enter') document.getElementById('admin-msg-search-btn').click();
});

App.socket.on('admin:messagesearch', function (results) {
  var container = document.getElementById('admin-msg-results');
  container.innerHTML = '';
  if (results.length === 0) { container.innerHTML = '<div style="color:var(--fg-dark);font-size:10px;padding:10px;text-align:center">No results</div>'; return; }
  container.innerHTML = '<div style="color:var(--fg-dark);font-size:9px;padding:4px 8px">' + results.length + ' results</div>';
  results.slice(0, 30).forEach(function (m) {
    var div = document.createElement('div');
    div.style.cssText = 'padding:3px 8px;font-size:9px;border-bottom:1px solid rgba(0,255,0,0.03);color:var(--fg-dim)';
    div.textContent = '[' + (m.room || '?') + '] <' + m.username + '> ' + m.text.slice(0, 100);
    container.appendChild(div);
  });
});

App.socket.on('admin:export', function (data) {
  var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'chat_export_' + data.room + '_' + Date.now() + '.json';
  a.click();
  URL.revokeObjectURL(url);
  setAdminStatus('Exported ' + data.count + ' messages from ' + data.room);
});

document.getElementById('admin-export-btn').addEventListener('click', function () {
  var room = document.getElementById('admin-export-room').value.trim() || App.room;
  App.socket.emit('admin:export', { roomName: room });
  setAdminStatus('Exporting ' + room + '...');
});

// Admin Firewall
document.getElementById('admin-block-ip-btn').addEventListener('click', function () {
  var ip = document.getElementById('admin-block-ip').value.trim();
  if (!ip) return;
  App.socket.emit('admin:blockip', { ip: ip });
  document.getElementById('admin-block-ip').value = '';
  setTimeout(function () { App.socket.emit('admin:users'); }, 500);
});
document.getElementById('admin-unblock-ip-btn').addEventListener('click', function () {
  var ip = document.getElementById('admin-unblock-ip').value.trim();
  if (!ip) return;
  App.socket.emit('admin:unblockip', { ip: ip });
  document.getElementById('admin-unblock-ip').value = '';
});
document.getElementById('admin-broadcast-btn').addEventListener('click', function () {
  var msg = document.getElementById('admin-broadcast-msg').value.trim();
  if (!msg) return;
  App.socket.emit('admin:broadcast', { text: msg });
  document.getElementById('admin-broadcast-msg').value = '';
  setAdminStatus('Broadcast sent');
});
document.getElementById('admin-lockdown-btn').addEventListener('click', function () {
  if (confirm('Toggle LOCKDOWN mode? This will disconnect non-trusted users.')) {
    App.socket.emit('admin:lockdown');
    setAdminStatus('Lockdown toggled');
  }
});

// Set admin status
function setAdminStatus(msg) {
  var el = document.getElementById('admin-status');
  if (el) { el.textContent = msg; setTimeout(function () { el.textContent = 'Admin console ready'; }, 3000); }
}

// Request blocked IPs when firewall tab is shown
document.querySelectorAll('.admin-tab').forEach(function (tab) {
  tab.addEventListener('click', function () {
    if (tab.dataset.atab === 'firewall') {
      App.socket.emit('message', '/blocked');
    }
  });
});

// Proper firewall:blocked event (keep this one)
App.socket.on('firewall:blocked', function (ips) {
  var container = document.getElementById('admin-blocked-ips');
  if (!container) return;
  container.innerHTML = '';
  if (!ips || ips.length === 0) {
    container.innerHTML = '<div style="color:var(--fg-dark);font-size:10px;padding:8px;text-align:center">No blocked IPs</div>';
    return;
  }
  ips.forEach(function (ip) {
    var div = document.createElement('div');
    div.style.cssText = 'padding:3px 8px;font-size:9px;color:var(--fg-dim);border-bottom:1px solid rgba(0,255,0,0.03);display:flex;justify-content:space-between';
    div.innerHTML = '<span>' + ip + '</span><button class="adm-btn" onclick="App.socket.emit(\'admin:unblockip\',{ip:\'' + ip + '\'});this.parentElement.remove()">UNBLOCK</button>';
    container.appendChild(div);
  });
});

// ─── Private Chat (WhatsApp-like) ──────────────────────────
App.privateChat = { conversations: {}, activeUser: null, initialized: false };

function initPrivateChat() {
  if (App.privateChat.initialized) return;
  App.privateChat.initialized = true;

  var overlay = document.getElementById('private-chat');
  var sidebar = document.getElementById('private-conversations');
  var msgArea = document.getElementById('private-chat-messages');
  var input = document.getElementById('private-chat-input');
  var sendBtn = document.getElementById('private-chat-send');
  var backBtn = document.getElementById('private-chat-back');
  var typingEl = document.getElementById('private-chat-typing');

  function open() {
    overlay.style.display = 'flex';
    // Reset mobile view: show sidebar, hide main panel
    var sidebarEl = document.querySelector('.private-chat-sidebar');
    var mainEl = document.querySelector('.private-chat-main');
    if (sidebarEl) sidebarEl.style.display = 'flex';
    if (mainEl) mainEl.classList.remove('show');
    renderConversations();
  }
  function close() {
    overlay.style.display = 'none';
    App.privateChat.activeUser = null;
    // Reset mobile view for next open
    var sidebarEl = document.querySelector('.private-chat-sidebar');
    var mainEl = document.querySelector('.private-chat-main');
    if (sidebarEl) sidebarEl.style.display = 'flex';
    if (mainEl) mainEl.classList.remove('show');
    // Focus main chat input so user can type immediately
    messageInput.focus();
  }
  function closeIfMobile() { if (window.innerWidth <= 600) { close(); } }

  document.getElementById('private-chat-close').addEventListener('click', close);
  overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });

  document.getElementById('pc-btn').addEventListener('click', open);
  document.querySelector('[data-view="private"]').addEventListener('click', function () {
    document.getElementById('sidebar').classList.remove('open');
    open();
  });

  // Back button for mobile
  if (backBtn) {
    backBtn.addEventListener('click', function () {
      var main = document.querySelector('.private-chat-main');
      if (main) main.classList.remove('show');
      document.querySelector('.private-chat-sidebar').style.display = 'flex';
    });
  }

  function sendPrivate() {
    var text = input.value.trim();
    if (!text || !App.privateChat.activeUser) return;
    var user = App.privateChat.activeUser;
    App.socket.emit('whisper', { target: user, text: text });
    input.value = '';
    input.focus();
  }
  sendBtn.addEventListener('click', sendPrivate);
  input.addEventListener('keydown', function (e) { if (e.key === 'Enter') sendPrivate(); });

  // Listen for typing events from server
  App.socket.on('typing', function (data) {
    if (App.privateChat.activeUser === data.user && overlay.style.display !== 'none') {
      if (typingEl) {
        typingEl.style.display = 'inline';
        clearTimeout(typingEl._timer);
        typingEl._timer = setTimeout(function () { typingEl.style.display = 'none'; }, 3000);
      }
    }
  });
}

function getPrivateConv(user) {
  if (!App.privateChat.conversations[user])
    App.privateChat.conversations[user] = { user: user, messages: [], unread: 0, lastTime: '' };
  return App.privateChat.conversations[user];
}

function addPrivateMessage(from, text, time, incoming) {
  initPrivateChat();
  var conv = getPrivateConv(from);
  conv.messages.push({ from: from, text: text, time: time, incoming: incoming });
  conv.lastTime = time;
  if (App.privateChat.activeUser !== from && incoming) conv.unread++;
  renderConversations();
  if (App.privateChat.activeUser === from) renderPrivateMessages(from);
}

function renderConversations() {
  initPrivateChat();
  var sidebar = document.getElementById('private-conversations');
  sidebar.innerHTML = '';
  var users = Object.keys(App.privateChat.conversations);
  if (users.length === 0) {
    sidebar.innerHTML = '<div style="color:var(--fg-dark);font-size:9px;padding:20px;text-align:center">No conversations yet<br><span style="font-size:8px">Whisper someone to start</span></div>';
    return;
  }
  users.sort(function (a, b) {
    var ca = App.privateChat.conversations[a], cb = App.privateChat.conversations[b];
    var ta = ca.messages.length ? ca.messages[ca.messages.length-1].time : '';
    var tb = cb.messages.length ? cb.messages[cb.messages.length-1].time : '';
    return ta < tb ? 1 : -1;
  });
  users.forEach(function (u) {
    var conv = App.privateChat.conversations[u];
    var lastMsg = conv.messages.length ? conv.messages[conv.messages.length-1].text : '';
    var div = document.createElement('div');
    div.className = 'private-chat-conv-item' + (App.privateChat.activeUser === u ? ' active' : '');
    var color = '#0f0';
    var found = (App.users || []).find(function (x) { return (x.display||x.username) === u; });
    if (found) color = found.color || '#0f0';
    div.innerHTML =
      '<div class="private-chat-conv-avatar" style="border-color:'+color+';color:'+color+'">' + u[0].toUpperCase() + '</div>' +
      '<div class="private-chat-conv-info">' +
        '<div class="private-chat-conv-name" style="color:'+color+'">' + u + '</div>' +
        '<div class="private-chat-conv-preview">' + (lastMsg ? lastMsg.slice(0,40)+(lastMsg.length>40?'…':'') : '—') + '</div>' +
      '</div>' +
      '<div class="private-chat-conv-time">' + (conv.lastTime||'') + '</div>' +
      (conv.unread > 0 ? '<div class="private-chat-conv-unread">'+conv.unread+'</div>' : '');
    div.addEventListener('click', function () { selectPrivateChat(u); });
    sidebar.appendChild(div);
  });
}

function selectPrivateChat(user) {
  initPrivateChat();
  App.privateChat.activeUser = user;
  var conv = getPrivateConv(user);
  conv.unread = 0;
  document.getElementById('private-chat-partner').textContent = '🔒 ' + user;
  // Hide typing indicator when switching
  var typingEl = document.getElementById('private-chat-typing');
  if (typingEl) typingEl.style.display = 'none';
  // Mobile: show main panel
  if (window.innerWidth <= 600) {
    document.querySelector('.private-chat-sidebar').style.display = 'none';
    document.querySelector('.private-chat-main').classList.add('show');
  }
  renderConversations();
  renderPrivateMessages(user);
  document.getElementById('private-chat-input-area').style.display = 'flex';
  document.getElementById('private-chat-input').focus();
}

function renderPrivateMessages(user) {
  initPrivateChat();
  var msgArea = document.getElementById('private-chat-messages');
  var conv = App.privateChat.conversations[user];
  if (!conv || !conv.messages.length) {
    msgArea.innerHTML = '<div class="private-chat-empty">💬 Start a conversation with ' + user + '</div>';
    return;
  }
  msgArea.innerHTML = '';
  conv.messages.forEach(function (m) {
    var div = document.createElement('div');
    div.className = 'private-chat-msg ' + (m.incoming ? 'incoming' : 'outgoing');
    var color = '#0f0';
    var found = (App.users || []).find(function (x) { return (x.display||x.username) === m.from; });
    if (found) color = found.color || '#0f0';
    div.innerHTML =
      '<div class="private-chat-msg-user" style="color:'+color+'">' + (m.incoming ? m.from : 'you') + '</div>' +
      '<div class="private-chat-msg-text">' + m.text + '</div>' +
      '<div class="private-chat-msg-time">' + (m.time||'') + '</div>';
    msgArea.appendChild(div);
  });
  msgArea.scrollTop = msgArea.scrollHeight;
}

function escapeHtml(s) {
  if (!s) return '';
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// Hook whisper into private chat (do NOT show in main chat)
var _origAddMessage = addMessage;
addMessage = function (data) {
  if (data.type === 'whisper' || data.type === 'whisper-sent') {
    if (data.type === 'whisper') {
      addPrivateMessage(data.from, data.text, data.time||new Date().toLocaleTimeString(), true);
      var overlay = document.getElementById('private-chat');
      if (overlay && overlay.style.display === 'none') {
        var pcBtn = document.getElementById('pc-btn');
        if (pcBtn) { pcBtn.style.color = '#f0f'; setTimeout(function () { pcBtn.style.color = ''; }, 2000); }
      }
      if (document.hidden) {
        var origTitle = document.title;
        document.title = '🔔 Whisper from ' + data.from;
        setTimeout(function () { document.title = origTitle; }, 3000);
      }
    } else {
      addPrivateMessage(data.to, data.text, data.time||new Date().toLocaleTimeString(), false);
    }
    return;
  }
  _origAddMessage(data);
};

// ─── Focus Mode ─────────────────────────────────────────────
App.focusMode = false;
function toggleFocus(enable) {
  App.focusMode = enable;
  var c = document.querySelector('.chat-container');
  if (c) c.classList.toggle('focus-mode', enable);
}

// ─── Status Dropdown ────────────────────────────────────────
(function() {
  function setupDropdown(btnId, menuId) {
    var btn = document.getElementById(btnId), menu = document.getElementById(menuId);
    if (!btn || !menu) return;
    btn.addEventListener('click', function (e) { e.stopPropagation(); menu.classList.toggle('show'); });
    menu.querySelectorAll('.status-dropdown-item').forEach(function (item) {
      item.addEventListener('click', function () {
        var s = this.dataset.status;
        var icons = { online: '🟢', away: '🟡', busy: '🔴', invisible: '⚫' };
        // Update all status buttons
        document.querySelectorAll('.status-dropdown-btn').forEach(function (b) {
          b.textContent = (icons[s]||'🟢') + (b.id === 'status-btn' ? ' ' + s.toUpperCase() : '');
        });
        document.querySelectorAll('.status-dropdown-menu').forEach(function (m) {
          m.querySelectorAll('.status-dropdown-item').forEach(function (i) { i.classList.remove('active'); });
          var match = m.querySelector('[data-status="'+s+'"]');
          if (match) match.classList.add('active');
          m.classList.remove('show');
        });
        App.socket.emit('user:status', s);
        if (App.user) App.user.status = s;
        addMessage({ type: 'system', text: '[✓] Status changed to ' + s });
      });
    });
  }
  setupDropdown('status-btn', 'status-menu');
  document.addEventListener('click', function () {
    document.querySelectorAll('.status-dropdown-menu').forEach(function (m) { m.classList.remove('show'); });
  });
})();

// ─── Context Menu ───────────────────────────────────────────
(function() {
  var ctx = document.getElementById('context-menu');
  if (!ctx) return;
  var msgId, msgText, msgUser;
  document.addEventListener('contextmenu', function (e) {
    var ml = e.target.closest('.msg-line');
    if (ml) {
      e.preventDefault();
      msgId = ml.dataset.msgId;
      msgText = (ml.querySelector('.msg-text')||{}).textContent||'';
      msgUser = (ml.querySelector('.msg-user')||{}).textContent||'';
      var del = document.getElementById('ctx-delete');
      if (del) del.style.display = (App.user && App.user.role === 'admin') ? 'flex' : 'none';
      ctx.style.left = Math.min(e.clientX, innerWidth-160)+'px';
      ctx.style.top = Math.min(e.clientY, innerHeight-160)+'px';
      ctx.classList.add('show');
    }
  });
  document.addEventListener('click', function () { ctx.classList.remove('show'); });
  ctx.querySelectorAll('.context-menu-item').forEach(function (item) {
    item.addEventListener('click', function () {
      var a = this.dataset.action; ctx.classList.remove('show');
      if (a === 'copy' && msgText) navigator.clipboard.writeText(msgText).catch(function(){});
      else if (a === 'reply' && msgUser) { messageInput.value = '/reply ' + msgUser + ' '; messageInput.focus(); }
      else if (a === 'report' && msgUser) { App.socket.emit('message', '/report '+msgUser); addMessage({type:'system',text:'[✓] Reported '+msgUser}); }
      else if (a === 'delete' && msgId && App.user && App.user.role === 'admin') { App.socket.emit('message', '/del '+msgId); }
    });
  });
})();

// ─── Enhanced Reactions ─────────────────────────────────────
var EMOJIS = ['👍','❤️','😂','😮','🔥'];
var _origMsg = addMessage;
addMessage = function (data, noType) {
  _origMsg(data, noType);
  var msgs = document.querySelectorAll('.msg-line');
  var last = msgs[msgs.length-1];
  if (!last || last.classList.contains('system')||last.classList.contains('whisper')||last.classList.contains('whisper-sent')) return;
  var ra = last.querySelector('.msg-reactions');
  if (!ra) return;
  var picker = document.createElement('div'); picker.className = 'reaction-picker';
  EMOJIS.forEach(function (e) {
    var b = document.createElement('button'); b.className = 'reaction-picker-btn'; b.textContent = e;
    b.addEventListener('click', function (ev) { ev.stopPropagation(); toggleReact(last, e); picker.classList.remove('show'); });
    picker.appendChild(b);
  });
  ra.appendChild(picker);
  ra.querySelectorAll('.reaction-btn:not(.reaction-picker-btn)').forEach(function (b) {
    b.addEventListener('click', function () { toggleReact(last, b.dataset.emoji||b.textContent.trim().split(' ')[0]); });
  });
  var pb = document.createElement('button'); pb.className = 'reaction-btn'; pb.textContent = '+'; pb.style.fontSize='10px';
  pb.addEventListener('click', function (e) { e.stopPropagation(); picker.classList.toggle('show'); });
  ra.appendChild(pb);
};
function toggleReact(el, emoji) {
  var ex = el.querySelector('.reaction-btn[data-emoji="'+emoji+'"]');
  if (ex) {
    var c = parseInt(ex.dataset.count||'1');
    if (c<=1) ex.remove();
    else { ex.dataset.count = c-1; ex.querySelector('.reaction-count').textContent = c-1; }
    return;
  }
  if (App.soundEnabled) SFX.pop();
  var b = document.createElement('button'); b.className = 'reaction-btn active';
  b.dataset.emoji = emoji; b.dataset.count = '1';
  b.innerHTML = emoji + ' <span class="reaction-count">1</span>';
  b.addEventListener('click', function () { toggleReact(el, emoji); });
  var ra = el.querySelector('.msg-reactions');
  if (ra) ra.insertBefore(b, ra.querySelector('.reaction-picker')||ra.querySelector('.reaction-btn:last-child'));
}

// ─── Override send: focus + spinner + welcome ──────────────
var _origSend = send;
send = function (text) {
  if (text === undefined) text = messageInput.value.trim();
  if (text === '/focus on' || text === '/focus') { messageInput.value = ''; toggleFocus(true); addMessage({type:'system',text:'[✓] Focus ON'}); return; }
  if (text === '/focus off') { messageInput.value = ''; toggleFocus(false); addMessage({type:'system',text:'[✓] Focus OFF'}); return; }
  _origSend(text);
};



// ─── Welcome message ──────────────────────────────────────
var WELCOME_SET = ['🔓 Access granted, operator.','⚡ Connection stabilized. Welcome.','🛡️ Secure channel established.','👋 Good to see you!','🔐 AES-256 handshake complete.','🌐 Node authenticated. Hello.','✅ Identity verified. Welcome aboard.','🖥️ Terminal unlocked. Ready.','📡 Signal encrypted. You are secure.','⚙️ System ready. Awaiting commands.'];
App.socket.on('room:joined', function () {
  addMessage({type:'system',text:WELCOME_SET[Math.floor(Math.random()*WELCOME_SET.length)]});
});

// ─── Scroll to bottom button ───────────────────────────────
(function() {
  var btn = document.getElementById('scroll-bottom-btn');
  var msgs = document.getElementById('chat-messages');
  if (!btn || !msgs) return;
  msgs.addEventListener('scroll', function () {
    var dist = msgs.scrollHeight - msgs.scrollTop - msgs.clientHeight;
    btn.classList.toggle('show', dist > 80);
  });
  btn.addEventListener('click', function () {
    msgs.scrollTop = msgs.scrollHeight;
    btn.classList.remove('show');
  });
})();

var _lastMsgDate = '';



// ─── Toast Notification System ─────────────────────────────
function showToast(msg, icon, type) {
  var container = document.getElementById('toast-container');
  if (!container) return;
  var t = document.createElement('div');
  t.className = 'toast' + (type ? ' toast-' + type : '');
  t.innerHTML =
    '<span class="toast-icon">' + (icon||'✓') + '</span>' +
    '<span class="toast-text">' + msg + '</span>' +
    '<button class="toast-close">×</button>' +
    '<div class="toast-progress"></div>';
  container.appendChild(t);
  t.querySelector('.toast-close').addEventListener('click', function () { closeToast(t); });
  setTimeout(function () { closeToast(t); }, 3000);
}
function closeToast(el) {
  if (!el || el.classList.contains('toast-out')) return;
  el.classList.add('toast-out');
  setTimeout(function () { if (el.parentNode) el.remove(); }, 300);
}

// ─── Desktop Notifications ──────────────────────────────────
function notifyDesktop(title, body, icon) {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    new Notification(title, { body: body, icon: icon || '/favicon.ico' });
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission();
  }
}

// Request permission on user interaction
document.addEventListener('click', function reqNotif() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
  document.removeEventListener('click', reqNotif);
}, { once: true });

// Trigger desktop notification on whisper when tab is hidden
var _origAddMsgNotif = addMessage;
addMessage = function(data, noType) {
  _origAddMsgNotif(data, noType);
  if ((data.type === 'whisper' || data.type === 'whisper-sent') && document.hidden) {
    notifyDesktop(
      data.type === 'whisper' ? '🔔 Whisper from ' + data.from : '💬 Whisper sent',
      data.text ? data.text.slice(0, 80) : '(no text)'
    );
  }
};

// ─── Ripple Effect on Buttons ──────────────────────────────
document.addEventListener('click', function (e) {
  var btn = e.target.closest('.exec-btn, .input-btn, .modal-action, .sidebar-btn, .hdr-btn, .theme-btn');
  if (!btn) return;
  var r = document.createElement('span');
  r.className = 'btn-ripple';
  var rect = btn.getBoundingClientRect();
  var size = Math.max(rect.width, rect.height);
  r.style.width = r.style.height = size + 'px';
  r.style.left = (e.clientX - rect.left - size/2) + 'px';
  r.style.top = (e.clientY - rect.top - size/2) + 'px';
  btn.appendChild(r);
  setTimeout(function () { if (r.parentNode) r.remove(); }, 600);
});

// ─── Boot toast on ready ───────────────────────────────────
setTimeout(function () {
  showToast('Connection established', '🔗', 'success');
}, 1000);

// ─── User search filter ────────────────────────────────────
(function () {
  var searchInput = document.getElementById('user-search');
  if (!searchInput) return;
  searchInput.addEventListener('input', function () {
    var q = this.value.toLowerCase().trim();
    document.querySelectorAll('#user-list .user-item').forEach(function (item) {
      var name = (item.querySelector('.u-name') || {}).textContent || '';
      item.style.display = name.toLowerCase().includes(q) ? 'flex' : 'none';
    });
  });
})();

// ─── Emoji picker strip ────────────────────────────────────
document.querySelectorAll('.emoji-strip-btn').forEach(function (btn) {
  btn.addEventListener('click', function () {
    var input = document.getElementById('message-input');
    if (!input) return;
    var emoji = this.dataset.emoji;
    var start = input.selectionStart, end = input.selectionEnd;
    input.value = input.value.substring(0, start) + emoji + input.value.substring(end);
    input.selectionStart = input.selectionEnd = start + emoji.length;
    input.focus();
    if (App.soundEnabled) SFX.click();
  });
});

// ─── Message search modal ──────────────────────────────────
(function () {
  var modal = document.getElementById('search-modal');
  var close = document.getElementById('search-modal-close');
var searchBtn = document.getElementById('search-btn');
var searchInput = document.getElementById('search-input');
var results = document.getElementById('search-results');
if (!modal || !close || !searchBtn || !searchInput || !results) return;

// Quick-search button in input area
var msgSearchBtn = document.getElementById('msg-search-btn');
if (msgSearchBtn) {
  msgSearchBtn.addEventListener('click', function () {
    modal.classList.add('active');
    searchInput.value = '';
    searchInput.focus();
    results.innerHTML = '';
  });
}

  // Ctrl+F to open
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      e.preventDefault();
      modal.classList.add('active');
      searchInput.value = '';
      searchInput.focus();
      results.innerHTML = '';
    }
  });

  close.addEventListener('click', function () { modal.classList.remove('active'); });
  modal.addEventListener('click', function (e) { if (e.target === modal) modal.classList.remove('active'); });
  searchInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') searchBtn.click(); });

  searchBtn.addEventListener('click', function () {
    var q = searchInput.value.toLowerCase().trim();
    if (!q) { results.innerHTML = '<div style="padding:10px;text-align:center;color:var(--fg-darker)">Enter a search term</div>'; return; }
    var msgs = document.querySelectorAll('#chat-messages .msg-line .msg-text');
    var found = [];
    msgs.forEach(function (el) {
      if (el.textContent.toLowerCase().includes(q)) found.push(el);
    });
    if (found.length === 0) {
      results.innerHTML = '<div style="padding:10px;text-align:center;color:var(--fg-darker)">No results for "' + q + '"</div>';
      return;
    }
    results.innerHTML = '<div style="padding:4px 0;color:var(--fg);border-bottom:1px solid var(--border-subtle);margin-bottom:4px">' + found.length + ' result(s) for "' + q + '"</div>';
    found.forEach(function (el) {
      var item = document.createElement('div');
      item.style.cssText = 'padding:4px 6px;cursor:pointer;border-bottom:1px solid var(--border-subtle);transition:background 0.15s';
      item.textContent = el.textContent.slice(0, 120) + (el.textContent.length > 120 ? '…' : '');
      item.addEventListener('click', function () {
        var line = el.closest('.msg-line');
        if (line) {
          modal.classList.remove('active');
          line.scrollIntoView({ behavior: 'smooth', block: 'center' });
          line.style.background = 'rgba(255,255,0,0.05)';
          setTimeout(function () { line.style.background = ''; }, 2000);
        }
      });
      item.addEventListener('mouseenter', function () { item.style.background = 'rgba(0,255,0,0.03)'; });
      item.addEventListener('mouseleave', function () { item.style.background = ''; });
      results.appendChild(item);
    });
  });
})();

// ─── Join/Leave toast notifications ────────────────────────
(function () {
  App.socket.on('message', function (data) {
    if (data.type === 'system' && data.text) {
      var t = data.text;
      if (t.includes('joined the channel') || t.includes('joined the room')) {
        var user = t.replace(/ joined the (channel|room)$/, '');
        showToast(user + ' connected', '🟢', 'success');
      } else if (t.includes('left the channel') || t.includes('left the room') || t.includes('disconnected')) {
        var user2 = t.replace(/ (left the (channel|room)|disconnected)$/, '');
        showToast(user2 + ' disconnected', '🔴', 'warn');
      }
    }
  });
})();

// ─── Autocomplete hints ────────────────────────────────────
(function () {
  var input = document.getElementById('message-input');
  if (!input) return;
  input.addEventListener('input', function () {
    var val = this.value;
    if (val.startsWith('/')) {
      var partial = val.slice(1).toLowerCase();
      var match = COMMANDS.find(function (c) { return c.startsWith(partial) && c !== partial; });
      if (match) {
        this.style.borderBottomColor = 'var(--fg-dim)';
      } else {
        this.style.borderBottomColor = '';
      }
    } else {
      this.style.borderBottomColor = '';
    }
  });
})();

// ─── Quick actions toolbar ─────────────────────────────────
(function () {
  var tools = [
    { label: '🗑', cmd: '/clear', title: 'Clear chat' },
    { label: '👥', cmd: '/users', title: 'List users' },
    { label: '❓', cmd: '/help', title: 'Help' },
    { label: '🔊', cmd: '/sound notify', title: 'Test sound' },
    { label: '⏰', cmd: '/time', title: 'Server time' },
    { label: '📋', cmd: '/export', title: 'Export chat' },
    { label: '↺', cmd: function () { if (App._lastMsg && App._lastMsg.user) { messageInput.value = '/reply ' + App._lastMsg.user + ' | ' + (App._lastMsg.text || '').slice(0, 60) + ' | '; messageInput.focus(); } }, title: 'Quick reply' },
  ];
  var strip = document.querySelector('.emoji-strip');
  if (!strip) return;
  var sep = document.createElement('span');
  sep.style.cssText = 'width:1px;height:12px;background:var(--border-subtle);margin:0 3px;flex-shrink:0';
  strip.appendChild(sep);
  tools.forEach(function (t) {
    var btn = document.createElement('button');
    btn.className = 'emoji-strip-btn';
    btn.textContent = t.label;
    btn.title = t.title;
    btn.style.fontSize = '9px';
    btn.addEventListener('click', function () {
      if (typeof t.cmd === 'function') { t.cmd(); return; }
      messageInput.value = t.cmd;
      messageInput.focus();
      if (App.soundEnabled) SFX.click();
    });
    strip.appendChild(btn);
  });
})();

// ─── @mention autocomplete ─────────────────────────────────
(function () {
  var input = document.getElementById('message-input');
  if (!input) return;
  var container = document.createElement('div');
  container.id = 'mention-dropdown';
  var parent = input.parentElement;
  parent.style.position = 'relative';
  parent.appendChild(container);
  var _users = [];
  App.socket.on('users', function(users) { _users = users; });
  input.addEventListener('input', function() {
    var txt = this.value;
    var caret = this.selectionStart;
    var before = txt.slice(0, caret);
    var atMatch = before.match(/@(\w*)$/);
    if (atMatch) {
      var q = atMatch[1].toLowerCase();
      var matches = _users.filter(function(u) { return (u.display||u.username).toLowerCase().includes(q); }).slice(0, 8);
      if (matches.length) {
        container.innerHTML = '';
        container.style.display = 'block';
        matches.forEach(function(u) {
          var item = document.createElement('div');
          item.style.cssText = 'padding:3px 6px;cursor:pointer;color:var(--fg-dark);transition:background 0.1s';
          item.innerHTML = (u.color ? '<span style="color:'+u.color+'">●</span> ' : '') + (u.display||u.username);
          item.addEventListener('click', function() {
            var atPos = txt.lastIndexOf('@', caret - 1);
            input.value = txt.slice(0, atPos) + '@' + (u.display||u.username) + ' ' + txt.slice(caret);
            input.selectionStart = input.selectionEnd = atPos + (u.display||u.username).length + 2;
            input.focus();
            container.style.display = 'none';
          });
          item.addEventListener('mouseenter', function() { item.style.background = 'rgba(0,255,0,0.05)'; });
          item.addEventListener('mouseleave', function() { item.style.background = ''; });
          container.appendChild(item);
        });
        return;
      }
    }
    container.style.display = 'none';
  });
  input.addEventListener('blur', function() { setTimeout(function() { container.style.display = 'none'; }, 200); });
})();

// ─── Message copy button on hover ──────────────────────────
(function () {
  var msgs = document.getElementById('chat-messages');
  if (!msgs) return;
  msgs.addEventListener('mouseover', function(e) {
    var text = e.target.closest('.msg-text');
    if (!text) return;
    var line = text.closest('.msg-line');
    if (!line || line.querySelector('.msg-copy-btn')) return;
    var btn = document.createElement('span');
    btn.className = 'msg-copy-btn';
    btn.textContent = '📋';
    btn.title = 'Copy message';
    btn.style.cssText = 'position:absolute;right:4px;top:2px;font-size:8px;cursor:pointer;opacity:0.3;transition:opacity 0.15s;z-index:2';
    line.style.position = 'relative';
    line.appendChild(btn);
    btn.addEventListener('mouseenter', function() { btn.style.opacity = '1'; });
    btn.addEventListener('mouseleave', function() { btn.style.opacity = '0.3'; });
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      var txt = text.textContent;
      navigator.clipboard.writeText(txt).then(function() {
        showToast('Copied!', '📋', 'success');
        if (App.soundEnabled) SFX.click();
      }).catch(function() {
        var ta = document.createElement('textarea');
        ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select(); document.execCommand('copy');
        document.body.removeChild(ta);
        showToast('Copied!', '📋', 'success');
      });
      btn.textContent = '✓';
      setTimeout(function() { if (btn) btn.textContent = '📋'; }, 1000);
    });
  });
})();

// ─── Shortcuts modal ───────────────────────────────────────
(function () {
  var modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'shortcuts-modal';
  modal.innerHTML = '<div class="modal-box" style="max-width:350px"><div class="modal-header">⌨ SHORTCUTS <button class="modal-close" id="shortcuts-close">×</button></div><div class="modal-body" style="font-size:9px;color:var(--fg-dark);line-height:1.6"><div><span style="color:var(--fg)">Ctrl+F</span> — Search messages</div><div><span style="color:var(--fg)">Ctrl+↑</span> — Previous command</div><div><span style="color:var(--fg)">Ctrl+↓</span> — Next command</div><div><span style="color:var(--fg)">Esc</span> — Close modals / Cancel reply</div><div><span style="color:var(--fg)">@</span> — Mention user (autocomplete)</div><div><span style="color:var(--fg)">📋 hover</span> — Copy message</div><div><span style="color:var(--fg);font-size:11px">/help</span> — All commands</div></div></div>';
  document.body.appendChild(modal);
  document.getElementById('shortcuts-close').addEventListener('click', function() { modal.classList.remove('active'); });
  modal.addEventListener('click', function(e) { if (e.target === modal) modal.classList.remove('active'); });
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') modal.classList.remove('active');
  });
  var input = document.getElementById('message-input');
  if (input) {
    input.addEventListener('keydown', function(e) {
      if (e.key === '?' && input.value === '') {
        e.preventDefault();
        modal.classList.toggle('active');
      }
    });
  }
  if (!localStorage.getItem('shortcuts_seen')) {
    setTimeout(function() { showToast('Press ? for shortcuts', '⌨', 'warn'); }, 4000);
    localStorage.setItem('shortcuts_seen', '1');
  }
})();

// ─── Star / Bookmark messages ──────────────────────────────
(function () {
  var starred = JSON.parse(localStorage.getItem('starred_msg') || '[]');
  var msgs = document.getElementById('chat-messages');
  if (!msgs) return;
  msgs.addEventListener('mouseover', function(e) {
    var text = e.target.closest('.msg-text');
    if (!text) return;
    var line = text.closest('.msg-line');
    if (!line || line.querySelector('.msg-star-btn')) return;
    var btn = document.createElement('span');
    btn.className = 'msg-star-btn';
    btn.textContent = '☆';
    btn.title = 'Star message';
    btn.style.cssText = 'position:absolute;right:18px;top:2px;font-size:8px;cursor:pointer;opacity:0.3;transition:all 0.15s;z-index:2;text-shadow:none';
    line.style.position = 'relative';
    line.appendChild(btn);
    btn.addEventListener('mouseenter', function() { btn.style.opacity = '1'; });
    btn.addEventListener('mouseleave', function() { btn.style.opacity = '0.3'; });
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      var txt = text.textContent.slice(0, 80);
      var idx = starred.findIndex(function(s) { return s.text === txt; });
      if (idx >= 0) {
        starred.splice(idx, 1);
        btn.textContent = '☆';
        showToast('Unstarred', '☆', 'warn');
      } else {
        starred.unshift({ text: txt, time: new Date().toISOString() });
        btn.textContent = '★';
        showToast('Starred!', '★', 'success');
      }
      localStorage.setItem('starred_msg', JSON.stringify(starred));
      if (App.soundEnabled) SFX.pop();
    });
    var txt2 = text.textContent.slice(0, 80);
    if (starred.some(function(s) { return s.text === txt2; })) {
      btn.textContent = '★';
      btn.style.opacity = '0.6';
    }
  });
  var btn2 = document.createElement('button');
  btn2.className = 'emoji-strip-btn';
  btn2.textContent = '★';
  btn2.title = 'View starred messages';
  btn2.style.cssText = 'font-size:9px';
  btn2.addEventListener('click', function() {
    if (!starred.length) { showToast('No starred messages', '★', 'warn'); return; }
    showToast(starred.length + ' message(s) starred', '★', 'success');
    var m = document.createElement('div');
    m.className = 'modal-overlay';
    m.innerHTML = '<div class="modal-box" style="max-width:380px"><div class="modal-header">★ STARRED MESSAGES <button class="modal-close" id="starred-close">×</button></div><div class="modal-body" style="font-size:9px;color:var(--fg-dark);max-height:300px;overflow-y:auto">' + (starred.length ? starred.map(function(s) { return '<div style="padding:4px 0;border-bottom:1px solid var(--border-subtle)">' + s.text + '<span style="float:right;color:var(--fg-darker);font-size:7px">' + new Date(s.time).toLocaleDateString() + '</span></div>'; }).join('') : '<div style="padding:10px;text-align:center;color:var(--fg-darker)">No starred messages</div>') + '</div></div>';
    document.body.appendChild(m);
    setTimeout(function() { m.classList.add('active'); }, 10);
    m.querySelector('#starred-close').addEventListener('click', function() { m.classList.remove('active'); setTimeout(function() { m.remove(); }, 300); });
    m.addEventListener('click', function(e) { if (e.target === m) { m.classList.remove('active'); setTimeout(function() { m.remove(); }, 300); } });
  });
  var strip = document.querySelector('.emoji-strip');
  if (strip) {
    var sep2 = document.createElement('span');
    sep2.style.cssText = 'width:1px;height:12px;background:var(--border-subtle);margin:0 3px;flex-shrink:0';
    strip.appendChild(sep2);
    strip.appendChild(btn2);
  }
})();
