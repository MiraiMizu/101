import { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import { Tile } from '../components/Tile';
import { Rack } from '../components/Rack';
import { clsx } from 'clsx';

export const Game = ({ room: initialRoom, playerName }) => {
    const socket = useSocket();
    const [room, setRoom] = useState(initialRoom);
    const [hand, setHand] = useState([]);
    const [gameData, setGameData] = useState(null); // { indicator, okey, etc }
    const [selectedTileIndex, setSelectedTileIndex] = useState(null);

    const isHost = room.players.find(p => p.name === playerName)?.isHost;
    const myPlayerId = socket.id;
    const isMyTurn = room.players[room.turnIndex]?.id === myPlayerId;

    useEffect(() => {
        setRoom(initialRoom);
    }, [initialRoom]);

    useEffect(() => {
        if (!socket) return;

        socket.on('game_started', (data) => {
            setHand(data.hand);
            setGameData({
                indicatorTile: data.indicatorTile,
                okeyTile: data.okeyTile,
                deckSize: data.deckSize
            });
            // Room update should come separately or we can update room players here?
            // Room update usually triggers 'room_update' which updates 'room' state in App.
            // We rely on App to pass updated room props, or listen here too? 
            // App listens and passes `room`.
        });

        socket.on('player_drew', ({ playerId, source }) => {
            // Animation or toast?
            console.log(`Player ${playerId} drew from ${source}`);
        });

        socket.on('player_discarded', ({ playerId, tile, nextTurn }) => {
            console.log(`Player ${playerId} discarded`, tile);
        });

        return () => {
            socket.off('game_started');
            socket.off('player_drew');
            socket.off('player_discarded');
        };
    }, [socket]);

    const handleStartGame = () => {
        socket.emit('start_game', { roomId: room.id }, (res) => {
            if (!res.success) alert(res.error);
        });
    };

    const drawTile = (source) => {
        if (!isMyTurn) return;
        socket.emit('draw_tile', { roomId: room.id, source }, (res) => {
            if (res.success) {
                setHand([...hand, res.tile]);
            } else {
                alert(res.error);
            }
        });
    };

    const discardTile = () => {
        if (selectedTileIndex === null) return;
        if (!isMyTurn) return; // Backend checks too

        socket.emit('discard_tile', { roomId: room.id, tileIndex: selectedTileIndex }, (res) => {
            if (res.success) {
                const newHand = [...hand];
                newHand.splice(selectedTileIndex, 1);
                setHand(newHand);
                setSelectedTileIndex(null);
            } else {
                alert(res.error);
            }
        });
    };

    const sortHand = (type) => {
        const newHand = [...hand];
        newHand.sort((a, b) => {
            if (type === 'color') {
                if (a.color === b.color) return a.value - b.value;
                return a.color.localeCompare(b.color);
            } else {
                // 777 logic (Groups)
                if (a.value === b.value) return a.color.localeCompare(b.color);
                return a.value - b.value;
            }
        });
        setHand(newHand);
    };

    if (room.gameState === 'WAITING') {
        return (
            <div className="min-h-screen bg-slate-900 text-white p-8 flex flex-col items-center">
                <h1 className="text-3xl font-bold mb-4">Waiting Room: {room.id}</h1>
                <div className="bg-slate-800 p-6 rounded-lg w-full max-w-lg mb-6">
                    <h2 className="text-xl mb-4 text-slate-400">Players ({room.players.length}/4)</h2>
                    <ul className="space-y-2">
                        {room.players.map(p => (
                            <li key={p.id} className="flex justify-between items-center bg-slate-700 p-3 rounded">
                                <span>{p.name} {p.isHost && '(Host)'}</span>
                                {p.name === playerName && <span className="text-xs bg-blue-600 px-2 py-1 rounded">YOU</span>}
                            </li>
                        ))}
                    </ul>
                </div>

                {isHost && (
                    <div className="flex flex-col gap-4">
                        <button
                            onClick={handleStartGame}
                            className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-8 rounded-full text-xl shadow-lg transition-transform hover:scale-105"
                        >
                            START GAME
                        </button>

                        <button
                            onClick={() => {
                                socket.emit('add_bot', { roomId: room.id }, (res) => {
                                    if (!res.success) alert(res.error);
                                });
                            }}
                            className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 px-6 rounded-full shadow transition-colors"
                        >
                            + ADD BOT
                        </button>
                    </div>
                )}

                {!isHost && <p className="animate-pulse text-slate-500">Waiting for host to start...</p>}
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#1a472a] relative overflow-hidden flex flex-col font-sans select-none">
            {/* Table Texture/Gradient */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#2d6a4f_0%,_#1a472a_100%)] opacity-80 pointer-events-none" />

            {/* Top Info Bar */}
            <div className="bg-black/30 backdrop-blur text-white p-3 flex justify-between items-center z-10 shadow-lg border-b border-white/10">
                <div className="font-bold text-xl tracking-wider text-amber-400 drop-shadow-md">Table: {room.id}</div>
                <div className="flex items-center gap-4">
                    <span className={clsx("px-4 py-1 rounded-full font-bold transition-all", isMyTurn ? "bg-green-500 text-white shadow-[0_0_15px_rgba(34,197,94,0.6)] scale-110" : "bg-slate-700/50 text-slate-300")}>
                        {isMyTurn ? "YOUR TURN" : `${room.players[room.turnIndex]?.name}'s Turn`}
                    </span>
                </div>
                {gameData && (
                    <div className="flex items-center gap-2 bg-slate-800/50 px-3 py-1 rounded-lg border border-white/10">
                        <span className="text-sm text-slate-300 uppercase tracking-widest text-[10px]">Indicator</span>
                        <div className="scale-[0.6] origin-center -my-3">
                            <Tile color={gameData.indicatorTile.color} value={gameData.indicatorTile.value} type={gameData.indicatorTile.type} />
                        </div>
                    </div>
                )}
            </div>

            {/* Main Game Area */}
            <div className="flex-1 flex flex-col relative p-4 z-0">

                {/* Opponents */}
                {(() => {
                    const pIndex = room.players.findIndex(p => p.id === myPlayerId);

                    return room.players.map((p, i) => {
                        if (p.id === myPlayerId) return null;

                        const relativeIndex = (i - pIndex + 4) % 4;
                        let posStyles = {};
                        let alignClass = '';

                        // Positioning percentage-based to avoid fixed pixel Overlaps
                        if (relativeIndex === 1) { // Right
                            posStyles = { right: '20px', top: '50%', transform: 'translateY(-50%)' };
                            alignClass = 'items-end';
                        } else if (relativeIndex === 2) { // Top
                            posStyles = { top: '20px', left: '50%', transform: 'translateX(-50%)' };
                            alignClass = 'items-center';
                        } else if (relativeIndex === 3) { // Left
                            posStyles = { left: '20px', top: '50%', transform: 'translateY(-50%)' };
                            alignClass = 'items-start';
                        } else return null;

                        const isActive = room.turnIndex === i;

                        return (
                            <div key={p.id} className={clsx("absolute flex flex-col p-2 rounded-xl transition-all duration-500", alignClass, isActive ? "bg-white/10 shadow-[0_0_20px_rgba(255,255,255,0.2)]" : "bg-transparent")} style={posStyles}>
                                {/* Avatar Circle */}
                                <div className={clsx("w-16 h-16 rounded-full border-4 flex items-center justify-center bg-slate-800 shadow-xl mb-2 relative", isActive ? "border-green-500 scale-110" : "border-slate-600")}>
                                    <span className="text-xl font-bold text-white">{p.name.charAt(0).toUpperCase()}</span>
                                    {isActive && <div className="absolute -bottom-1 w-6 h-6 bg-green-500 rounded-full border-2 border-slate-900 animate-bounce" />}
                                </div>

                                <div className="bg-black/60 px-3 py-1 rounded text-white text-sm font-bold backdrop-blur-sm whitespace-nowrap mb-1">{p.name}</div>
                                <div className="flex gap-1">
                                    <div className="text-[10px] bg-blue-600/80 px-2 rounded text-white">Score: {p.scores || 0}</div>
                                    <div className="text-[10px] bg-slate-600/80 px-2 rounded text-white">{p.hand?.length} Tiles</div>
                                </div>
                            </div>
                        );
                    });
                })()}

                {/* Center Table (Deck & Discards) */}
                <div className="flex-1 flex items-center justify-center gap-12 md:gap-24 relative">
                    {/* Deck */}
                    <div className="relative group">
                        <div
                            onClick={() => drawTile('deck')}
                            className="w-28 h-36 bg-[#2c4c7c] rounded-lg border-[3px] border-[#a0aec0] shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex items-center justify-center cursor-pointer transition-all hover:scale-105 active:scale-95"
                        >
                            <div className="w-20 h-28 border-2 border-dashed border-[#5473a1] rounded flex items-center justify-center">
                                <span className="text-white/20 font-bold text-2xl rotate-45">101</span>
                            </div>
                        </div>
                        <div className="absolute -top-8 w-full text-center text-white/50 text-xs font-bold uppercase tracking-wider">
                            Deck ({gameData?.deckSize || 0})
                        </div>
                    </div>

                    {/* Previous Player Discard (Left of User or Center?) 
                        Usually in real life, discard is to your right, but in digital, often center. 
                        Let's put "Previous Player's Discard" clearly in center-left.
                    */}
                    <div className="flex flex-col items-center gap-2">
                        <div className="text-white/50 text-xs font-bold uppercase tracking-wider">Prev Discard</div>
                        {(() => {
                            const pIndex = room.players.findIndex(p => p.id === myPlayerId);
                            const prevIndex = (pIndex - 1 + room.players.length) % room.players.length;
                            const prevPlayerId = room.players[prevIndex].id;
                            const discardPile = room.discards?.[prevPlayerId] || [];
                            const topCard = discardPile[discardPile.length - 1];

                            return (
                                <div className={clsx("transition-transform hover:scale-110", !topCard && "opacity-50")}>
                                    {topCard ? (
                                        <Tile
                                            color={topCard.color}
                                            value={topCard.value}
                                            type={topCard.type}
                                            onClick={() => drawTile('discard')}
                                            className="shadow-2xl cursor-pointer"
                                        />
                                    ) : (
                                        <div className="w-12 h-16 border-2 border-white/20 rounded-lg flex items-center justify-center">
                                            <span className="text-white/20 text-xs">Empty</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })()}
                    </div>

                    {/* My Discard Pile (Visual only, to show what I discarded) */}
                    <div className="flex flex-col items-center gap-2 opacity-60 hover:opacity-100 transition-opacity">
                        <div className="text-white/50 text-xs font-bold uppercase tracking-wider">My Stack</div>
                        {(() => {
                            const discardPile = room.discards?.[myPlayerId] || [];
                            const topCard = discardPile[discardPile.length - 1];
                            return topCard ? (
                                <Tile color={topCard.color} value={topCard.value} type={topCard.type} className="scale-90 grayscale-[0.3]" />
                            ) : (
                                <div className="w-12 h-16 border-2 border-dashed border-white/10 rounded-lg" />
                            );
                        })()}
                    </div>
                </div>

                {/* My Action Area (Rack + Buttons) */}
                <div className="mt-auto relative z-20 flex flex-col items-center gap-4">
                    {/* Action Buttons Floating above Rack */}
                    <div className="flex gap-4 items-center mb-2">
                        <div className="bg-black/40 p-1 rounded-lg flex gap-1 backdrop-blur-md border border-white/5">
                            <button onClick={() => sortHand('color')} className="px-4 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold transition-colors">Sort Color</button>
                            <button onClick={() => sortHand('value')} className="px-4 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold transition-colors">Sort 777</button>
                        </div>

                        {isMyTurn && hand.length > 21 && (
                            <button
                                onClick={discardTile}
                                disabled={selectedTileIndex === null}
                                className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold py-2 px-8 rounded-full shadow-[0_0_20px_rgba(220,38,38,0.5)] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transition-all transform hover:-translate-y-1 active:translate-y-0"
                            >
                                DISCARD TILE
                            </button>
                        )}
                    </div>

                    <div className="w-full max-w-[95vw] md:max-w-4xl">
                        <Rack
                            tiles={hand}
                            selectedTileIndex={selectedTileIndex}
                            onClickTile={setSelectedTileIndex}
                        />
                    </div>
                </div>

            </div>
        </div>
    );
};

