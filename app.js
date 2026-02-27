const localChess = new ChessEngine();

const pieces = {
  p: '♟', r: '♜', n: '♞', b: '♝', q: '♛', k: '♚',
  P: '♙', R: '♖', N: '♘', B: '♗', Q: '♕', K: '♔'
};

const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const boardEl = document.getElementById('board');
const roomIdEl = document.getElementById('roomId');
const colorChoiceEl = document.getElementById('colorChoice');
const joinBtn = document.getElementById('joinBtn');
const resetBtn = document.getElementById('resetBtn');
const statusEl = document.getElementById('status');
const turnEl = document.getElementById('turn');

let myColor = null;
let playerId = null;
let currentRoom = null;
let selectedSquare = null;
let currentTurn = 'w';
let pollTimer = null;

function squareToIdx(square) {
  return { r: 8 - Number(square[1]), f: square.charCodeAt(0) - 97 };
}

function idxToSquare(r, f) { return `${String.fromCharCode(97 + f)}${8 - r}`; }

function buildBoard() {
  boardEl.innerHTML = '';
  for (let rank = 8; rank >= 1; rank--) for (let fileIndex = 0; fileIndex < 8; fileIndex++) {
    const square = `${files[fileIndex]}${rank}`;
    const cell = document.createElement('button');
    cell.className = `square ${(rank + fileIndex) % 2 === 0 ? 'light' : 'dark'}`;
    cell.dataset.square = square;
    cell.addEventListener('click', () => handleSquareClick(square));
    boardEl.appendChild(cell);
  }
}

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.style.color = isError ? '#b3261e' : '#1f1a17';
}

function orientationSquares() {
  const base = [];
  for (let rank = 8; rank >= 1; rank--) for (let fileIndex = 0; fileIndex < 8; fileIndex++) base.push(`${files[fileIndex]}${rank}`);
  return myColor === 'b' ? base.reverse() : base;
}

function renderBoard() {
  const arrangement = orientationSquares();
  const cells = [...boardEl.querySelectorAll('.square')];
  cells.forEach((cell, idx) => {
    const square = arrangement[idx];
    cell.dataset.square = square;
    const { r, f } = squareToIdx(square);
    const piece = localChess.board[r][f];
    const symbol = piece ? pieces[piece.c === 'w' ? piece.t.toUpperCase() : piece.t] : '';
    cell.textContent = symbol;
    cell.classList.toggle('selected', selectedSquare === square);
    cell.classList.remove('target');
  });

  if (selectedSquare) {
    localChess.legalMovesFrom(selectedSquare).forEach((move) => {
      const sq = idxToSquare(move.r, move.f);
      const targetCell = cells.find((c) => c.dataset.square === sq);
      if (targetCell) targetCell.classList.add('target');
    });
  }
}

function myTurn() { return myColor && currentTurn === myColor; }

async function api(path, body) {
  const resp = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function applyState(payload) {
  localChess.board = payload.state.board;
  localChess.turn = payload.state.turn;
  currentTurn = payload.state.turn;
  selectedSquare = null;
  renderBoard();

  const s = payload.state;
  turnEl.textContent = s.checkmate
    ? `Checkmate! ${s.turn === 'w' ? 'Black' : 'White'} wins.`
    : s.stalemate
      ? 'Stalemate.'
      : `Turn: ${s.turn === 'w' ? 'White' : 'Black'}${s.inCheck ? ' (Check)' : ''}`;

  setStatus(myColor ? `Connected to ${payload.roomId} as ${myColor === 'w' ? 'White' : 'Black'}.` : `Watching ${payload.roomId} as spectator.`);
}

function handleSquareClick(square) {
  const { r, f } = squareToIdx(square);
  const piece = localChess.board[r][f];
  if (!myTurn()) return;

  if (!selectedSquare) {
    if (!piece || piece.c !== myColor) return;
    selectedSquare = square;
    renderBoard();
    return;
  }

  if (selectedSquare === square) {
    selectedSquare = null;
    renderBoard();
    return;
  }

  if (piece && piece.c === myColor) {
    selectedSquare = square;
    renderBoard();
    return;
  }

  const legal = localChess.legalMovesFrom(selectedSquare).some((m) => idxToSquare(m.r, m.f) === square);
  if (!legal) {
    setStatus('Illegal move.', true);
    return;
  }

  api('/api/move', { roomId: currentRoom, playerId, from: selectedSquare, to: square, promotion: 'q' })
    .then(applyState)
    .catch((e) => setStatus(e.message, true));
}

function startPolling() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(async () => {
    if (!currentRoom) return;
    try {
      const resp = await fetch(`/api/state?roomId=${encodeURIComponent(currentRoom)}`);
      if (!resp.ok) return;
      const payload = await resp.json();
      applyState(payload);
    } catch {
      // ignore temporary network failures
    }
  }, 1000);
}

joinBtn.addEventListener('click', async () => {
  const roomId = roomIdEl.value.trim();
  if (!roomId) return setStatus('Please enter a room code.', true);
  try {
    const payload = await api('/api/join', { roomId, requestedColor: colorChoiceEl.value || null });
    myColor = payload.color;
    playerId = payload.playerId;
    currentRoom = payload.roomId;
    applyState(payload);
    startPolling();
  } catch (e) {
    setStatus(e.message, true);
  }
});

resetBtn.addEventListener('click', async () => {
  if (!currentRoom) return;
  try {
    const payload = await api('/api/reset', { roomId: currentRoom });
    applyState(payload);
  } catch (e) {
    setStatus(e.message, true);
  }
});

buildBoard();
renderBoard();
