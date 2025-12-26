import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);

    useEffect(() => {
        // Connect to backend
        // Use VITE_API_URL or fallback to localhost
        const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

        // Auto-detect production protocol/host if desired, but explicit env var is safer for separate hosting
        // console.log('Connecting to', SOCKET_URL);

        const s = io(SOCKET_URL);
        setSocket(s);

        return () => {
            s.disconnect();
        }
    }, []);

    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    );
};

export const useSocket = () => useContext(SocketContext);
