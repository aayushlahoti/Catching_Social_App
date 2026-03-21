const redisClientWrapper = require('../Redis/client.js');
// Access the raw redis client from the wrapper dynamically to ensure it's connected


const activeUsers = new Map();

const generateRoomId = (userId1, userId2) => {
    return [userId1, userId2].sort().join('_');
};

async function canChat(userId1, userId2) {
    const client = redisClientWrapper.getClient();
    if (!client) return false;
    // mutual match is represented as membership in both users' sets
    const [a, b] = await Promise.all([
        client.sIsMember(`matches:${userId1}`, String(userId2)),
        client.sIsMember(`matches:${userId2}`, String(userId1))
    ]);
    return Boolean(a) && Boolean(b);
}

exports.initializeChat = async (io, socket, userId) => {
    try {
        activeUsers.set(userId, socket.id);
        socket.userId = userId;

        socket.join(`user_${userId}`);
        console.log(`User ${userId} initialized and connected.`);

        // FIX: The pattern was slightly off. Using * matches the suffix.
        const chatKeys = await redisClientWrapper.getClient().keys(`chat_*${userId}*`);
        const activeChats = [];

        for (const key of chatKeys) {
            const messages = await redisClientWrapper.getClient().lRange(key, 0, -1);
            // key format is chat_user1_user2
            const roomId = key.replace('chat_', '');
            const [user1, user2] = roomId.split('_');
            const otherUserId = user1 === userId ? user2 : user1;

            activeChats.push({
                roomId: roomId,
                otherUser: otherUserId,
                messages: messages.map(msg => JSON.parse(msg))
            });
        }

        socket.emit('activeChats', activeChats);

    } catch (error) {
        console.error('Error in initializeChat:', error);
        socket.emit('error', 'Failed to initialize chat');
    }
};

exports.sendMessage = async (io, socket, data) => {
    try {
        const { receiverId, message } = data;
        const senderId = socket.userId;

        if (!receiverId || !message || !senderId) {
            return socket.emit('error', 'Invalid message data');
        }

        const allowed = await canChat(String(senderId), String(receiverId));
        if (!allowed) {
            return socket.emit('error', 'Chat not allowed until request is accepted');
        }

        const roomId = generateRoomId(senderId, receiverId);
        const chatKey = `chat_${roomId}`; // REMOVED THE SPACE

        const messageData = {
            id: Date.now(),
            senderId,
            receiverId,
            message: message.trim(),
            timestamp: new Date().toISOString(),
            status: 'sent'
        };

        // Store in Redis
        await redisClientWrapper.getClient().rPush(chatKey, JSON.stringify(messageData));
        // Ephemeral: keep short TTL; disconnect cleanup will wipe immediately
        await redisClientWrapper.getClient().expire(chatKey, 60 * 60);

        const receiverSocketId = activeUsers.get(receiverId);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit('new_message', messageData);
            messageData.status = 'delivered';
        }

        socket.emit('message_sent', messageData);

    } catch (error) {
        console.error('Error in sendMessage:', error);
        socket.emit('error', 'Failed to send message');
    }
};

exports.handleTyping = async (socket, data) => {
    try {
        const senderId = socket.userId;
        const { receiverId, isTyping = true } = data || {};
        if (!senderId || !receiverId) return;
        socket.to(`user_${receiverId}`).emit('typing', { senderId, isTyping: Boolean(isTyping) });
    } catch (error) {
        console.error('Error in handleTyping:', error);
    }
};

exports.handleMessageReceived = async (socket, data) => {
    try {
        const receiverId = socket.userId;
        const { senderId, messageId } = data || {};
        if (!receiverId || !senderId || !messageId) return;
        socket.to(`user_${senderId}`).emit('message_status', { messageId, status: 'read' });
    } catch (error) {
        console.error('Error in handleMessageReceived:', error);
    }
};

exports.getChatHistory = async (socket, data) => {
    try {
        const userId = socket.userId;
        const { otherUserId } = data || {};
        if (!userId || !otherUserId) return socket.emit('chat_history', []);
        const roomId = generateRoomId(String(userId), String(otherUserId));
        const chatKey = `chat_${roomId}`;
        const messages = await redisClientWrapper.getClient().lRange(chatKey, 0, -1);
        socket.emit('chat_history', messages.map(m => JSON.parse(m)));
    } catch (error) {
        console.error('Error in getChatHistory:', error);
        socket.emit('chat_history', []);
    }
};

exports.handleDisconnect = async (io, socket) => {
    try {
        const userId = socket.userId;
        if (!userId) return;

        activeUsers.delete(userId);
        console.log(`User ${userId} disconnected`);

        // Requirement: when either participant goes offline, wipe the chat immediately (no history).
        const client = redisClientWrapper.getClient();
        if (!client) return;

        const chatKeys = await client.keys(`chat_*${userId}*`);
        for (const key of chatKeys) {
            const roomId = key.replace('chat_', '');
            const [user1, user2] = roomId.split('_');
            const otherUserId = String(user1) === String(userId) ? user2 : user1;

            await client.del(key);
            io.to(`user_${otherUserId}`).emit('chat_deleted', { roomId, reason: 'participant_offline' });
            console.log(`Chat room ${key} deleted because ${userId} went offline.`);
        }
    } catch (error) {
        console.error('Error in handleDisconnect:', error);
    }
};