const presenceManager = require('../Redis/presence.js');

/**
 * Get all online users
 * GET /api/presence/online
 */
exports.getOnlineUsers = async (req, res) => {
    try {
        const users = await presenceManager.getOnlineUsers();

        res.status(200).json({
            success: true,
            count: users.length,
            users
        });
    } catch (error) {
        console.error('Error getting online users:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch online users',
            error: error.message
        });
    }
};

/**
 * Get online users count
 * GET /api/presence/online/count
 */
exports.getOnlineUsersCount = async (req, res) => {
    try {
        const count = await presenceManager.getOnlineUsersCount();

        res.status(200).json({
            success: true,
            count
        });
    } catch (error) {
        console.error('Error getting user count:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user count',
            error: error.message
        });
    }
};

/**
 * Check if a specific user is online
 * GET /api/presence/online/:userId
 */
exports.checkUserOnline = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'userId is required'
            });
        }

        const isOnline = await presenceManager.isUserOnline(userId);
        const presence = isOnline ? await presenceManager.getUserPresence(userId) : null;

        res.status(200).json({
            success: true,
            userId,
            isOnline,
            presence
        });
    } catch (error) {
        console.error('Error checking user status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check user status',
            error: error.message
        });
    }
};

/**
 * Get user presence data
 * GET /api/presence/user/:userId
 */
exports.getUserPresence = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'userId is required'
            });
        }

        const presence = await presenceManager.getUserPresence(userId);

        if (!presence) {
            return res.status(404).json({
                success: false,
                message: 'User presence not found',
                userId
            });
        }

        res.status(200).json({
            success: true,
            presence
        });
    } catch (error) {
        console.error('Error getting user presence:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user presence',
            error: error.message
        });
    }
};

/**
 * Get presence for multiple users
 * POST /api/presence/bulk
 * Body: { userIds: ["user1", "user2", "user3"] }
 */
exports.getUsersPresence = async (req, res) => {
    try {
        const { userIds } = req.body;

        if (!Array.isArray(userIds)) {
            return res.status(400).json({
                success: false,
                message: 'userIds must be an array'
            });
        }

        if (userIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'userIds array cannot be empty'
            });
        }

        const presence = await presenceManager.getUsersPresence(userIds);

        res.status(200).json({
            success: true,
            count: Object.keys(presence).length,
            presence
        });
    } catch (error) {
        console.error('Error getting users presence:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch users presence',
            error: error.message
        });
    }
};

/**
 * Check online status for multiple users
 * POST /api/presence/check-multiple
 * Body: { userIds: ["user1", "user2", "user3"] }
 */
exports.checkMultipleUsersOnline = async (req, res) => {
    try {
        const { userIds } = req.body;

        if (!Array.isArray(userIds)) {
            return res.status(400).json({
                success: false,
                message: 'userIds must be an array'
            });
        }

        if (userIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'userIds array cannot be empty'
            });
        }

        const status = await presenceManager.checkMultipleUsersOnline(userIds);

        res.status(200).json({
            success: true,
            count: Object.keys(status).length,
            status
        });
    } catch (error) {
        console.error('Error checking multiple users online:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check users status',
            error: error.message
        });
    }
};

/**
 * Manually set user online (optional - usually done via socket)
 * POST /api/presence/online/:userId
 * Body: { metadata: { device: "mobile", location: "..." }, expireTime: 3600 }
 */
exports.setUserOnline = async (req, res) => {
    try {
        const { userId } = req.params;
        const { metadata = {}, expireTime } = req.body;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'userId is required'
            });
        }

        await presenceManager.setUserOnline(userId, metadata, expireTime);

        res.status(200).json({
            success: true,
            message: `User ${userId} marked as online`,
            userId
        });
    } catch (error) {
        console.error('Error setting user online:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to set user online',
            error: error.message
        });
    }
};

/**
 * Set multiple users online
 * POST /api/presence/online/bulk
 * Body: { users: [{ userId: "user1", metadata: {...}, expireTime: 3600 }] }
 */
exports.setMultipleUsersOnline = async (req, res) => {
    try {
        const { users } = req.body;

        if (!Array.isArray(users)) {
            return res.status(400).json({
                success: false,
                message: 'users must be an array'
            });
        }

        if (users.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'users array cannot be empty'
            });
        }

        const result = await presenceManager.setMultipleUsersOnline(users);

        res.status(200).json({
            success: true,
            message: `${result.success} users marked as online`,
            result
        });
    } catch (error) {
        console.error('Error setting multiple users online:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to set users online',
            error: error.message
        });
    }
};

/**
 * Manually set user offline (optional - usually done via socket)
 * DELETE /api/presence/online/:userId
 */
exports.setUserOffline = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'userId is required'
            });
        }

        await presenceManager.setUserOffline(userId);

        res.status(200).json({
            success: true,
            message: `User ${userId} marked as offline`,
            userId
        });
    } catch (error) {
        console.error('Error setting user offline:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to set user offline',
            error: error.message
        });
    }
};

/**
 * Set multiple users offline
 * DELETE /api/presence/online/bulk
 * Body: { userIds: ["user1", "user2", "user3"] }
 */
exports.setMultipleUsersOffline = async (req, res) => {
    try {
        const { userIds } = req.body;

        if (!Array.isArray(userIds)) {
            return res.status(400).json({
                success: false,
                message: 'userIds must be an array'
            });
        }

        if (userIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'userIds array cannot be empty'
            });
        }

        const result = await presenceManager.setMultipleUsersOffline(userIds);

        res.status(200).json({
            success: true,
            message: `${result.success} users marked as offline`,
            result
        });
    } catch (error) {
        console.error('Error setting multiple users offline:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to set users offline',
            error: error.message
        });
    }
};

/**
 * Update heartbeat for a user
 * POST /api/presence/heartbeat/:userId
 * Body: { expireTime: 3600 }
 */
exports.updateHeartbeat = async (req, res) => {
    try {
        const { userId } = req.params;
        const { expireTime } = req.body;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'userId is required'
            });
        }

        const updated = await presenceManager.updateHeartbeat(userId, expireTime);

        if (!updated) {
            return res.status(404).json({
                success: false,
                message: 'User presence not found'
            });
        }

        res.status(200).json({
            success: true,
            message: `Heartbeat updated for user ${userId}`,
            userId
        });
    } catch (error) {
        console.error('Error updating heartbeat:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update heartbeat',
            error: error.message
        });
    }
};

/**
 * Update heartbeat for multiple users
 * POST /api/presence/heartbeat/bulk
 * Body: { userIds: ["user1", "user2"], expireTime: 3600 }
 */
exports.updateMultipleHeartbeats = async (req, res) => {
    try {
        const { userIds, expireTime } = req.body;

        if (!Array.isArray(userIds)) {
            return res.status(400).json({
                success: false,
                message: 'userIds must be an array'
            });
        }

        if (userIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'userIds array cannot be empty'
            });
        }

        const result = await presenceManager.updateMultipleHeartbeats(userIds, expireTime);

        res.status(200).json({
            success: true,
            message: `Heartbeat updated for ${result.success} users`,
            result
        });
    } catch (error) {
        console.error('Error updating multiple heartbeats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update heartbeats',
            error: error.message
        });
    }
};

/**
 * Clean up expired users
 * POST /api/presence/cleanup
 */
exports.cleanupExpiredUsers = async (req, res) => {
    try {
        await presenceManager.cleanUp();

        res.status(200).json({
            success: true,
            message: 'Cleanup completed successfully'
        });
    } catch (error) {
        console.error('Error cleaning up expired users:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to cleanup expired users',
            error: error.message
        });
    }
};