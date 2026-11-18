// ============================================================
//  دردشة مؤقتة — غرف كتابة وصوت بتتحذف أول ما صاحب الغرفة يخرج
//  التشغيل:
//     npm install ws
//     node server.js
//  وبعدين افتح http://localhost:3000
// ============================================================
const http = require('http');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3000;
const MAX_PER_ROOM = 8; // الصوت بيشتغل بشكل كويس لحد 8 أشخاص تقريباً

// ------------------------- الصفحة (الواجهة) -------------------------
const HTML = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>غرفة مؤقتة</title>
<link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap" rel="stylesheet">
<style>
:root{
  --bg:#12161c; --panel:#1b212b; --line:#2b3441; --text:#e9edf2; --dim:#8c97a8;
  --accent:#ffb020; --accent-ink:#1a1200; --me:#26405e; --danger:#ff6b5e;
  --font:'Tajawal',system-ui,-apple-system,'Segoe UI',Tahoma,sans-serif;
}
*{box-sizing:border-box;margin:0}
html,body{height:100%}
body{background:var(--bg);color:var(--text);font-family:var(--font);font-size:16px;line-height:1.5;
  padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)}
button,input{font:inherit;color:inherit}
button{cursor:pointer;border:0}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.hidden{display:none!important}

/* ---------- الشاشة الرئيسية ---------- */
#home{min-height:100%;display:flex;flex-direction:column;justify-content:center;gap:28px;max-width:420px;margin:0 auto;padding:24px}
#home h1{font-size:34px;font-weight:700;line-height:1.2}
#home p.sub{color:var(--dim);margin-top:6px}
.field{display:flex;flex-direction:column;gap:6px}
.field label{color:var(--dim);font-size:14px}
input[type=text]{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:12px 14px;width:100%}
.btn{background:var(--accent);color:var(--accent-ink);font-weight:700;border-radius:10px;padding:13px 16px;width:100%}
.btn.ghost{background:transparent;color:var(--text);border:1px solid var(--line)}
.row{display:flex;gap:10px}
.divider{color:var(--dim);font-size:14px;text-align:center}
#homeErr{color:var(--danger);min-height:22px;font-size:14px}

/* ---------- الغرفة ---------- */
#room{height:100%;display:flex;flex-direction:column;max-width:760px;margin:0 auto}
.top{display:flex;align-items:center;gap:10px;padding:12px 14px;border-bottom:1px solid var(--line);background:var(--panel)}
.top .code{font-weight:700;letter-spacing:2px;direction:ltr;background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:4px 10px}
.top .who{color:var(--dim);font-size:14px;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.small{background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:7px 12px;font-size:14px}
.small.leave{color:var(--danger);border-color:var(--danger)}
.notice{background:#2a2412;color:#ffd27a;padding:8px 14px;font-size:14px;border-bottom:1px solid var(--line)}
#log{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:8px}
.msg{max-width:82%;padding:8px 12px;border-radius:12px;background:var(--panel);border:1px solid var(--line);word-wrap:break-word;overflow-wrap:anywhere}
.msg .n{font-size:12px;color:var(--accent);font-weight:700}
.msg.me{align-self:flex-start;background:var(--me);border-color:transparent}
.msg.me .n{display:none}
.sys{align-self:center;color:var(--dim);font-size:13px}
.bar{display:flex;gap:8px;padding:10px 12px;border-top:1px solid var(--line);background:var(--panel)}
.bar input{flex:1}
.mic{width:46px;flex:none;border-radius:10px;background:var(--bg);border:1px solid var(--line);font-size:20px}
.mic.on{background:var(--accent);color:var(--accent-ink);border-color:var(--accent)}
.mic.muted{background:var(--danger);border-color:var(--danger);color:#fff}
.send{background:var(--accent);color:var(--accent-ink);font-weight:700;border-radius:10px;padding:0 18px}
#people{display:flex;gap:8px;flex-wrap:wrap;padding:8px 14px;border-bottom:1px solid var(--line);font-size:14px}
.chip{background:var(--bg);border:1px solid var(--line);border-radius:999px;padding:2px 10px}
.chip.talk{border-color:var(--accent);color:var(--accent)}
</style>
</head>
<body>

<section id="home">
  <div>
    <h1>غرفة مؤقتة</h1>
    <p class="sub">اتكلموا كتابة أو صوت، والغرفة بتختفي أول ما صاحبها يخرج.</p>
  </div>
  <div class="field">
    <label for="name">اسمك</label>
    <input id="name" type="text" maxlength="20" placeholder="مثلاً: أحمد" autocomplete="off">
  </div>
  <button class="btn" id="create">إنشاء غرفة جديدة</button>
  <div class="divider">أو ادخل غرفة موجودة</div>
  <div class="row">
    <input id="code" type="text" maxlength="6" placeholder="كود الغرفة" autocomplete="off" style="direction:ltr;text-align:center;letter-spacing:3px;text-transform:uppercase">
    <button class="btn ghost" id="join" style="width:auto;padding:0 22px">دخول</button>
  </div>
  <div id="homeErr" role="alert"></div>
</section>

<section id="room" class="hidden">
  <div class="top">
    <span class="code" id="roomCode"></span>
    <button class="small" id="copy">نسخ الرابط</button>
    <span class="who" id="role"></span>
    <button class="small leave" id="leave">خروج</button>
  </div>
  <div class="notice hidden" id="hostNote">أنت صاحب الغرفة: لو خرجت هتتحذف الغرفة للكل.</div>
  <div id="people"></div>
  <div id="log" aria-live="polite"></div>
  <div class="bar">
    <button class="mic" id="mic" title="تشغيل المايك" aria-label="تشغيل المايك">🎤</button>
    <input id="text" type="text" placeholder="اكتب رسالة" autocomplete="off" maxlength="1000">
    <button class="send" id="send">إرسال</button>
  </div>
</section>

<script>
(function(){
  var $ = function(id){ return document.getElementById(id); };
  var ws, myId, isHost = false, roomCode = '', names = {};
  var peers = {};          // id -> { pc, audio, q:[] }
  var localTrack = null;   // مسار المايك
  var ICE = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

  // ---------- أدوات ----------
  function show(which){
    $('home').classList.toggle('hidden', which !== 'home');
    $('room').classList.toggle('hidden', which !== 'room');
  }
  function homeErr(t){ $('homeErr').textContent = t || ''; }
  function sys(t){
    var d = document.createElement('div'); d.className = 'sys'; d.textContent = t;
    $('log').appendChild(d); scroll();
  }
  function scroll(){ var l = $('log'); l.scrollTop = l.scrollHeight; }
  function addMsg(name, text, me){
    var d = document.createElement('div'); d.className = 'msg' + (me ? ' me' : '');
    var n = document.createElement('div'); n.className = 'n'; n.textContent = name;
    var t = document.createElement('div'); t.textContent = text;
    d.appendChild(n); d.appendChild(t); $('log').appendChild(d); scroll();
  }
  function renderPeople(){
    var box = $('people'); box.innerHTML = '';
    Object.keys(names).forEach(function(id){
      var c = document.createElement('span'); c.className = 'chip';
      c.textContent = names[id] + (id === myId ? ' (أنت)' : '');
      box.appendChild(c);
    });
  }
  function send(o){ if (ws && ws.readyState === 1) ws.send(JSON.stringify(o)); }

  // ---------- الاتصال ----------
  function connect(first){
    var name = $('name').value.trim() || 'مجهول';
    homeErr('');
    ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host);
    ws.onopen = function(){ send(first); };
    ws.onerror = function(){ homeErr('مش قادر أتصل بالسيرفر.'); };
    ws.onclose = function(){ if (!$('room').classList.contains('hidden')) endRoom('انقطع الاتصال بالسيرفر.'); };
    ws.onmessage = function(e){ handle(JSON.parse(e.data)); };
    first.name = name;
  }

  function handle(m){
    if (m.t === 'error'){ homeErr(m.msg); if (ws) ws.close(); return; }

    if (m.t === 'joined'){
      myId = m.id; isHost = m.host; roomCode = m.code; names = {};
      names[myId] = $('name').value.trim() || 'مجهول';
      m.peers.forEach(function(p){ names[p.id] = p.name; });
      $('roomCode').textContent = roomCode;
      $('role').textContent = isHost ? 'صاحب الغرفة' : 'مشارك';
      $('hostNote').classList.toggle('hidden', !isHost);
      $('log').innerHTML = '';
      sys(isHost ? 'الغرفة جاهزة. ابعت الكود أو الرابط لصحابك.' : 'دخلت الغرفة.');
      history.replaceState(null, '', '#' + roomCode);
      renderPeople(); show('room');
      // أنا الجديد: أبدأ اتصال الصوت مع كل اللي موجودين
      m.peers.forEach(function(p){ callPeer(p.id); });
    }
    else if (m.t === 'peer_join'){
      names[m.id] = m.name; renderPeople(); sys(m.name + ' دخل الغرفة');
    }
    else if (m.t === 'peer_leave'){
      sys((names[m.id] || 'حد') + ' خرج'); delete names[m.id]; closePeer(m.id); renderPeople();
    }
    else if (m.t === 'chat'){
      addMsg(m.name, m.text, m.from === myId);
    }
    else if (m.t === 'signal'){
      onSignal(m.from, m.data);
    }
    else if (m.t === 'closed'){
      endRoom('صاحب الغرفة خرج، فالغرفة اتحذفت.');
    }
  }

  // ---------- الصوت (WebRTC) ----------
  function makePC(id, initiator){
    var pc = new RTCPeerConnection(ICE);
    var audio = new Audio(); audio.autoplay = true;
    peers[id] = { pc: pc, audio: audio, q: [] };
    pc.onicecandidate = function(e){ if (e.candidate) send({ t: 'signal', to: id, data: { ice: e.candidate } }); };
    pc.ontrack = function(e){
      audio.srcObject = (e.streams && e.streams[0]) || new MediaStream([e.track]);
      audio.play().catch(function(){});
    };
    if (initiator){
      var tr = pc.addTransceiver('audio', { direction: 'sendrecv' });
      if (localTrack) tr.sender.replaceTrack(localTrack);
    }
    return pc;
  }
  function callPeer(id){
    var pc = makePC(id, true);
    pc.createOffer().then(function(o){ return pc.setLocalDescription(o); })
      .then(function(){ send({ t: 'signal', to: id, data: { sdp: pc.localDescription } }); })
      .catch(console.error);
  }
  function onSignal(from, d){
    var p = peers[from];
    if (d.sdp){
      if (d.sdp.type === 'offer'){
        if (p) closePeer(from);
        var pc = makePC(from, false); p = peers[from];
        pc.setRemoteDescription(d.sdp).then(function(){
          pc.getTransceivers().forEach(function(t){
            t.direction = 'sendrecv';
            if (localTrack) t.sender.replaceTrack(localTrack);
          });
          flush(p);
          return pc.createAnswer();
        }).then(function(a){ return pc.setLocalDescription(a); })
          .then(function(){ send({ t: 'signal', to: from, data: { sdp: pc.localDescription } }); })
          .catch(console.error);
      } else if (p){
        p.pc.setRemoteDescription(d.sdp).then(function(){ flush(p); }).catch(console.error);
      }
    } else if (d.ice && p){
      if (p.pc.remoteDescription) p.pc.addIceCandidate(d.ice).catch(function(){});
      else p.q.push(d.ice);
    }
  }
  function flush(p){ p.q.splice(0).forEach(function(c){ p.pc.addIceCandidate(c).catch(function(){}); }); }
  function closePeer(id){
    var p = peers[id]; if (!p) return;
    try { p.pc.close(); } catch(e){}
    p.audio.srcObject = null; delete peers[id];
  }

  // ---------- زر المايك ----------
  $('mic').onclick = function(){
    var btn = $('mic');
    if (!localTrack){
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){
        sys('المايك محتاج رابط HTTPS (أو localhost). جرّب تفتح الموقع من رابط آمن.'); return;
      }
      navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
        .then(function(stream){
          localTrack = stream.getAudioTracks()[0];
          Object.keys(peers).forEach(function(id){
            peers[id].pc.getTransceivers().forEach(function(t){
              t.direction = 'sendrecv'; t.sender.replaceTrack(localTrack);
            });
          });
          btn.classList.add('on'); btn.title = 'كتم المايك'; sys('المايك شغال.');
        })
        .catch(function(){ sys('مقدرتش أشغّل المايك. تأكد إنك سمحت بالإذن.'); });
    } else {
      localTrack.enabled = !localTrack.enabled;
      btn.classList.toggle('on', localTrack.enabled);
      btn.classList.toggle('muted', !localTrack.enabled);
      btn.textContent = localTrack.enabled ? '🎤' : '🔇';
      sys(localTrack.enabled ? 'المايك شغال.' : 'المايك مكتوم.');
    }
  };

  // ---------- الخروج وتنظيف ----------
  function cleanup(){
    Object.keys(peers).forEach(closePeer);
    if (localTrack){ localTrack.stop(); localTrack = null; }
    var b = $('mic'); b.classList.remove('on', 'muted'); b.textContent = '🎤';
    names = {}; myId = null;
    history.replaceState(null, '', location.pathname);
  }
  function endRoom(msg){
    cleanup(); if (ws){ ws.onclose = null; try { ws.close(); } catch(e){} }
    show('home'); homeErr(msg || '');
  }

  // ---------- الأزرار ----------
  $('create').onclick = function(){ connect({ t: 'create' }); };
  $('join').onclick = function(){
    var c = $('code').value.trim().toUpperCase();
    if (!c){ homeErr('اكتب كود الغرفة.'); return; }
    connect({ t: 'join', code: c });
  };
  $('code').addEventListener('keydown', function(e){ if (e.key === 'Enter') $('join').click(); });
  $('leave').onclick = function(){
    if (isHost && !confirm('لو خرجت هتتحذف الغرفة للكل. متأكد؟')) return;
    send({ t: 'leave' }); endRoom('');
  };
  function sendText(){
    var v = $('text').value.trim(); if (!v) return;
    send({ t: 'chat', text: v }); $('text').value = '';
  }
  $('send').onclick = sendText;
  $('text').addEventListener('keydown', function(e){ if (e.key === 'Enter') sendText(); });
  $('copy').onclick = function(){
    var link = location.origin + '/#' + roomCode;
    (navigator.clipboard ? navigator.clipboard.writeText(link) : Promise.reject())
      .then(function(){ sys('اتنسخ الرابط.'); })
      .catch(function(){ prompt('انسخ الرابط:', link); });
  };

  // لو فتح رابط فيه كود الغرفة
  if (location.hash.length > 1) $('code').value = location.hash.slice(1).toUpperCase();
  window.addEventListener('beforeunload', function(){ send({ t: 'leave' }); });
})();
</script>
</body>
</html>`;

// ------------------------- السيرفر -------------------------
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(HTML);
});

const wss = new WebSocketServer({ server });
const rooms = new Map(); // code -> { code, host, clients: Map(id -> ws) }
let nextId = 1;

const clean = (s) => String(s || 'مجهول').replace(/[<>]/g, '').trim().slice(0, 20) || 'مجهول';
const send = (ws, obj) => { if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj)); };
const broadcast = (room, obj, exceptId) => {
  for (const [id, c] of room.clients) if (id !== exceptId) send(c, obj);
};
function genCode() {
  let c;
  do { c = Math.random().toString(36).slice(2, 8).toUpperCase(); } while (rooms.has(c));
  return c;
}

// خروج من الغرفة: لو صاحب الغرفة اللي خرج، الغرفة كلها بتتحذف
function leave(ws) {
  const room = rooms.get(ws.room);
  ws.room = null;
  if (!room) return;
  room.clients.delete(ws.id);
  if (room.host === ws.id) {
    for (const c of room.clients.values()) { send(c, { t: 'closed' }); c.room = null; }
    room.clients.clear();
    rooms.delete(room.code);
  } else if (room.clients.size === 0) {
    rooms.delete(room.code);
  } else {
    broadcast(room, { t: 'peer_leave', id: ws.id });
  }
}

wss.on('connection', (ws) => {
  ws.id = 'u' + nextId++;
  ws.room = null;
  ws.alive = true;
  ws.on('pong', () => { ws.alive = true; });

  ws.on('message', (raw) => {
    let m;
    try { m = JSON.parse(raw); } catch { return; }

    if (m.t === 'create') {
      leave(ws);
      const code = genCode();
      const room = { code, host: ws.id, clients: new Map([[ws.id, ws]]) };
      rooms.set(code, room);
      ws.name = clean(m.name); ws.room = code;
      send(ws, { t: 'joined', code, id: ws.id, host: true, peers: [] });
    }
    else if (m.t === 'join') {
      const code = String(m.code || '').toUpperCase().trim();
      const room = rooms.get(code);
      if (!room) return send(ws, { t: 'error', msg: 'الغرفة مش موجودة أو اتحذفت.' });
      if (room.clients.size >= MAX_PER_ROOM) return send(ws, { t: 'error', msg: 'الغرفة مليانة.' });
      leave(ws);
      ws.name = clean(m.name); ws.room = code;
      const peers = [...room.clients.values()].map((c) => ({ id: c.id, name: c.name }));
      room.clients.set(ws.id, ws);
      send(ws, { t: 'joined', code, id: ws.id, host: false, peers });
      broadcast(room, { t: 'peer_join', id: ws.id, name: ws.name }, ws.id);
    }
    else if (m.t === 'chat') {
      const room = rooms.get(ws.room);
      const text = String(m.text || '').slice(0, 1000);
      if (room && text) broadcast(room, { t: 'chat', from: ws.id, name: ws.name, text });
    }
    else if (m.t === 'signal') {
      const room = rooms.get(ws.room);
      const target = room && room.clients.get(m.to);
      if (target) send(target, { t: 'signal', from: ws.id, data: m.data });
    }
    else if (m.t === 'leave') {
      leave(ws);
    }
  });

  ws.on('close', () => leave(ws));
});

// تنظيف الاتصالات الميتة
setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.alive) { ws.terminate(); continue; }
    ws.alive = false; ws.ping();
  }
}, 30000);

server.listen(PORT, () => console.log('شغال على http://localhost:' + PORT));
