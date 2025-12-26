import { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';

export const Lobby = ({ onJoin }) => {
    const socket = useSocket();
    const [name, setName] = useState(localStorage.getItem('okey_username') || '');
    const [roomCode, setRoomCode] = useState('');
    const [rooms, setRooms] = useState([]);
    const [view, setView] = useState('menu'); // menu, join_code, browse
    const [error, setError] = useState('');

    useEffect(() => {
        if (name) localStorage.setItem('okey_username', name);
    }, [name]);

    useEffect(() => {
        if (!socket) return;

        socket.on('rooms_list_update', (updatedRooms) => {
            setRooms(updatedRooms);
        });

        // Fetch initial rooms
        if (view === 'browse') {
            socket.emit('get_rooms', (fetchedRooms) => {
                setRooms(fetchedRooms);
            });
        }

        return () => {
            socket.off('rooms_list_update');
        };
    }, [socket, view]);

    const createRoom = () => {
        if (!name.trim()) { setError('Please enter a nickname'); return; }
        socket.emit('create_room', { playerName: name }, (res) => {
            if (res.success) {
                onJoin(res.room, name);
            } else {
                setError(res.error);
            }
        });
    };

    const joinRoom = (code) => {
        if (!name.trim()) { setError('Please enter a nickname'); return; }
        if (!code) { setError('Please enter a room code'); return; }
        socket.emit('join_room', { roomId: code, playerName: name }, (res) => {
            if (res.success) {
                onJoin(res.room, name);
            } else {
                setError(res.error);
            }
        });
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden font-sans select-none">
            {/* Background Image Layer */}
            <div
                className="absolute inset-0 z-0 bg-cover bg-center transition-all duration-1000 transform scale-105"
                style={{
                    backgroundImage: `url('https://images.unsplash.com/photo-1596726848263-82a88e9994c6?q=80&w=2832&auto=format&fit=crop')`,
                    filter: 'brightness(0.4) blur(4px)'
                }}
            />
            {/* Gradient Overlay */}
            <div className="absolute inset-0 z-0 bg-gradient-to-br from-slate-900/90 via-slate-900/80 to-slate-900/90" />

            {/* Content Card */}
            <div className="bg-slate-800/80 backdrop-blur-xl p-8 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] w-full max-w-md border border-white/10 relative z-10">
                {/* Logo Area */}
                <div className="flex justify-center mb-6">
                    <div className="w-16 h-24 bg-[#e2c17c] rounded-lg border-2 border-[#8e6b2c] flex items-center justify-center shadow-lg transform -rotate-6">
                        <span className="text-3xl font-bold text-red-600">101</span>
                    </div>
                    <div className="w-16 h-24 bg-[#e2c17c] rounded-lg border-2 border-[#8e6b2c] flex items-center justify-center shadow-lg transform rotate-6 -ml-6 mt-3 bg-slate-100">
                        <span className="text-3xl font-bold text-black">★</span>
                    </div>
                </div>

                <h1 className="text-4xl font-bold text-center mb-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">101 Okey Online</h1>

                {error && (
                    <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-3 rounded-lg my-4 text-sm text-center animate-pulse">
                        {error}
                    </div>
                )}

                {/* Nickname Input - Always Visible if not set */}
                <div className="mb-6">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">My Nickname</label>
                    <input
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 focus:bg-black/60 transition-all text-white placeholder-slate-600 text-lg font-bold"
                        placeholder="Ex: Ahmet"
                    />
                </div>

                {/* View Switcher */}
                {view === 'menu' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <button onClick={createRoom} className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-900/40 transition-all hover:translate-y-[1px] flex items-center justify-center gap-3">
                            <span>🎲</span> Create New Table
                        </button>
                        <button onClick={() => setView('browse')} className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-green-900/40 transition-all hover:translate-y-[1px] flex items-center justify-center gap-3">
                            <span>📋</span> Browse Open Rooms
                        </button>
                        <button onClick={() => setView('join_code')} className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-xl shadow transition-colors text-sm">
                            Enter Room Code
                        </button>
                    </div>
                )}

                {view === 'browse' && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-white">Open Tables</h2>
                            <button onClick={() => setView('menu')} className="text-slate-400 hover:text-white text-sm">Back</button>
                        </div>

                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-600">
                            {rooms.length === 0 ? (
                                <div className="text-center py-8 text-slate-500">No open rooms found. Create one!</div>
                            ) : (
                                rooms.map(r => (
                                    <div key={r.id} className="bg-black/30 p-3 rounded-lg border border-white/5 flex justify-between items-center hover:bg-black/50 transition-colors">
                                        <div>
                                            <div className="font-bold text-amber-400 text-sm">Table #{r.id}</div>
                                            <div className="text-xs text-slate-400">Host: {r.host}</div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="text-xs font-bold text-slate-300">{r.playerCount}/4</div>
                                            <button onClick={() => joinRoom(r.id)} className="bg-green-600 hover:bg-green-500 text-white text-xs font-bold px-3 py-1.5 rounded transition-colors">
                                                JOIN
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {view === 'join_code' && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-white">Join by Code</h2>
                            <button onClick={() => setView('menu')} className="text-slate-400 hover:text-white text-sm">Back</button>
                        </div>
                        <input
                            value={roomCode}
                            onChange={e => setRoomCode(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-green-500 focus:bg-black/60 uppercase tracking-widest text-center text-lg font-mono placeholder-slate-600 mb-4"
                            placeholder="CODE"
                            maxLength={6}
                        />
                        <button
                            onClick={() => joinRoom(roomCode)}
                            className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl shadow-lg transition-colors"
                        >
                            Join Room
                        </button>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="absolute bottom-4 text-center w-full text-slate-600 text-xs">
                v1.3.0 • Room Browser Added • Cloudflare Ready
            </div>
        </div>
    );
};
