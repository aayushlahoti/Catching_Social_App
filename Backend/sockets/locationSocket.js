const onlineUsers = new Map(); // socket.id -> userId
const { handleLocationUpdate, handleUserDisconnect } = require('../Controllers/locationCont.js');

module.exports = function locationSocket(io) {
    io.on('connection', (socket) => {
        const user = socket.user;
        const userId = user?.userId;
        if (!userId) {
            console.log('User not authenticated for location socket');
            return;
        }

        console.log('User Connected (location): ', socket.id);

        // Client emits: join-map
        socket.on('join-map', () => {
            onlineUsers.set(socket.id, String(userId));
        });

        // Client emits: send-location
        socket.on('send-location', async ({ latitude, longitude, radiusKm }) => {
            const nearbyUsers = await handleLocationUpdate({
                userId: String(userId),
                latitude,
                longitude,
                radiusKm: radiusKm ?? 10
            });

            if (nearbyUsers == null) return;
            socket.emit('nearby-users', nearbyUsers);
        });

        socket.on('disconnect', async () => {
            const id = onlineUsers.get(socket.id) || String(userId);
            await handleUserDisconnect(id);
            onlineUsers.delete(socket.id);
            io.emit('user-offline', { userId: id });
            console.log('user disconnected (location): ', socket.id);
        });
    });
};