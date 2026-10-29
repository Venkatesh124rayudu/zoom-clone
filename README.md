# Video Call — Real-Time Video Conferencing

A Zoom-style video meeting app built with React, Node.js, Socket.IO and WebRTC.

## Features

- **Peer-to-peer video and audio** with WebRTC (mesh: every participant connects directly to every other).
- **Socket.IO signalling server** that relays SDP offers/answers and ICE candidates, and tracks who is in each room.
- **Meeting rooms by code**: start a new meeting, join with a code, or share the invite link.
- **Screen sharing** — swaps the outgoing video track without renegotiating the call.
- **Camera and microphone toggles**.
- **In-meeting chat** with an unread badge; people who join late receive the earlier messages.
- **Accounts**: register and log in with bcrypt-hashed passwords and token-based sessions.
- **Meeting history** saved per user in MongoDB, with one-click rejoin.
- **Guest mode**: join a call without an account.

## Tech stack

React (Vite), React Router, Material-UI, Socket.IO client · Node.js, Express, Socket.IO, MongoDB (Mongoose), bcrypt

## How a call connects

1. A user opens `/<meeting-code>` and joins the room over Socket.IO (`join-call`).
2. The server tells everyone in the room who is present (`user-joined`).
3. The newcomer creates an `RTCPeerConnection` and an SDP **offer** for each existing participant.
4. Offers, **answers** and **ICE candidates** travel through the server (`signal`) until each pair of
   browsers finds a direct connection (using a public STUN server).
5. Media then flows peer-to-peer; the server only handles signalling and chat.

## Running locally

Requires Node.js 20+ and a MongoDB database (local or MongoDB Atlas).

```bash
# Backend
cd backend
cp .env.example .env     # then set MONGO_URL
npm install
npm run dev              # http://localhost:8000

# Frontend (new terminal)
cd frontend
npm install
npm run dev              # http://localhost:5173
```

To test a call on one computer, open the same meeting link in two browser windows.

## API

| Method | Route | Access |
|---|---|---|
| POST | `/api/v1/users/register` | Public |
| POST | `/api/v1/users/login` | Public — returns a session token |
| POST | `/api/v1/users/logout` | Token |
| GET | `/api/v1/users/get_all_activity` | Token — meeting history |
| POST | `/api/v1/users/add_to_activity` | Token — save a meeting code |

Socket.IO events: `join-call`, `user-joined`, `signal`, `chat-message`, `user-left`.

## Limitations

- Mesh topology: each participant uploads a stream to every other participant, so it suits small calls
  (roughly up to 4–6 people). Larger calls would need an SFU media server.
- Only a STUN server is configured; users behind strict corporate networks may need a TURN server.
