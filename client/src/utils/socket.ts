import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const connectSocket = (): Socket => {
    if (socket) return socket;

    socket = io('http://localhost:5000', {
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5
    });

    socket.on('connect', () => {
        console.log(' Socket connected:', socket?.id);
    });

    socket.on('disconnect', () => {
        console.log(' Socket disconnected');
    });

    return socket;
};

export const getSocket = (): Socket | null => {
    return socket;
};

export const emitProductEvent = (event: string, data: any) => {
    if (!socket) connectSocket();
    socket?.emit(event, data);
};

export const onProductEvent = (event: string, callback: (data: any) => void) => {
    if (!socket) connectSocket();
    socket?.on(event, callback);
};

export const offProductEvent = (event: string) => {
    socket?.off(event);
};
