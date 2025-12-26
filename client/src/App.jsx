import { useState, useEffect } from 'react';
import { SocketProvider, useSocket } from './context/SocketContext';
import { Lobby } from './screens/Lobby';
import { Game } from './screens/Game';

function AppContent() {
  const [room, setRoom] = useState(null);
  const [playerName, setPlayerName] = useState('');
  const socket = useSocket();

  useEffect(() => {
    if (!socket) return;

    socket.on('room_update', (updatedRoom) => {
      // Only update if we are already in this room?
      // Or if 'room' state is null (from Lobby)? 
      // Actually room_update is broadcast to room members.
      setRoom(updatedRoom);
    });

    return () => {
      socket.off('room_update');
    }
  }, [socket]);

  if (room) {
    return <Game room={room} playerName={playerName} />;
  }

  return <Lobby onJoin={(roomData, name) => {
    setRoom(roomData);
    setPlayerName(name);
  }} />;
}

function App() {
  return (
    <SocketProvider>
      <AppContent />
    </SocketProvider>
  );
}

export default App;
