const jwt = require('jsonwebtoken');
const redisClient = require('../Redis/client.js');

const socketAuth = async (socket, next) => {
    try {
        // Extract token from handshake auth or query
        const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];

        if (!token) {
            return next(new Error('Authentication error: No token provided'));
        }

        // Check if token is blacklisted in Redis
        const isBlacklisted = await redisClient.get(`blacklisted: ${token}`);
        if (isBlacklisted) {
            return next(new Error('Authentication error: Session expired'));
        }

        // Verify JWT
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Attach user info to socket instance for easy access in handlers
        socket.user = decoded;
        socket.token = token;

        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return next(new Error('Authentication error: Token expired'));
        }
        return next(new Error('Authentication error: Invalid token'));
    }
};

module.exports = socketAuth;
