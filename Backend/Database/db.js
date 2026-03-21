const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGO_URI;
        
        if (!mongoURI || mongoURI.includes('your_mongodb_uri_here')) {
            console.error("\n❌ ERROR: MONGO_URI is not defined in .env file.");
            console.error("Please update the .env file with your MongoDB connection string.");
            console.log("Server will start, but database-dependent features will fail.\n");
            return;
        }

        await mongoose.connect(mongoURI);
        console.log("your Database is successfully connected..");
    } catch (error) {
        console.error("❌ Can't connect to database:", error.message);
    }
};

module.exports = {
    connectDB,
    isConnected: () => mongoose.connection.readyState === 1
};