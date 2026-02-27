const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const { ChessEngine } = require('./public/chess-engine.js');

const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.json': 'application/json' };
const rooms = new Map();

function getRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, { engine: new ChessEngine(), players: { w: null, b: null }, version: 1 });
  }
  return rooms.get(roomId);
}

function roomState(room, roomId) {
  return {
    roomId,
    version: room.version,
    state: room.engine.state(),
    players: { white: Boolean(room.players.w), black: Boolean(room.players.b) }
  };
}

function json(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

function parseBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => data += c);
    req.on('end', () => {
      try { resolve(JSON.parse(data || '{}')); } catch { resolve({}); }
    });
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'POST' && url.pathname === '/api/join') {
    const body = await parseBody(req);
    const roomId = String(body.roomId || '').trim().toLowerCase();
    if (!roomId) return json(res, 400, { error: 'Room code required.' });
    const room = getRoom(roomId);
    const playerId = Math.random().toString(36).slice(2);
    let color = null;
    const asked = body.requestedColor;
    if (asked === 'w' && !room.players.w) color = 'w';
    else if (asked === 'b' && !room.players.b) color = 'b';
    else if (!room.players.w) color = 'w';
    else if (!room.players.b) color = 'b';
    if (color) room.players[color] = playerId;
    room.version += 1;
    return json(res, 200, { playerId, color, ...roomState(room, roomId) });
  }

  if (req.method === 'POST' && url.pathname === '/api/move') {
    const { roomId, playerId, from, to, promotion } = await parseBody(req);
    const room = rooms.get(String(roomId || '').toLowerCase());
    if (!room) return json(res, 404, { error: 'Room not found.' });
    const color = room.players.w === playerId ? 'w' : room.players.b === playerId ? 'b' : null;
    if (!color) return json(res, 403, { error: 'You are a spectator.' });
    if (room.engine.turn !== color) return json(res, 400, { error: 'Not your turn.' });
    const ok = room.engine.move({ from, to, promotion: promotion || 'q' });
    if (!ok) return json(res, 400, { error: 'Illegal move.' });
    room.version += 1;
    return json(res, 200, roomState(room, roomId));
  }

  if (req.method === 'POST' && url.pathname === '/api/reset') {
    const { roomId } = await parseBody(req);
    const room = rooms.get(String(roomId || '').toLowerCase());
    if (!room) return json(res, 404, { error: 'Room not found.' });
    room.engine.reset();
    room.version += 1;
    return json(res, 200, roomState(room, roomId));
  }

  if (req.method === 'GET' && url.pathname === '/api/state') {
    const roomId = String(url.searchParams.get('roomId') || '').trim().toLowerCase();
    const room = rooms.get(roomId);
    if (!room) return json(res, 404, { error: 'Room not found.' });
    return json(res, 200, roomState(room, roomId));
  }

  let target = path.join(__dirname, 'public', url.pathname === '/' ? 'index.html' : url.pathname);
  if (!target.startsWith(path.join(__dirname, 'public'))) {
    res.writeHead(403); res.end('Forbidden'); return;
  }
  fs.readFile(target, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(target)] || 'application/octet-stream' });
    res.end(data);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Running on http://localhost:${PORT}`));
