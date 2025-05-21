import { FC, useState } from 'react';

import { ChatRoom } from '@/components/ChatRoom/ChatRoom.tsx';
import { LoginForm } from '@/components/LoginForm/LoginForm.tsx';
import { RoomsMonitor } from '@/components/RoomMonitor/RoomMonitor.tsx';

import '/src/App.css';

export const App: FC = () => {
  const [joined, setJoined] = useState(false);
  const [username, setUsername] = useState('');
  const [room, setRoom] = useState('');

  const handleJoin = (username: string, room: string) => {
    setUsername(username);
    setRoom(room);
    setJoined(true);
  };

  const handleLeave = () => {
    setJoined(false);
    setUsername('');
    setRoom('');
  };

  return (
    <div className="app">
      {!joined ? (
        <>
          <LoginForm onJoin={handleJoin} />
          <RoomsMonitor />
        </>
      ) : (
        <ChatRoom room={room} username={username} onLeave={handleLeave} />
      )}
    </div>
  );
};
