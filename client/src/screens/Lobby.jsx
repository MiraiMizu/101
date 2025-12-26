import { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';

export const Lobby = ({ onJoin }) => {
    const socket = useSocket();
    const [name, setName] = useState('');
    const [roomCode, setRoomCode] = useState('');
    const [error, setError] = useState('');

    const createRoom = () => {
        if (!name) return setError('Please enter your name');
        socket.emit('create_room', { playerName: name }, (response) => {
            if (response.success) {
                onJoin(response.room, name);
            } else {
                setError(response.error);
            }
        });
    };

    const joinRoom = () => {
        if (!name) return setError('Please enter your name');
        if (!roomCode) return setError('Please enter a room code');

        socket.emit('join_room', { roomId: roomCode, playerName: name }, (response) => {
            if (response.success) {
                onJoin(response.room, name);
            } else {
                setError(response.error);
            }
        });
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white p-4">
            <div className="bg-slate-800 p-8 rounded-xl shadow-2xl w-full max-w-md border border-slate-700">
                <h1 className="text-4xl font-bold text-center mb-8 text-blue-500">101 Okey Online</h1>

                {error && (
                    <div className="bg-red-500/20 border border-red-500 text-red-100 p-3 rounded mb-4 text-sm text-center">
                        {error}
                    </div>
                )}

                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Your Name</label>
                        <input
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors text-lg"
                            placeholder="Ex: Ahmet"
                        />
                    </div>

                    <div className="pt-4 border-t border-slate-700">
                        <button
                            onClick={createRoom}
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded transition-colors mb-4"
                        >
                            Create New Table
                        </button>

                        <div className="relative flex items-center justify-center mb-4">
                            <div className="border-t border-slate-600 w-full"></div>
                            <span className="bg-slate-800 px-3 text-slate-500 text-sm absolute">OR JOIN</span>
                        </div>

                        <div className="flex gap-2">
                            <input
                                value={roomCode}
                                onChange={e => setRoomCode(e.target.value)}
                                className="flex-1 bg-slate-900 border border-slate-700 rounded px-4 py-3 focus:outline-none focus:border-blue-500 uppercase tracking-widest text-center"
                                placeholder="CODE"
                                maxLength={6}
                            />
                            <button
                                onClick={joinRoom}
                                className="bg-green-600 hover:bg-green-500 text-white font-bold px-6 rounded transition-colors"
                            >
                                Join
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
