import React, { FC, useEffect, useRef, useState } from 'react';

import '/src/App.css';

interface IMessage {
  type: 'notification' | 'message';
  message: string;
  sender?: string;
  timestamp?: string;
}

interface IChatRoomProps {
  room: string;
  username: string;
  onLeave: () => void;
}

export const ChatRoom: FC<IChatRoomProps> = ({ room, username, onLeave }) => {
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [message, setMessage] = useState('');
  const ws = useRef<WebSocket | null>();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const VAPID_PUBLIC_KEY =
    'BPsT2RYXT79mEf0dhC0535qhQpFisX6lUObIBKSzgblNk9Wl5mkflwZWDgmCLAmjZxWC9e1CE54G5ttt_ibF4zA';

  useEffect(() => {
    ws.current = new WebSocket(`ws://${window.location.hostname}:3000`);

    ws.current.onopen = () => {
      if (ws.current?.readyState === WebSocket.OPEN) {
        ws.current.send(
          JSON.stringify({
            type: 'join',
            room,
            username,
          }),
        );
      }
    };

    ws.current.onmessage = (event: MessageEvent) => {
      const data = JSON.parse(event.data);

      if (data.type === 'message' || data.type === 'notification') {
        setMessages(prev => [...prev, data]);
      }
    };

    return () => {
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.send(
          JSON.stringify({
            type: 'leave',
            room,
            username,
          }),
        );
        ws.current.close();
      }
    };
  }, [room, username]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (
      message.trim() &&
      ws.current &&
      ws.current.readyState === WebSocket.OPEN
    ) {
      ws.current.send(
        JSON.stringify({
          type: 'message',
          room,
          message: message.trim(),
        }),
      );
      setMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  const registerServiceWorker = async () => {
    try {
      if (!('serviceWorker' in navigator)) return;

      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('ServiceWorker registered');

      let subscription = await registration.pushManager.getSubscription();

      const permission = await Notification.requestPermission();
      setIsSubscribed(!!subscription);

      if (permission !== 'granted') return;

      if (permission === 'granted' && !subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });

        await fetch('http://localhost:3000/api/subscribe', {
          method: 'POST',
          // eslint-disable-next-line @typescript-eslint/naming-convention
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription, room }),
        });
        setIsSubscribed(true);
      }
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  };

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      registerServiceWorker();
    }
  }, [room]);

  function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  const toggleSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;

      if (isSubscribed) {
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await subscription.unsubscribe();
          await fetch('http://localhost:3000/api/unsubscribe', {
            method: 'POST',
            // eslint-disable-next-line @typescript-eslint/naming-convention
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ room, subscription }),
          });
        }
      } else {
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });

        await fetch('http://localhost:3000/api/subscribe', {
          method: 'POST',
          // eslint-disable-next-line @typescript-eslint/naming-convention
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ room, subscription }),
        });
      }

      setIsSubscribed(!isSubscribed);
    } catch (error) {
      console.error('Ошибка изменения подписки:', error);
      alert('Не удалось изменить статус подписки');
    }
  };

  return (
    <div className="chat-room">
      <div className="chat-header">
        <h2>Комната: {room}</h2>
        <p>Вы: {username}</p>
        <button
          onClick={toggleSubscription}
          className={isSubscribed ? 'subscribed' : 'unsubscribed'}
        >
          {isSubscribed ? 'Отписаться' : 'Подписаться'}
        </button>
        <button onClick={onLeave}>Покинуть комнату</button>
      </div>

      <div className="chat-messages">
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.type}`}>
            {msg.type === 'notification' ? (
              <p className="notification">{msg.message}</p>
            ) : (
              <>
                <span className="sender">{msg.sender}: </span>
                <span className="text">{msg.message}</span>
                {msg.timestamp && (
                  <span className="time">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </span>
                )}
              </>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input">
        <input
          type="text"
          value={message}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setMessage(e.target.value)
          }
          onKeyDown={handleKeyPress}
          placeholder="Введите сообщение..."
        />
        <button onClick={handleSendMessage}>Отправить</button>
      </div>
    </div>
  );
};
