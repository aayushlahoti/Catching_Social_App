const express = require('express');
const router = express.Router();
const presenceController = require('../Controllers/presenceCont.js');
// const { protect } = require('../middleware/authMiddleware'); // Uncomment if you have auth

// ===============================
// GET Routes - Query presence data
// ===============================

/**
 * Get all online users
 * GET /api/presence/online
 */
router.get('/online', presenceController.getOnlineUsers);

/**
 * Get online users count
 * GET /api/presence/online/count
 */
router.get('/online/count', presenceController.getOnlineUsersCount);

/**
 * Check if specific user is online
 * GET /api/presence/online/:userId
 */
router.get('/online/:userId', presenceController.checkUserOnline);

/**
 * Get user presence data
 * GET /api/presence/user/:userId
 */
router.get('/user/:userId', presenceController.getUserPresence);

// ===============================
// POST Routes - Query multiple & updates
// ===============================

/**
 * Get presence for multiple users
 * POST /api/presence/bulk
 * Body: { userIds: ["user1", "user2", "user3"] }
 */
router.post('/bulk', presenceController.getUsersPresence);

/**
 * Check online status for multiple users
 * POST /api/presence/check-multiple
 * Body: { userIds: ["user1", "user2", "user3"] }
 */
router.post('/check-multiple', presenceController.checkMultipleUsersOnline);

/**
 * Manually set user online (optional - usually done via socket)
 * POST /api/presence/online/:userId
 * Body: { metadata: { device: "mobile" }, expireTime: 3600 }
 */
router.post('/online/:userId', presenceController.setUserOnline);

/**
 * Set multiple users online
 * POST /api/presence/online/bulk
 * Body: { users: [{ userId: "user1", metadata: {...} }] }
 */
router.post('/online/bulk', presenceController.setMultipleUsersOnline);

/**
 * Update heartbeat for a user
 * POST /api/presence/heartbeat/:userId
 * Body: { expireTime: 3600 }
 */
router.post('/heartbeat/:userId', presenceController.updateHeartbeat);

/**
 * Update heartbeat for multiple users
 * POST /api/presence/heartbeat/bulk
 * Body: { userIds: ["user1", "user2"], expireTime: 3600 }
 */
router.post('/heartbeat/bulk', presenceController.updateMultipleHeartbeats);

/**
 * Clean up expired users (admin/maintenance endpoint)
 * POST /api/presence/cleanup
 */
router.post('/cleanup', presenceController.cleanupExpiredUsers);

// ===============================
// DELETE Routes - Remove presence
// ===============================

/**
 * Manually set user offline (optional - usually done via socket)
 * DELETE /api/presence/online/:userId
 */
router.delete('/online/:userId', presenceController.setUserOffline);

/**
 * Set multiple users offline
 * DELETE /api/presence/online/bulk
 * Body: { userIds: ["user1", "user2", "user3"] }
 */
router.delete('/online/bulk', presenceController.setMultipleUsersOffline);

module.exports = router;