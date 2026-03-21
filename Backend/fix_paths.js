const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const User = require('./Models/user.js');

async function fixPaths() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const users = await User.find({ 'profileImage.path': { $exists: true, $ne: null } });
        console.log(`Found ${users.length} users with profile images`);

        for (const user of users) {
            const oldPath = user.profileImage.path;
            const newPath = oldPath.replace(/\\/g, '/');
            if (oldPath !== newPath) {
                user.profileImage.path = newPath;
                await user.save();
                console.log(`Fixed path for user ${user.username}: ${oldPath} -> ${newPath}`);
            }
        }

        console.log('Finished fixing paths');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

fixPaths();
