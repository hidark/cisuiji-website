# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This repository contains a Ping Pong game with both single-player and multiplayer modes, built with HTML5, CSS3, and JavaScript.

## Commands

### Development
```bash
# Install dependencies
npm install

# Start the game server (for multiplayer)
npm start
# or
node server.js

# Development mode with auto-restart
npm run dev

# Open the game in browser
start index.html
```

### Testing & Performance
- No automated tests currently configured
- Manual testing through browser gameplay
- Performance monitoring via browser DevTools

## Architecture

### Core Components

**Game Modes:**
- `game.js` - Single-player game logic with AI opponent
- `multiplayer.js` / `multiplayer-optimized.js` - WebSocket-based multiplayer client
- `server.js` - Node.js WebSocket server for multiplayer rooms

**Key Classes:**
- `Game` - Main game controller for single-player mode
- `MultiplayerGame` - Handles online multiplayer gameplay and networking
- `Paddle` - Player and AI paddle logic
- `Ball` - Ball physics and collision detection

### Multiplayer Architecture
- WebSocket connection for real-time communication
- Room-based matchmaking system
- State synchronization with interpolation
- Network optimization: batched updates (50ms intervals), position prediction, frame rate limiting (60 FPS)

### Performance Optimizations
- Double buffering with offscreen canvas
- Dirty rectangle marking for selective redraws
- Event throttling (16ms for mouse/touch events)
- Simplified ball trail rendering
- Integer coordinate transmission to reduce network payload

## Important Implementation Details

### Network Protocol
Messages exchanged via WebSocket:
- `joinGame` - Player joins a room
- `paddleMove` - Update paddle position
- `gameUpdate` - Server broadcasts game state
- `ping/pong` - Latency monitoring

### Game Constants
- Canvas: 800x450 (aspect ratio maintained on resize)
- Paddle: 12x100 pixels
- Ball: 8px radius
- Score limit: 11 points

### Browser Compatibility
- Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- Mobile support with touch controls
- Responsive design for various screen sizes