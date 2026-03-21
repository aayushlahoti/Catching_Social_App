const redis = require('redis');
const redisClient = require('./client.js');

class PresenceManager {
    constructor() {
        this.PRESENCE_KEY = 'presence:';
        this.ONLINE_USER_SET = 'online_users';
        this.DEFAULT_EXPIRY = 60 * 60; // 1 hour
    }

    async setUserOnline(userId, metadata = {}, expireTime = this.DEFAULT_EXPIRY) {
        try {
            const presenceKey = `${this.PRESENCE_KEY}${userId}`;
            const presenceData = JSON.stringify({
                userId,
                status: 'online',
                metadata,
                lastSeen: new Date().toISOString()
            });

            const client = redisClient.getClient();

            // Use a transaction to ensure atomicity
            await client.multi()
                .set(presenceKey, presenceData, { EX: expireTime })
                .sAdd(this.ONLINE_USER_SET, userId)
                .exec();

            return true;
        } catch (error) {
            console.error('Error setting the user online:', error);
            throw error;
        }
    }

    async setUserOffline(userId) {
        try {
            const presenceKey = `${this.PRESENCE_KEY}${userId}`;
            const client = redisClient.getClient();

            await client.multi()
                .del(presenceKey)
                .sRem(this.ONLINE_USER_SET, userId)
                .exec();

            return true;
        } catch (error) {
            console.error('Error setting the user offline:', error);
            throw error;
        }
    }

    async isUserOnline(userId) {
        try {
            const presenceKey = `${this.PRESENCE_KEY}${userId}`;
            const client = redisClient.getClient();
            const presence = await client.get(presenceKey);
            return presence !== null;
        } catch (error) {
            console.error('Error checking the user online status:', error);
            return false;
        }
    }

    async getUserPresence(userId) {
        try {
            const presenceKey = `${this.PRESENCE_KEY}${userId}`;
            const client = redisClient.getClient();
            const presence = await client.get(presenceKey);
            return presence ? JSON.parse(presence) : null;
        } catch (error) {
            console.error('Error getting the user presence data:', error);
            return null;
        }
    }

    /**
     * Get presence data for multiple users
     * @param {Array<string>} userIds - Array of user identifiers
     * @returns {Object} - Map of userId to presence data
     */
    async getUsersPresence(userIds) {
        try {
            if (!Array.isArray(userIds) || userIds.length === 0) {
                return {};
            }

            const client = redisClient.getClient();
            const presenceMap = {};

            // Build array of presence keys
            const presenceKeys = userIds.map(userId => `${this.PRESENCE_KEY}${userId}`);

            // Use mGet for efficient batch retrieval
            const presenceDataArray = await client.mGet(presenceKeys);

            // Map results back to userIds
            userIds.forEach((userId, index) => {
                const presenceData = presenceDataArray[index];
                if (presenceData) {
                    presenceMap[userId] = JSON.parse(presenceData);
                } else {
                    presenceMap[userId] = {
                        userId,
                        status: 'offline',
                        lastSeen: null
                    };
                }
            });

            return presenceMap;
        } catch (error) {
            console.error('Error getting users presence:', error);
            return {};
        }
    }

    /**
     * Check online status for multiple users
     * @param {Array<string>} userIds - Array of user identifiers
     * @returns {Object} - Map of userId to boolean (true = online, false = offline)
     */
    async checkMultipleUsersOnline(userIds) {
        try {
            if (!Array.isArray(userIds) || userIds.length === 0) {
                return {};
            }

            const client = redisClient.getClient();
            const statusMap = {};

            // Build array of presence keys
            const presenceKeys = userIds.map(userId => `${this.PRESENCE_KEY}${userId}`);

            // Use mGet for efficient batch retrieval
            const presenceDataArray = await client.mGet(presenceKeys);

            // Map results back to userIds
            userIds.forEach((userId, index) => {
                statusMap[userId] = presenceDataArray[index] !== null;
            });

            return statusMap;
        } catch (error) {
            console.error('Error checking multiple users online:', error);
            return {};
        }
    }

    /**
     * Set multiple users online at once
     * @param {Array<Object>} users - Array of user objects [{userId, metadata, expireTime}]
     * @returns {Object} - Result with success count and failures
     */
    async setMultipleUsersOnline(users) {
        try {
            if (!Array.isArray(users) || users.length === 0) {
                return { success: 0, failed: 0, errors: [] };
            }

            const client = redisClient.getClient();
            const pipeline = client.multi();

            let successCount = 0;
            const errors = [];

            for (const user of users) {
                const { userId, metadata = {}, expireTime = this.DEFAULT_EXPIRY } = user;

                if (!userId) {
                    errors.push({ userId: null, error: 'userId is required' });
                    continue;
                }

                const presenceKey = `${this.PRESENCE_KEY}${userId}`;
                const presenceData = JSON.stringify({
                    userId,
                    status: 'online',
                    metadata,
                    lastSeen: new Date().toISOString()
                });

                pipeline.set(presenceKey, presenceData, { EX: expireTime });
                pipeline.sAdd(this.ONLINE_USER_SET, userId);
                successCount++;
            }

            await pipeline.exec();

            return {
                success: successCount,
                failed: errors.length,
                errors
            };
        } catch (error) {
            console.error('Error setting multiple users online:', error);
            throw error;
        }
    }

    /**
     * Set multiple users offline at once
     * @param {Array<string>} userIds - Array of user identifiers
     * @returns {Object} - Result with success count
     */
    async setMultipleUsersOffline(userIds) {
        try {
            if (!Array.isArray(userIds) || userIds.length === 0) {
                return { success: 0 };
            }

            const client = redisClient.getClient();
            const pipeline = client.multi();

            for (const userId of userIds) {
                const presenceKey = `${this.PRESENCE_KEY}${userId}`;
                pipeline.del(presenceKey);
                pipeline.sRem(this.ONLINE_USER_SET, userId);
            }

            await pipeline.exec();

            return { success: userIds.length };
        } catch (error) {
            console.error('Error setting multiple users offline:', error);
            throw error;
        }
    }

    /**
     * Update heartbeat for multiple users
     * @param {Array<string>} userIds - Array of user identifiers
     * @param {number} expireTime - TTL for presence
     * @returns {Object} - Result with success and failed counts
     */
    async updateMultipleHeartbeats(userIds, expireTime = this.DEFAULT_EXPIRY) {
        try {
            if (!Array.isArray(userIds) || userIds.length === 0) {
                return { success: 0, failed: 0 };
            }

            const client = redisClient.getClient();
            let successCount = 0;
            let failedCount = 0;

            for (const userId of userIds) {
                const presence = await this.getUserPresence(userId);
                if (presence) {
                    presence.lastSeen = new Date().toISOString();
                    await this.setUserOnline(userId, presence.metadata, expireTime);
                    successCount++;
                } else {
                    failedCount++;
                }
            }

            return { success: successCount, failed: failedCount };
        } catch (error) {
            console.error('Error updating multiple heartbeats:', error);
            throw error;
        }
    }

    async getOnlineUsers() {
        try {
            const client = redisClient.getClient();
            const userIds = await client.sMembers(this.ONLINE_USER_SET);

            const onlineUsers = [];
            for (const userId of userIds) {
                const isOnline = await this.isUserOnline(userId);
                if (isOnline) {
                    onlineUsers.push(userId);
                } else {
                    await client.sRem(this.ONLINE_USER_SET, userId);
                }
            }
            return onlineUsers;
        } catch (error) {
            console.error('Error getting the online users:', error);
            return [];
        }
    }

    /**
     * Get online users count
     * @returns {number} - Count of online users
     */
    async getOnlineUsersCount() {
        try {
            const client = redisClient.getClient();
            return await client.sCard(this.ONLINE_USER_SET);
        } catch (error) {
            console.error('Error getting online users count:', error);
            return 0;
        }
    }

    /**
     * Update user's last seen timestamp (heartbeat)
     * @param {string} userId - User identifier
     * @param {number} expireTime - Reset TTL
     */
    async updateHeartbeat(userId, expireTime = this.DEFAULT_EXPIRY) {
        try {
            const presence = await this.getUserPresence(userId);
            if (presence) {
                presence.lastSeen = new Date().toISOString();
                await this.setUserOnline(userId, presence.metadata, expireTime);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error updating heartbeat:', error);
            throw error;
        }
    }

    async cleanUp() {
        try {
            const client = redisClient.getClient();
            const userIds = await client.sMembers(this.ONLINE_USER_SET);

            for (const userId of userIds) {
                const isOnline = await this.isUserOnline(userId);
                if (!isOnline) {
                    await client.sRem(this.ONLINE_USER_SET, userId);
                }
            }
            return true;
        } catch (error) {
            console.error('Error cleaning up the online users:', error);
            throw error;
        }
    }
}

const presenceManager = new PresenceManager();
module.exports = presenceManager;