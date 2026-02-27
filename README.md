# Alcove Cafe Website + LAN Chess

A modern website for **Alcove Cafe** with primary information tabs and a separate **2-player LAN chess** page.

## Website structure

- Homepage tabs: **Menu**, **Book Now**, **About Us**, **Contact Us**
- Dedicated LAN chess page at `/chess.html`

## Chess features

- Two-player room play (White vs Black)
- Spectator fallback when both colors are taken
- Full rules validation (legal moves, check/checkmate/stalemate, castling, en passant, promotion)
- Reset game support

## Run locally

```bash
npm start
```

Then open:

- `http://localhost:3000/` for the cafe website tabs
- `http://localhost:3000/chess.html` for LAN chess

## Stack

- Node.js built-in HTTP server
- Vanilla HTML/CSS/JS