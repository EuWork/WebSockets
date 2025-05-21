import express from 'express';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import cors from "cors";
import webpush from 'web-push';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors());
app.use(express.json());

const VAPID_PUBLIC_KEY = 'BPsT2RYXT79mEf0dhC0535qhQpFisX6lUObIBKSzgblNk9Wl5mkflwZWDgmCLAmjZxWC9e1CE54G5ttt_ibF4zA';
const VAPID_PRIVATE_KEY = 'wGwceVn0bZRKraoZJ27uKNuQa1iNEOHBHLQM3jP_SCI';

webpush.setVapidDetails(
  'mailto:endubkoldyn@gmail.com',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

const rooms = new Map();

const roomSubscriptions = new Map();

app.get('/api/rooms', (req, res) => {
  const roomsInfo = Array.from(rooms.keys()).map(roomName => ({
    name: roomName,
    usersCount: rooms.get(roomName).size
  }));
  res.json(roomsInfo);
});

app.post('/api/subscribe', (req, res) => {
  const { subscription, room } = req.body;

  if (!roomSubscriptions.has(room)) {
    roomSubscriptions.set(room, new Set());
  }

  roomSubscriptions.get(room).add(subscription);
  res.status(200).json({ success: true });
});

app.post('/api/unsubscribe', (req, res) => {
  const { subscription, room } = req.body;

  if (roomSubscriptions.has(room)) {
    const subs = roomSubscriptions.get(room);
    subs.forEach((sub) => {
      if (sub.endpoint === subscription.endpoint) {
        subs.delete(sub);
      }
    });
  }
  res.status(200).json({ success: true });
});

const globalChat = new Set();

wss.on('connection', (ws) => {
  console.log('Новое подключение');

  let currentRoom = null;
  let username = null;

  globalChat.add(ws);

  ws.send(JSON.stringify({
    type: 'rooms_update',
    rooms: Array.from(rooms.keys()).map(roomName => ({
      name: roomName,
      usersCount: rooms.get(roomName).size
    }))
  }));

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());

      switch (data.type) {
        case 'join':
          handleJoin(ws, data.room, data.username);
          break;
        case 'message':
          handleMessage(data.room, data.message, username);
          break;
        case 'leave':
          handleLeave(ws, data.room, username);
          break;
      }
    } catch (error) {
      console.error('Ошибка обработки сообщения:', error);
    }
  });

  ws.on('close', () => {
    globalChat.delete(ws);
  });

  function handleJoin(ws, roomName, newUsername) {
    if (currentRoom) {
      handleLeave(ws, currentRoom, username);
    }

    let isNewRoom = false;

    if (!rooms.has(roomName)) {
      rooms.set(roomName, new Set());
      isNewRoom = true;
    }

    const room = rooms.get(roomName);
    room.add(ws);
    currentRoom = roomName;
    username = newUsername;

    if (!isNewRoom && room.size > 1) {
      broadcastToRoom(roomName, {
        type: 'notification',
        message: `${username} присоединился к комнате`
      }, ws);
    }

    if (!isNewRoom && room.size > 1) {
      const currentUserSubscription = Array.from(roomSubscriptions.get(roomName) || []).find(
        sub => sub.keys.auth === ws.subscription?.keys.auth
      );

      sendPushNotifications(
        roomName,
        `${newUsername} присоединился к комнате`,
        currentUserSubscription?.endpoint
      );
    }
  }

  function handleMessage(roomName, message, sender) {
    if (rooms.has(roomName)) {
      broadcastToRoom(roomName, {
        type: 'message',
        sender: sender,
        message: message,
        timestamp: new Date().toISOString()
      });
    }
  }

  function handleLeave(ws, roomName, leaver) {
    if (rooms.has(roomName)) {
      const room = rooms.get(roomName);
      room.delete(ws);

      if (room.size === 0) {
        rooms.delete(roomName);
      } else {
        broadcastToRoom(roomName, {
          type: 'notification',
          message: `${leaver} покинул комнату`
        });
      }

      if (room.size > 0) {
        const targetSubscription = Array.from(roomSubscriptions.get(roomName) || []).find(
          sub => sub.endpoint === ws.subscription?.endpoint
        );

        sendPushNotifications(
          roomName,
          `${leaver} покинул комнату`,
          targetSubscription?.endpoint
        );
      }

      console.log(`${leaver} покинул комнату ${roomName}`);
    }
  }

  function broadcastToRoom(roomName, data, excludeWs = null) {
    if (rooms.has(roomName)) {
      const room = rooms.get(roomName);
      room.forEach(client => {
        if (client !== excludeWs && client.readyState === client.OPEN) {
          client.send(JSON.stringify(data));
        }
      });
    }
  }
});

function sendPushNotifications(roomName, message, excludeEndpoint) {
  const subscriptions = roomSubscriptions.get(roomName) || [];

  subscriptions.forEach((sub) => {
    if (sub.endpoint && sub.endpoint !== excludeEndpoint) {
      webpush.sendNotification(sub, JSON.stringify({
        title: 'Новое событие',
        message,
      })).catch(err => {
        console.error('Ошибка отправки уведомления:', err);
        if (err.statusCode === 410) {
          subscriptions.delete(sub);
        }
      });
    }
  });
}


const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});
