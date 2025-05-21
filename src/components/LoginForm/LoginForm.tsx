import { FC, useState } from 'react';

import '/src/App.css';

interface ILoginFormProps {
  onJoin: (username: string, room: string) => void;
}

export const LoginForm: FC<ILoginFormProps> = ({ onJoin }) => {
  const [username, setUsername] = useState('');
  const [room, setRoom] = useState('');

  const handleSubmit = (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (username.trim() && room.trim()) {
      onJoin(username.trim(), room.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="login-form">
      <h2>Присоединиться к чату</h2>
      <div>
        <label>Ваше имя:</label>
        <input
          type="text"
          value={username}
          onChange={e => setUsername(e.target.value)}
          required
        />
      </div>
      <div>
        <label>Название комнаты:</label>
        <input
          type="text"
          value={room}
          onChange={e => setRoom(e.target.value)}
          required
        />
      </div>
      <button type="submit">Присоединиться</button>
    </form>
  );
};
