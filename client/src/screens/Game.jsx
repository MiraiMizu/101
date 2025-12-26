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
        <div className="min-h-screen bg-[#2c3e50] relative overflow-hidden flex flex-col">
            {/* Top Info Bar */}
            <div className="bg-slate-900 text-white p-2 flex justify-between items-center z-10 shadow-md">
                <div className="font-mono text-xl">Room: {room.id}</div>
                <div>
                    Turn: <span className={isMyTurn ? "text-green-400 font-bold" : "text-slate-400"}>
                        {isMyTurn ? "YOUR TURN" : room.players[room.turnIndex]?.name}
                    </span>
                </div>
                {gameData && (
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-400">Indicator:</span>
                        <div className="scale-75 origin-center -my-1">
                            <Tile color={gameData.indicatorTile.color} value={gameData.indicatorTile.value} type={gameData.indicatorTile.type} />
                        </div>
                    </div>
                )}
            </div>

            {/* Main Game Area */}
            <div className="flex-1 flex flex-col relative p-4">

                {/* Opponents (Seated) */}
                {(() => {
                    const pIndex = room.players.findIndex(p => p.id === myPlayerId);

                    return room.players.map((p, i) => {
                        if (p.id === myPlayerId) return null; // Skip self

                        const relativeIndex = (i - pIndex + 4) % 4;
                        let positionClass = '';

                        // 1 = Right, 2 = Top, 3 = Left
                        if (relativeIndex === 1) positionClass = "absolute right-4 top-1/2 -translate-y-1/2 flex-col items-end";
                        else if (relativeIndex === 2) positionClass = "absolute top-4 left-1/2 -translate-x-1/2 flex-col items-center";
                        else if (relativeIndex === 3) positionClass = "absolute left-4 top-1/2 -translate-y-1/2 flex-col items-start";
                        else return null; // Should not happen for <4 players? If 2 players, relative is 1.

                        return (
                            <div key={p.id} className={clsx("flex gap-2 bg-slate-800 text-white p-3 rounded-lg shadow-lg opacity-90 min-w-[120px] transition-all", positionClass)}>
                                <div className="font-bold text-lg truncate flex items-center gap-2">
                                    {p.name}
                                    {room.turnIndex === i && <div className="w-3 h-3 bg-green-500 rounded-full animate-ping" />}
                                </div>
                                <div className="text-sm text-slate-300">{p.scores || 0} pts</div>
                                <div className="text-xs text-slate-500">{p.hand?.length || 0} Tiles</div>

                                {/* Show Discard Pile for this opponent if desired, 
                                    but usually we only show Previous Discard in center for interaction. 
                                    Visual only here? */}
                            </div>
                        );
                    });
                })()}

                {/* Center Area (Deck & Discards) */}
                <div className="flex-1 flex items-center justify-center gap-8 md:gap-16">
                    {/* Deck */}
                    <div
                        onClick={() => drawTile('deck')}
                        className="w-24 h-32 bg-blue-900 rounded-lg border-4 border-white shadow-2xl flex items-center justify-center cursor-pointer hover:-translate-y-1 transition-transform relative group"
                    >
                        <div className="text-white font-bold text-xl">DECK</div>
                        <div className="absolute -bottom-8 text-white text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                            {gameData?.deckSize || 0} Left
                        </div>
                    </div>

                    {/* Previous Player Discard */}
                    <div className="flex flex-col items-center">
                        <div className="text-white mb-2 font-bold text-sm">Prev Discard</div>
                        {(() => {
                            const pIndex = room.players.findIndex(p => p.id === myPlayerId);
                            const prevIndex = (pIndex - 1 + room.players.length) % room.players.length;
                            const prevPlayerId = room.players[prevIndex].id;
                            const discardPile = room.discards?.[prevPlayerId] || [];
                            const topCard = discardPile[discardPile.length - 1];

                            return topCard ? (
                                <Tile
                                    color={topCard.color}
                                    value={topCard.value}
                                    type={topCard.type}
                                    onClick={() => drawTile('discard')}
                                    className="hover:scale-105"
                                />
                            ) : (
                                <div className="w-12 h-16 border-2 border-dashed border-slate-500 rounded flex items-center justify-center text-slate-500 text-xs">Empty</div>
                            );
                        })()}
                    </div>

                    {/* My Discard Pile */}
                    <div className="flex flex-col items-center opacity-75">
                        <div className="text-white mb-2 font-bold text-sm">My Discard</div>
                        {(() => {
                            const discardPile = room.discards?.[myPlayerId] || [];
                            const topCard = discardPile[discardPile.length - 1];

                            return topCard ? (
                                <Tile
                                    color={topCard.color}
                                    value={topCard.value}
                                    type={topCard.type}
                                />
                            ) : (
                                <div className="w-12 h-16 border-2 border-dashed border-slate-500 rounded flex items-center justify-center text-slate-500 text-xs text-center">Empty</div>
                            );
                        })()}
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="absolute bottom-[260px] md:bottom-[280px] w-full flex justify-center gap-4 z-20 pointer-events-none">
                    <div className="pointer-events-auto flex gap-2">
                        <button onClick={() => sortHand('color')} className="bg-slate-700 hover:bg-slate-600 text-white text-sm py-1 px-3 rounded shadow">Sort: 123</button>
                        <button onClick={() => sortHand('value')} className="bg-slate-700 hover:bg-slate-600 text-white text-sm py-1 px-3 rounded shadow">Sort: 777</button>
                    </div>

                    {isMyTurn && hand.length > 21 && (
                        <button
                            onClick={discardTile}
                            disabled={selectedTileIndex === null}
                            className="bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-6 rounded shadow-lg disabled:opacity-50 disabled:cursor-not-allowed pointer-events-auto animate-bounce"
                        >
                            DISCARD SELECTED
                        </button>
                    )}
                </div>

                {/* My Rack */}
                <div className="mt-auto z-10">
                    <Rack
                        tiles={hand}
                        selectedTileIndex={selectedTileIndex}
                        onClickTile={setSelectedTileIndex}
                    />
                </div>
            </div>
        </div>
    );
};
