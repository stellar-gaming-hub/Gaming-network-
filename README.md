# Stellar Gaming Hub: Gaming Network Protocol

![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
![Drips Ready](https://img.shields.io/badge/Drips-Protocol-blue)
![Build Status](https://img.shields.io/badge/Build-Passing-brightgreen)

## Overview
`Gaming-network-` powers the backend smart contracts, RPC relay nodes, custom game session channels, and state sync mechanisms for the Stellar Gaming Hub ecosystem.

## Core Features
- **Session State Synchronization:** Manages off-chain and on-chain state transitions for player sessions.
- **Drips Stream Routing:** Direct integration with Drips Protocol contracts for real-time developer and gamer reward distribution.
- **Multi-Chain RPC Relay:** High-throughput event listener for EVM network logs.

## Setup & Local Development
```bash
# Clone the repository
git clone [https://github.com/stellar-gaming-hub/Gaming-network-.git](https://github.com/stellar-gaming-hub/Gaming-network-.git)

# Install dependencies
npm install
```

## Signed Game Webhooks
Configure `GAME_WEBHOOK_SECRET` with a shared secret for trusted game instances. Sign the exact request body bytes using HMAC-SHA256 and send the hex digest in the `x-game-signature` header as `sha256=<digest>`.

Mount `createGameWebhookRouter` from `src/game-webhook.js` at the game webhook path and provide the session-state updater. The router reads `x-game-signature`, verifies the raw body, and only then parses JSON or calls the updater. Mount it before any global `express.json()` middleware, and keep the raw body intact; parsing and re-serializing it changes the bytes and invalidates the signature.

Run the test suite with `npm test`.
