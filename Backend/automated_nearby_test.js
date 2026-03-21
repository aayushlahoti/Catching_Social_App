const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const User = require('./Models/user.js');
const redisClient = require('./Redis/client.js');
const { handleLocationUpdate } = require('./Controllers/locationCont.js');

async function runControllerTest() {
    try {
        console.log('--- STARTING AUTOMATED CONTROLLER TEST (NEARBY USERS) ---');
        
        // 1. Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // 2. Connect to Redis
        await redisClient.connect();
        console.log('✅ Connected to Redis');

        // 3. Clear existing geo data for a clean test
        const client = redisClient.getClient();
        await client.del('geo:online_users');
        console.log('✅ Cleared existing geo data');

        // 4. Create/Find Test Users
        console.log('Creating/Updating test users in MongoDB...');
        
        // Ensure test_main exists
        const mainUser = await User.findOneAndUpdate(
            { username: 'test_main' },
            { username: 'test_main', password: 'password123' },
            { upsert: true, new: true }
        );

        // Ensure test_nearby exists (should be found)
        const nearbyUser = await User.findOneAndUpdate(
            { username: 'test_nearby' },
            { 
                username: 'test_nearby', 
                password: 'password123', 
                status: 'I am nearby!',
                profesion: 'Developer',
                age: 25,
                gender: 'other'
            },
            { upsert: true, new: true }
        );

        // Ensure test_far exists (should be excluded)
        const farUser = await User.findOneAndUpdate(
            { username: 'test_far' },
            { 
                username: 'test_far', 
                password: 'password123', 
                status: 'I am too far away',
                profesion: 'Explorer',
                age: 30,
                gender: 'male'
            },
            { upsert: true, new: true }
        );

        // 5. Setup Locations (Base: 28.6139, 77.2090)
        const baseLat = 28.6139;
        const baseLng = 77.2090;

        // Nearby User: ~3km away (within 10km radius)
        const nearLat = 28.6139 + 0.02;
        const nearLng = 77.2090 + 0.02;

        // Far User: ~50km away (outside 10km radius)
        const farLat = 28.6139 + 0.4;
        const farLng = 77.2090 + 0.4;

        console.log('Registering locations in Redis...');
        // We simulate these users being online and reporting their locations
        await handleLocationUpdate({ userId: nearbyUser._id, latitude: nearLat, longitude: nearLng });
        await handleLocationUpdate({ userId: farUser._id, latitude: farLat, longitude: farLng });

        // 6. Execute Search from Main User
        console.log(`Executing handleLocationUpdate for main user (radius: 10km)...`);
        const results = await handleLocationUpdate({
            userId: mainUser._id,
            latitude: baseLat,
            longitude: baseLng,
            radiusKm: 10
        });

        console.log('--- TEST RESULTS ---');
        console.log(`Nearby users returned: ${results.length}`);
        
        const foundNearby = results.find(u => u.name === 'test_nearby');
        const foundFar = results.find(u => u.name === 'test_far');

        let success = true;

        if (foundNearby) {
            console.log('✅ PASS: test_nearby found correctly.');
            console.log(`   Data: Name: ${foundNearby.name}, Dist: ${foundNearby.distanceKm.toFixed(2)}km, Status: ${foundNearby.status}`);
        } else {
            console.log('❌ FAIL: test_nearby NOT found.');
            success = false;
        }

        if (!foundFar) {
            console.log('✅ PASS: test_far correctly excluded.');
        } else {
            console.log('❌ FAIL: test_far was NOT excluded.');
            success = false;
        }

        if (success) {
            console.log('🎉 OVERALL TEST RESULT: PASS');
        } else {
            console.log('💀 OVERALL TEST RESULT: FAIL');
        }

        mongoose.disconnect();
        await redisClient.disconnect();
        process.exit(success ? 0 : 1);

    } catch (err) {
        console.error('❌ Unexpected error:', err);
        process.exit(1);
    }
}

runControllerTest();
