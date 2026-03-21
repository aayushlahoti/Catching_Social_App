const onlineUsers = new Map();  // socket.id  -> userId
const userSockets = new Map();  // userId     -> Set<socket.id>
const userCoords  = new Map();  // userId     -> { latitude, longitude, radiusKm }

const { handleLocationUpdate, handleUserDisconnect } = require('../Controllers/locationCont.js');

module.exports = function locationSocket(io) {
    io.on('connection', (socket) => {
        const user = socket.user;
        const userId = user?.userId;
        if (!userId) {
            console.log('User not authenticated for location socket');
            return;
        }

        const uid = String(userId);
        console.log(`User connected (location): ${uid} (socket: ${socket.id})`);

        // --- join-map: register user ---
        socket.on('join-map', () => {
            onlineUsers.set(socket.id, uid);
            if (!userSockets.has(uid)) userSockets.set(uid, new Set());
            userSockets.get(uid).add(socket.id);
            console.log(`User ${uid} joined map`);
        });

        // --- send-location: update + push bidirectionally ---
        socket.on('send-location', async ({ latitude, longitude, radiusKm }) => {
            // Store last known location for this user
            userCoords.set(uid, { latitude, longitude, radiusKm: radiusKm ?? 10 });

            // 1) Compute nearby users from THIS user's perspective
            const nearbyUsers = await handleLocationUpdate({
                userId: uid, latitude, longitude, radiusKm: radiusKm ?? 10
            });

            if (nearbyUsers == null) return;

            // 2) Send the list to ALL sockets belonging to this user
            const mySockets = userSockets.get(uid) || new Set([socket.id]);
            for (const sid of mySockets) {
                const s = io.sockets.sockets.get(sid);
                if (s) s.emit('nearby-users', nearbyUsers);
            }

            // 3) For each nearby user, push them an updated view that includes THIS user
            //    We re-run handleLocationUpdate FROM their coords so they get a full, enriched list.
            for (const nearby of nearbyUsers) {
                const nearbyId = String(nearby.id);
                const theirCoords = userCoords.get(nearbyId);
                if (!theirCoords) continue; // they haven't sent location yet

                const theirNearby = await handleLocationUpdate({
                    userId: nearbyId,
                    latitude:  theirCoords.latitude,
                    longitude: theirCoords.longitude,
                    radiusKm:  theirCoords.radiusKm
                });

                if (!theirNearby) continue;

                const theirSockets = userSockets.get(nearbyId) || new Set();
                for (const sid of theirSockets) {
                    const s = io.sockets.sockets.get(sid);
                    if (s) s.emit('nearby-users', theirNearby);
                }
            }
        });

        // --- disconnect ---
        socket.on('disconnect', async () => {
            const id = onlineUsers.get(socket.id) || uid;
            await handleUserDisconnect(id);
            onlineUsers.delete(socket.id);
            userCoords.delete(id);

            const socketSet = userSockets.get(id);
            if (socketSet) {
                socketSet.delete(socket.id);
                if (socketSet.size === 0) userSockets.delete(id);
            }

            io.emit('user-offline', { userId: id });
            console.log(`User disconnected (location): ${id} (socket: ${socket.id})`);
        });
    });
};