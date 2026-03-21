const express = require('express');
const cookies = require('cookie-parser');
const userRoute = require('./Routes/userRoute.js');
const likeRoute = require('./Routes/likeRoute.js');
const postRoute = require('./Routes/postRoute.js');
const presenceRoute = require('./Routes/presenceRoute.js');
const locationRoute = require('./Routes/locationRouter.js');
const chatRoute = require('./Routes/chatRoute.js');
const requestRoute = require('./Routes/requestRoute.js');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

//middlewares
app.use(express.json());
app.use(cookies());
app.use(cors({
    origin: (origin, callback) => {
        const allowedOrigins = [process.env.CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'];
        if (!origin || allowedOrigins.includes(origin) || origin.startsWith('http://192.168.')) {
            callback(null, true);
        } else {
            callback(null, true); // Default allow for other local network variations
        }
    },
    credentials: true
}));

// Serve uploaded assets (profile pics / posts)
app.use('/picUploads', express.static(path.resolve(__dirname, '../picUploads')));

//routes
app.use('/api/users', userRoute);  //user routes
app.use('/api/likes', likeRoute);  //like routes
app.use('/api/posts', postRoute);  //post routes
app.use('/api/presence', presenceRoute);  //presence routes
app.use('/api/location', locationRoute);  //location routes
app.use('/api/chat', chatRoute); // chat routes
app.use('/api/requests', requestRoute); // requests + matches
//for demo only 
//this request will match request to the root route "/"
//this is the data being sent to the frontend from the backend 
app.get("/api/demo", (req, res) => {
    res.send("API is working...");
});

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../Frontend/dist')));
    app.get('*', (req, res) => {
        res.sendFile(path.resolve(__dirname, '../Frontend', 'dist', 'index.html'));
    });
} else {
    // Root route for backend health check in dev
    app.get("/", (req, res) => {
        res.send("Backend API is running...");
    });
}


//error handling middleware


module.exports = app;
