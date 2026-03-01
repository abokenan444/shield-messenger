/**
 * Shield Messenger WebSocket Relay Server
 *
 * A zero-knowledge message relay — routes E2E encrypted messages between users.
 * The relay never sees plaintext. It only knows which public key IDs are online
 * and forwards opaque ciphertext between them.
 *
 * Protocol:
 *   Client → Relay:
 *     { type: "register", userId: "sl_...", publicKey: "base64..." }
 *     { type: "message", conversationId: "...", messageId: "...", senderId: "...", recipientId: "...", ciphertext: "...", timestamp: ... }
 *     { type: "friend-request", toUserId: "...", fromName: "...", requestId: "..." }
 *
 *   Relay → Client:
 *     { type: "registered", onlineUsers: number }
 *     { type: "message", conversationId, messageId, senderId, ciphertext, timestamp }
 *     { type: "friend-request", requestId, senderName }
 *     { type: "user-online", userId }
 *     { type: "user-offline", userId }
 */

'use strict';

const { WebSocketServer } = require('ws');

const PORT = parseInt(process.env.RELAY_PORT || '8089', 10);

// Connected clients: userId → { ws, publicKey }
const clients = new Map();

const wss = new WebSocketServer({ port: PORT });

console.log(`[Relay] Shield Messenger relay listening on port ${PORT}`);

wss.on('connection', (ws) => {
  let userId = null;

  ws.on('message', (raw) => {
    let data;
    try {
      data = JSON.parse(raw.toString());
    } catch {
      return;
    }

    if (!data || typeof data.type !== 'string') return;

    switch (data.type) {
      case 'register': {
        if (typeof data.userId !== 'string' || typeof data.publicKey !== 'string') return;
        userId = data.userId;
        clients.set(userId, { ws, publicKey: data.publicKey });
        console.log(`[Relay] User registered: ${userId} (${clients.size} online)`);

        // Acknowledge registration
        ws.send(JSON.stringify({
          type: 'registered',
          onlineUsers: clients.size,
        }));

        // Notify other users
        for (const [id, client] of clients) {
          if (id !== userId && client.ws.readyState === 1) {
            client.ws.send(JSON.stringify({ type: 'user-online', userId }));
          }
        }
        break;
      }

      case 'message': {
        if (!userId) return;
        const { conversationId, messageId, recipientId, ciphertext, timestamp } = data;
        if (!conversationId || !ciphertext) return;

        // If recipientId is specified, send to that user only
        if (recipientId && clients.has(recipientId)) {
          const recipient = clients.get(recipientId);
          if (recipient.ws.readyState === 1) {
            recipient.ws.send(JSON.stringify({
              type: 'message',
              conversationId,
              messageId,
              senderId: userId,
              ciphertext,
              timestamp: timestamp || Date.now(),
            }));
          }
        } else {
          // Broadcast to all participants of this conversation (except sender)
          for (const [id, client] of clients) {
            if (id !== userId && client.ws.readyState === 1) {
              client.ws.send(JSON.stringify({
                type: 'message',
                conversationId,
                messageId,
                senderId: userId,
                ciphertext,
                timestamp: timestamp || Date.now(),
              }));
            }
          }
        }
        break;
      }

      case 'friend-request': {
        if (!userId) return;
        const { toUserId, fromName, requestId } = data;
        if (!toUserId || !requestId) return;

        const target = clients.get(toUserId);
        if (target && target.ws.readyState === 1) {
          target.ws.send(JSON.stringify({
            type: 'friend-request',
            requestId,
            senderName: fromName || userId,
            senderId: userId,
          }));
        }
        break;
      }
    }
  });

  ws.on('close', () => {
    if (userId) {
      clients.delete(userId);
      console.log(`[Relay] User disconnected: ${userId} (${clients.size} online)`);

      // Notify others
      for (const [, client] of clients) {
        if (client.ws.readyState === 1) {
          client.ws.send(JSON.stringify({ type: 'user-offline', userId }));
        }
      }
    }
  });

  ws.on('error', () => {
    if (userId) clients.delete(userId);
  });
});
