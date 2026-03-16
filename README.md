# Real-Time Chat App

Telegram-like chat UI built with `React`, `Redux Toolkit`, `RTK Query`, and `Socket.IO client`.

## Stack

- `React.js`
- `Redux Toolkit`
- `RTK Query`
- `Socket.IO Client`
- `Vite`

## Features

- Real-time message updates without page refresh
- Typing indicator (`yozmoqda...`)
- RTK Query REST fetching for chats, conversation details, and messages
- Socket room join on app start and active conversation switch
- Redux state for connection status, unread counts, and typing users
- Telegram-style chat layout with sidebar + main message panel

## Project Structure

- `src/store/api.js`: RTK Query endpoints for auth, chats, conversations, and messages
- `src/store/realtimeSlice.js`: Redux realtime state (`isConnected`, `typingByConversation`, unread counts)
- `src/store/realtimeMiddleware.js`: socket event binding, room join, message merge, typing handling
- `src/elements/socket.js`: Socket.IO client setup
- `src/store/StoreProvider.jsx`: connects realtime flow on app start
- `src/elements/MainPages.jsx`: Telegram-like chat UI and message composer

## How Realtime Works

1. App starts and `StoreProvider` dispatches `realtimeInit`
2. `realtimeMiddleware` connects the socket and binds listeners
3. Chat lists are fetched via RTK Query
4. Middleware joins all known conversation rooms
5. Server emits `new_message` / `message:new` / `receive_message`
6. Middleware merges socket payload into RTK Query caches with `api.util.updateQueryData`
7. UI updates automatically without refresh

## RTK Query + Socket Merge

- Initial messages come from REST: `useGetMessagesQuery(conversationId)`
- New messages come from socket listeners in `realtimeMiddleware`
- Incoming socket payloads are merged into the RTK Query cache
- This gives fast initial load + live updates together

## Environment Variables

Create `.env` from `.env.example`:

```env
VITE_API_URL=https://your-backend-domain.com/api
VITE_SOCKET_URL=https://your-backend-domain.com
```

## Run Locally

```bash
npm install
cp .env.example .env
npm run dev
```

## Build

```bash
npm run build
```

## Required Backend Events

Frontend listens for these socket events:

- `message:new`
- `new_message`
- `receive_message`
- `typing_start`
- `typing_stop`
- `typing:start`
- `typing:stop`
- `user_typing`
- `user_stop_typing`
- `message:read`
- `conversation:read`
- `message:updated`
- `message_edited`
- `message:deleted`
- `message_deleted`

## Requirement Mapping

- `Use React.js`: implemented in `src/`
- `Use Redux Toolkit`: implemented in `src/store/store.js`
- `Use RTK Query`: implemented in `src/store/api.js`
- `Use Socket.IO client`: implemented in `src/elements/socket.js`
- `new_message updates UI`: implemented in `src/store/realtimeMiddleware.js`
- `Store messages in Redux store`: RTK Query cache + realtime slice updates
- `Connect socket on app start`: implemented in `src/store/StoreProvider.jsx`
- `Telegram-like UI`: implemented in `src/elements/MainPages.jsx`
- `useEffect socket lifecycle`: app/provider and chat UI use `useEffect`
- `Merge RTK Query with socket`: implemented via `api.util.updateQueryData`
