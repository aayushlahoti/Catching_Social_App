const jwt = require('jsonwebtoken');
require('dotenv').config();
const redisClient = require('../Redis/client.js')

const User = require('../Models/user.js');


//helper function to generate JWT token
const generateToken = (payload, expiresIn = process.env.JWT_EXPIRES_IN) => {
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
};

//jwt token authentication middleware
exports.authMiddleware = async (req, res, next) => {
    try {
        let token = null;

        // Check for token in Authorization header
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith("Bearer ")) {
            token = authHeader.substring(7, authHeader.length);
        }

        //Fall back to cookies if no token found yet
        if (!token && req.cookies && req.cookies.token) {
            token = req.cookies.token;
        }


        if (!token) {
            return res.status(401).json({
                success: false,
                message: "No token provided, authorization denied"
            });
        }

        //check if token is in redis 
        //checking for blacklisted tokens 
        const isBlacklisted = await redisClient.get(`blacklisted: ${token}`);
        if (isBlacklisted) {
            return res.status(401).json({
                success: false,
                message: 'session expired, please log in again'
            });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // Attach decoded token data to request 
        req.user = decoded;
        req.token = token;

        next();

    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: "Token has expired, please log in again",
                error: 'TOKEN_EXPIRED'
            });
        }

        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: "Invalid token, authorization denied",
                error: 'INVALID_TOKEN'
            });
        }

        return res.status(500).json({
            success: false,
            message: "server error",
            error: error.message
        });

    }
};


//ensuring if the user is authenticated before accessing protected routes  
exports.requireAuth = async (req, res, next) => {
    if (!req.user || !req.user.userId) {
        return res.status(401).json({
            success: false,
            message: "authentication required, please log in.."
        });
    }
    next();
};

//add user details and metadata to request object
exports.enrichRequestWithUser = async (req, res, next) => {
    try {
        //Add request metadata
        req.metadata = {
            ip: req.ip || req.connection.remoteAddress,
            userAgent: req.headers['user-agent'] || 'unknown',
            method: req.method,
            path: req.path
        };

        //if user is authenticated, fetch user details
        if (req.user && req.user.userId) {
            req.userContext = {
                id: req.user.userId,
                username: req.user.username,
            };
        }
        next();
    } catch (error) {
        console.error("server request failed", error);
        next(error);
    };

};

//export the helper
exports.generateToken = generateToken;




//finding if user is in the database already
// Removed broken top-level code
