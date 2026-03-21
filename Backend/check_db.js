const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const User = require('./Models/user.js');

async function checkUsers() {
    try {
        if (!process.env.MONGO_URI) {
            console.error('MONGO_URI not found in environment');
            process.exit(1);
        }
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const count = await User.countDocuments();
        console.log('Total users:', count);

        const usersWithLocation = await User.find({ location: { $exists: true, $ne: null } });
        console.log('Users with location:', usersWithLocation.length);

        usersWithLocation.forEach(u => {
            console.log(`User: ${u.username}, Location:`, u.location);
        });

        process.exit(0);
    } catch (err) {
        console.error('Error running checkUsers:', err);
        process.exit(1);
    }
}

checkUsers();
