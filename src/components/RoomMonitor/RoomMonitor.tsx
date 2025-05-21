import { FC, useEffect, useState } from 'react';

interface IRoomInfo {
  name: string;
  usersCount: number;
}

export const RoomsMonitor: FC = () => {
  const [rooms, setRooms] = useState<IRoomInfo[]>([]);
  const [, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    const socket = new WebSocket(`ws://localhost:3000`);
    setWs(socket);

    socket.onmessage = event => {
      const data = JSON.parse(event.data);

      if (data.type === 'rooms_update') {
        setRooms(data.rooms);
      } else if (data.type === 'room_created') {
        setRooms(prev => [...prev, { name: data.room, usersCount: 0 }]);
      }
    };

    fetch('http://localhost:3000/api/rooms')
      .then(res => res.json())
      .then(data => setRooms(data));
  }, []);

  return (
    <div className="rooms-monitor">
      <h3>Активные комнаты ({rooms.length})</h3>
      <ul>
        {rooms.map(room => (
          <li key={room.name}>
            {room.name} - {room.usersCount} участников
          </li>
        ))}
      </ul>
    </div>
  );
};
