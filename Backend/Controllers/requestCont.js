const User = require('../Models/user.js');
const redisClientWrapper = require('../Redis/client.js');
const { isConnected } = require('../Database/db.js');


let io = null;

exports.initialize = (socketIo) => {
    io = socketIo;
};

function requireClient() {
    const client = redisClientWrapper.getClient();
    if (!client) throw new Error('Redis not connected');
    return client;
}

function roomForUser(userId) {
    return `user_${userId}`;
}

async function publicUserSnapshot(userId) {
    if (!isConnected()) return { id: userId, username: 'User', avatarUrl: null };
    const user = await User.findById(userId).select('username profileImage').lean();

    if (!user) return null;
    const avatarUrl = user.profileImage?.path ? `/${String(user.profileImage.path).replace(/\\/g, '/')}` : null;
    return { id: String(user._id), username: user.username, avatarUrl };
}

exports.sendRequest = async (req, res) => {
    try {
        if (!isConnected()) {
            return res.status(503).json({
                success: false,
                message: "Database connection is not established. Please check your MONGO_URI in the .env file."
            });
        }
        const fromUserId = String(req.user.userId);

        const { targetUserId } = req.body;
        const toUserId = String(targetUserId || '');

        if (!toUserId) {
            return res.status(400).json({ success: false, message: 'targetUserId is required' });
        }
        if (toUserId === fromUserId) {
            return res.status(400).json({ success: false, message: 'You cannot request yourself' });
        }

        const client = requireClient();

        const requestKey = `request:${fromUserId}:${toUserId}`;
        const existing = await client.exists(requestKey);
        if (existing) {
            return res.status(400).json({ success: false, message: 'Request already sent' });
        }

        // If other side already requested you, accept instantly (mutual)
        const reverseKey = `request:${toUserId}:${fromUserId}`;
        const reverseExists = await client.exists(reverseKey);
        if (reverseExists) {
            await client.del(reverseKey);
            await Promise.all([
                client.sRem(`requests:in:${fromUserId}`, toUserId),
                client.sRem(`requests:out:${toUserId}`, fromUserId),
            ]);

            await Promise.all([
                client.sAdd(`matches:${fromUserId}`, toUserId),
                client.sAdd(`matches:${toUserId}`, fromUserId),
            ]);

            if (io) {
                io.to(roomForUser(fromUserId)).emit('request_accepted', { byUserId: toUserId });
                io.to(roomForUser(toUserId)).emit('request_accepted', { byUserId: fromUserId });
            }

            return res.status(200).json({ success: true, message: 'Matched (mutual request)' });
        }

        await client.setEx(requestKey, 24 * 60 * 60, '1');
        await Promise.all([
            client.sAdd(`requests:in:${toUserId}`, fromUserId),
            client.sAdd(`requests:out:${fromUserId}`, toUserId),
        ]);

        if (io) {
            const fromSnap = await publicUserSnapshot(fromUserId);
            io.to(roomForUser(toUserId)).emit('request_received', { from: fromSnap });
        }

        return res.status(200).json({ success: true, message: 'Request sent' });
    } catch (error) {
        console.error('sendRequest error', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

exports.acceptRequest = async (req, res) => {
    try {
        const toUserId = String(req.user.userId);
        const { fromUserId } = req.body;
        const fromId = String(fromUserId || '');

        if (!fromId) {
            return res.status(400).json({ success: false, message: 'fromUserId is required' });
        }

        const client = requireClient();
        const requestKey = `request:${fromId}:${toUserId}`;
        const exists = await client.exists(requestKey);
        if (!exists) {
            return res.status(404).json({ success: false, message: 'Request not found' });
        }

        await client.del(requestKey);
        await Promise.all([
            client.sRem(`requests:in:${toUserId}`, fromId),
            client.sRem(`requests:out:${fromId}`, toUserId),
        ]);

        await Promise.all([
            client.sAdd(`matches:${toUserId}`, fromId),
            client.sAdd(`matches:${fromId}`, toUserId),
        ]);

        if (io) {
            io.to(roomForUser(toUserId)).emit('request_accepted', { byUserId: fromId });
            io.to(roomForUser(fromId)).emit('request_accepted', { byUserId: toUserId });
        }

        return res.status(200).json({ success: true, message: 'Request accepted' });
    } catch (error) {
        console.error('acceptRequest error', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

exports.declineRequest = async (req, res) => {
    try {
        const toUserId = String(req.user.userId);
        const { fromUserId } = req.body;
        const fromId = String(fromUserId || '');

        if (!fromId) {
            return res.status(400).json({ success: false, message: 'fromUserId is required' });
        }

        const client = requireClient();
        const requestKey = `request:${fromId}:${toUserId}`;
        await client.del(requestKey);
        await Promise.all([
            client.sRem(`requests:in:${toUserId}`, fromId),
            client.sRem(`requests:out:${fromId}`, toUserId),
        ]);

        return res.status(200).json({ success: true, message: 'Request declined' });
    } catch (error) {
        console.error('declineRequest error', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

exports.listIncoming = async (req, res) => {
    try {
        if (!isConnected()) {
            return res.status(503).json({
                success: false,
                message: "Database connection is not established. Please check your MONGO_URI in the .env file."
            });
        }
        const userId = String(req.user.userId);

        const client = requireClient();
        const fromIds = await client.sMembers(`requests:in:${userId}`);
        const users = await Promise.all(fromIds.map(id => publicUserSnapshot(id)));
        return res.status(200).json({ success: true, data: { requests: users.filter(Boolean) } });
    } catch (error) {
        console.error('listIncoming error', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

exports.listMatches = async (req, res) => {
    try {
        if (!isConnected()) {
            return res.status(503).json({
                success: false,
                message: "Database connection is not established. Please check your MONGO_URI in the .env file."
            });
        }
        const userId = String(req.user.userId);

        const client = requireClient();
        const matchIds = await client.sMembers(`matches:${userId}`);
        const users = await Promise.all(matchIds.map(id => publicUserSnapshot(id)));
        return res.status(200).json({ success: true, data: { matches: users.filter(Boolean) } });
    } catch (error) {
        console.error('listMatches error', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

