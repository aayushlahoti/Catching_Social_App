const redisClient = require('../Redis/client.js');
const { server } = require('socket.io');
const presenceManager = require('../Redis/presence.js');


class OnlineUsersTracker {
    constructor(io) {
        this.io = io;
        this.onlineUsersKey = 'onlineUsers';
    }

    initialize() {
        this.io.on('connection', async (socket) => {
            console.log('User connected:', socket.id);

            // User comes online
            // We use the authenticated user from socket.user
            const user = socket.user;
            if (user) {
                try {
                    // Allow other parts of the app to emit to a stable room per user
                    if (user.userId) {
                        socket.join(`user_${user.userId}`);
                    }

                    await this.addUser(socket.id, user);

                    const onlineUsers = await this.getOnlineUsers();
                    this.io.emit('onlineUsers_update', onlineUsers);

                    console.log(`User ${user.username} is online`);
                } catch (error) {
                    console.error('Error adding user:', error);
                }
            } else {
                console.log('User connected but not authenticated properly??');
            }

            // User disconnects
            socket.on('disconnect', async () => {
                try {
                    const user = await this.removeUser(socket.id);
                    if (user) {
                        const onlineUsers = await this.getOnlineUsers();
                        this.io.emit('onlineUsers_update', onlineUsers);

                        console.log(`User ${user.username} went offline`);
                    }
                } catch (error) {
                    console.error('Error removing user:', error);
                }
            });

            // User logs out manually
            socket.on('user_logout', async () => {
                try {
                    const user = await this.removeUser(socket.id);
                    if (user) {
                        const onlineUsers = await this.getOnlineUsers();
                        this.io.emit('onlineUsers_update', onlineUsers);
                    }

                    socket.disconnect(true);
                } catch (error) {
                    console.error('Error removing user:', error);
                }
            });
        });
    }

    // Add user
    async addUser(socketId, user) {
        try {
            const onlineUsers = await redisClient.get(this.onlineUsersKey) || {};

            const userInfo = {
                socketId,
                userId: user.userId,
                username: user.username || 'Anonymous'
            };

            onlineUsers[socketId] = userInfo;

            await redisClient.set(
                this.onlineUsersKey,
                onlineUsers,
                86400 // 24 hours
            );

            return userInfo;
        } catch (error) {
            console.error('Error adding user:', error);
            throw error;
        }
    }

    // Remove user
    async removeUser(socketId) {
        try {
            const onlineUsers = await redisClient.get(this.onlineUsersKey) || {};

            const user = onlineUsers[socketId];
            if (user) {
                delete onlineUsers[socketId];
                await redisClient.set(this.onlineUsersKey, onlineUsers);
            }

            return user;
        } catch (error) {
            console.error('Error removing user:', error);
            throw error;
        }
    }

    // Get all online users
    async getOnlineUsers() {
        try {
            const onlineUsers = await redisClient.get(this.onlineUsersKey) || {};
            return Object.values(onlineUsers);
        } catch (error) {
            console.error('Error getting online users:', error);
            throw error;
        }
    }
}

module.exports = OnlineUsersTracker;
