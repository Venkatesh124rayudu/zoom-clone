import { Server } from "socket.io"

// In-memory state per meeting room (room = meeting code)
let connections = {}   // room -> [socketId]
let messages = {}      // room -> [{ sender, data, socket-id-sender }]
let timeOnline = {}    // socketId -> join time

const findRoomOf = (socketId) => {
    for (const room in connections) {
        if (connections[room].includes(socketId)) return room;
    }
    return null;
}

export const connectToSocket = (server, clientUrl) => {
    const io = new Server(server, {
        cors: {
            origin: clientUrl,
            methods: ["GET", "POST"],
            credentials: true
        }
    });


    io.on("connection", (socket) => {

        socket.on("join-call", (path) => {

            if (connections[path] === undefined) {
                connections[path] = []
            }
            if (!connections[path].includes(socket.id)) {
                connections[path].push(socket.id)
            }

            timeOnline[socket.id] = new Date();

            // Tell everyone in the room (including the new user) who is here,
            // so peers can start WebRTC connections with the newcomer.
            for (const id of connections[path]) {
                io.to(id).emit("user-joined", socket.id, connections[path])
            }

            // Late joiners receive the chat history of the room.
            if (messages[path] !== undefined) {
                for (const msg of messages[path]) {
                    io.to(socket.id).emit("chat-message", msg['data'], msg['sender'], msg['socket-id-sender'])
                }
            }

        })

        // WebRTC signalling: forward SDP offers/answers and ICE candidates to one peer.
        socket.on("signal", (toId, message) => {
            io.to(toId).emit("signal", socket.id, message);
        })

        socket.on("chat-message", (data, sender) => {

            // 1. Find the room of the user
            const matchingRoom = findRoomOf(socket.id);
            if (!matchingRoom) return;

            // 2. Create message history for room if not exists
            if (!messages[matchingRoom]) {
                messages[matchingRoom] = [];
            }

            // 3. Save message
            messages[matchingRoom].push({
                sender,
                data,
                "socket-id-sender": socket.id
            });

            // 4. Send message to everyone in the room
            for (const socketId of connections[matchingRoom]) {
                io.to(socketId).emit("chat-message", data, sender, socket.id);
            }
        });


        socket.on("disconnect", () => {

            delete timeOnline[socket.id];

            // 1. Find the room they belong to
            const roomOfUser = findRoomOf(socket.id);
            if (!roomOfUser) return;

            // 2. Remove user from room list
            connections[roomOfUser] = connections[roomOfUser].filter(id => id !== socket.id);

            // 3. Notify the remaining users
            for (const id of connections[roomOfUser]) {
                io.to(id).emit("user-left", socket.id);
            }

            // 4. Delete room (and its chat) once everyone has left
            if (connections[roomOfUser].length === 0) {
                delete connections[roomOfUser];
                delete messages[roomOfUser];
            }
        });


    })
    return io;
}
