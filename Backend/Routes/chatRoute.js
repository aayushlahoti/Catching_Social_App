const express = require('express');
const router = express.Router();
const redisClientWrapper = require('../Redis/client.js');
const { authMiddleware } = require('../middleware/auth.js');

// Helper function to generate room ID
const generateRoomId = (userId1, userId2) => {
    return [userId1, userId2].sort().join('_');
};

// GET /api/chat/active - Get all active chats for a user
router.get('/active', authMiddleware, async (req, res) => {
    try {
        const userId = String(req.user.userId);

        const chatKeys = await redisClientWrapper.getClient().keys(`chat_*${userId}*`);
        const activeChats = [];

        for (const key of chatKeys) {
            const messages = await redisClientWrapper.getClient().lRange(key, 0, -1);
            const roomId = key.replace('chat_', '');
            const [user1, user2] = roomId.split('_');
            const otherUserId = user1 === userId ? user2 : user1;

            activeChats.push({
                roomId: roomId,
                otherUser: otherUserId,
                messageCount: messages.length,
                lastMessage: messages.length > 0 ? JSON.parse(messages[messages.length - 1]) : null
            });
        }

        res.status(200).json({
            success: true,
            chats: activeChats
        });

    } catch (error) {
        console.error('Error fetching active chats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch active chats'
        });
    }
});

// GET /api/chat/history/:otherUserId - Get chat history with specific user
router.get('/history/:otherUserId', authMiddleware, async (req, res) => {
    try {
        const userId = String(req.user.userId);
        const { otherUserId } = req.params;

        if (!otherUserId) {
            return res.status(400).json({
                success: false,
                message: 'Other user ID is required'
            });
        }

        const roomId = generateRoomId(userId, otherUserId);
        const chatKey = `chat_${roomId}`;

        const messages = await redisClientWrapper.getClient().lRange(chatKey, 0, -1);
        const parsedMessages = messages.map(msg => JSON.parse(msg));

        res.status(200).json({
            success: true,
            roomId,
            otherUserId,
            messages: parsedMessages
        });

    } catch (error) {
        console.error('Error fetching chat history:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch chat history'
        });
    }
});

// GET /api/chat/history/:otherUserId/recent - Get recent messages (last N messages)
router.get('/history/:otherUserId/recent', authMiddleware, async (req, res) => {
    try {
        const userId = String(req.user.userId);
        const { otherUserId } = req.params;
        const limit = parseInt(req.query.limit) || 50;

        if (!otherUserId) {
            return res.status(400).json({
                success: false,
                message: 'Other user ID is required'
            });
        }

        const roomId = generateRoomId(userId, otherUserId);
        const chatKey = `chat_${roomId}`;

        // Get last N messages
        const messages = await redisClientWrapper.getClient().lRange(chatKey, -limit, -1);
        const parsedMessages = messages.map(msg => JSON.parse(msg));

        res.status(200).json({
            success: true,
            roomId,
            otherUserId,
            messages: parsedMessages
        });

    } catch (error) {
        console.error('Error fetching recent messages:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch recent messages'
        });
    }
});

// DELETE /api/chat/:otherUserId - Delete chat with specific user
router.delete('/:otherUserId', authMiddleware, async (req, res) => {
    try {
        const userId = String(req.user.userId);
        const { otherUserId } = req.params;

        if (!otherUserId) {
            return res.status(400).json({
                success: false,
                message: 'Other user ID is required'
            });
        }

        const roomId = generateRoomId(userId, otherUserId);
        const chatKey = `chat_${roomId}`;

        const result = await redisClientWrapper.getClient().del(chatKey);

        if (result === 0) {
            return res.status(404).json({
                success: false,
                message: 'Chat not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Chat deleted successfully',
            roomId
        });

    } catch (error) {
        console.error('Error deleting chat:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete chat'
        });
    }
});

// GET /api/chat/exists/:otherUserId - Check if chat exists with user
router.get('/exists/:otherUserId', authMiddleware, async (req, res) => {
    try {
        const userId = String(req.user.userId);
        const { otherUserId } = req.params;

        if (!otherUserId) {
            return res.status(400).json({
                success: false,
                message: 'Other user ID is required'
            });
        }

        const roomId = generateRoomId(userId, otherUserId);
        const chatKey = `chat_${roomId}`;

        const exists = await redisClientWrapper.getClient().exists(chatKey);

        res.status(200).json({
            success: true,
            exists: exists === 1,
            roomId
        });

    } catch (error) {
        console.error('Error checking chat existence:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check chat existence'
        });
    }
});

// GET /api/chat/count/:otherUserId - Get message count with specific user
router.get('/count/:otherUserId', authMiddleware, async (req, res) => {
    try {
        const userId = String(req.user.userId);
        const { otherUserId } = req.params;

        if (!otherUserId) {
            return res.status(400).json({
                success: false,
                message: 'Other user ID is required'
            });
        }

        const roomId = generateRoomId(userId, otherUserId);
        const chatKey = `chat_${roomId}`;

        const count = await redisClientWrapper.getClient().lLen(chatKey);

        res.status(200).json({
            success: true,
            roomId,
            messageCount: count
        });

    } catch (error) {
        console.error('Error getting message count:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get message count'
        });
    }
});

module.exports = router;