const app = require("./app.js");
const http = require("http");
require("dotenv").config();
const { Server } = require("socket.io");
const redisClient = require("./Redis/client.js");
const presenceManager = require("./Redis/presence.js");
const { connectDB } = require("./Database/db.js");
const OnlineUsersTracker = require("./sockets/onlineUsers.js");
const likeController = require("./Controllers/likeCont.js");
const locationController = require("./Controllers/locationCont.js");
const locationSocket = require("./sockets/locationSocket.js");
const chatController = require("./Controllers/chatCont.js");
const chatSocket = require("./sockets/chatSocket.js");
const requestController = require("./Controllers/requestCont.js");


//connecting to database
connectDB();

const PORT = process.env.PORT || 8000;

const server = http.createServer(app);

// Socket.io initialization
const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:5173',
        methods: ["GET", "POST"],
    }
});



const socketAuth = require('./middleware/socketAuth.js');
io.use(socketAuth);

//initialize like controller with socket.io 
likeController.initialize(io);
// initialize request controller with socket.io
requestController.initialize(io);
//attatchin the locationSocket with socket.io 
locationSocket(io);
// Initialize chat socket
chatSocket(io);


// Initialize online users tracker
const onlineUsersTracker = new OnlineUsersTracker(io);
onlineUsersTracker.initialize();

const startServer = async () => {
    try {
        await redisClient.connect();

        setInterval(async () => {
            try {
                await presenceManager.cleanUp();
                console.log('🧹 Cleaned up expired users');
            } catch (error) {
                console.error('error in cleanup..', error);
            }
        }, 60 * 60 * 1000); // Run cleanup every hour

        server.on('error', (error) => {
            if (error.code === 'EADDRINUSE') {
                console.error(`❌ Port ${PORT} is already in use. Please ensure no other instance is running.`);
                process.exit(1);
            } else {
                console.error("Server error:", error);
                process.exit(1);
            }
        });

        const HOST = '0.0.0.0'; // Listen on all network interfaces
        server.listen(PORT, HOST, () => {
            const os = require('os');
            const networkInterfaces = os.networkInterfaces();
            let localIP = 'localhost';
            
            // Find local network IP
            for (const name of Object.keys(networkInterfaces)) {
                for (const iface of networkInterfaces[name]) {
                    // Skip internal and non-IPv4 addresses
                    if (iface.family === 'IPv4' && !iface.internal) {
                        localIP = iface.address;
                        break;
                    }
                }
                if (localIP !== 'localhost') break;
            }
            
            console.log(`🚀 Server started on port ${PORT}`);
            console.log(`   Local: http://localhost:${PORT}`);
            console.log(`   Network: http://${localIP}:${PORT}`);
        });
    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
};

startServer();

//graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 healthy shutdown.. no data loss');
    try {
        await redisClient.disconnect();
        console.log('✅ Redis disconnected');
        process.exit(0);
    } catch (error) {
        console.error('Error during shutdown:', error);
        process.exit(1);
    }
});

//handle unhandled proise rejections 
process.on('unhandledRejection', (err) => {
    console.error("unhandled Rejections", err);
    process.exit(1);
});

//handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error("Uncaught Exception:", err);
    process.exit(1);
});

