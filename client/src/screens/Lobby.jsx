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
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden font-sans select-none">
            {/* Background Image Layer */}
            <div
                className="absolute inset-0 z-0 bg-cover bg-center transition-all duration-1000 transform scale-105"
                style={{
                    backgroundImage: `url('https://images.unsplash.com/photo-1596726848263-82a88e9994c6?q=80&w=2832&auto=format&fit=crop')`, // Okey/Game generic photo as placeholder
                    filter: 'brightness(0.4) blur(4px)'
                }}
            />

            {/* Gradient Overlay */}
            <div className="absolute inset-0 z-0 bg-gradient-to-br from-slate-900/90 via-slate-900/80 to-slate-900/90" />

            {/* Content Card */}
            <div className="bg-slate-800/80 backdrop-blur-xl p-8 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] w-full max-w-md border border-white/10 relative z-10 transform hover:scale-[1.01] transition-transform">
                <div className="flex justify-center mb-6">
                    <div className="w-20 h-28 bg-[#e2c17c] rounded-lg border-2 border-[#8e6b2c] flex items-center justify-center shadow-lg transform -rotate-6">
                        <span className="text-4xl font-bold text-red-600">101</span>
                    </div>
                    <div className="w-20 h-28 bg-[#e2c17c] rounded-lg border-2 border-[#8e6b2c] flex items-center justify-center shadow-lg transform rotate-6 -ml-8 mt-4 bg-slate-100">
                        <span className="text-4xl font-bold text-black">★</span>
                    </div>
                </div>

                <h1 className="text-4xl font-bold text-center mb-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">101 Okey Online</h1>
                <p className="text-center text-slate-400 text-sm mb-8">Join the classic game with friends & bots</p>

                {error && (
                    <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-3 rounded-lg mb-6 text-sm text-center animate-shake">
                        {error}
                    </div>
                )}

                <div className="space-y-6">
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Nickname</label>
                        <input
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 focus:bg-black/60 transition-all text-white placeholder-slate-600"
                            placeholder="Ex: Ahmet"
                        />
                    </div>

                    <div className="pt-6 border-t border-white/10">
                        <button
                            onClick={createRoom}
                            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-900/40 transition-all hover:translate-y-[1px]"
                        >
                            Create New Table
                        </button>

                        <div className="relative flex items-center justify-center my-6">
                            <div className="border-t border-white/10 w-full"></div>
                            <span className="bg-transparent px-3 text-slate-500 text-xs font-bold uppercase backdrop-blur absolute">OR</span>
                        </div>

                        <div className="flex gap-3">
                            <input
                                value={roomCode}
                                onChange={e => setRoomCode(e.target.value)}
                                className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-green-500 focus:bg-black/60 uppercase tracking-widest text-center text-lg font-mono placeholder-slate-600"
                                placeholder="CODE"
                                maxLength={6}
                            />
                            <button
                                onClick={joinRoom}
                                className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-bold px-8 rounded-xl shadow-lg shadow-green-900/40 transition-all"
                            >
                                Join
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="absolute bottom-4 text-center w-full text-slate-600 text-xs">
                v1.2.0 • Cloudflare Enabled • Made by Sahin
            </div>
        </div>
    );
};
