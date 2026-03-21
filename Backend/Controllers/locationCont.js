const User = require('../Models/user.js');
const { saveUserLocation, getNearbyUsers, removeUser } = require('../Redis/geo.js');
const { isConnected } = require('../Database/db.js');


function toPublicPath(p) {
    if (!p) return null;
    return `/${String(p).replace(/\\/g, '/')}`;
}

function hasNumber(v) {
    return typeof v === 'number' && Number.isFinite(v);
}

// Handles live location updates, returns nearby users enriched with profile data.
async function handleLocationUpdate({ userId, latitude, longitude, radiusKm = 10 }) {
    if (!isConnected()) {
        console.error('Database connection is not established. Location update profile enrichment will be skipped.');
        // For location updates, we might still want to save to Redis, but profile data will be missing.
        // However, the caller usually expects enriched data.
        return []; 
    }
    try {

        if (!userId) return null;
        if (!hasNumber(latitude) || !hasNumber(longitude)) return null;

        await saveUserLocation(userId, latitude, longitude);

        // Also persistent location in MongoDB
        await User.findByIdAndUpdate(userId, {
            location: {
                type: 'Point',
                coordinates: [longitude, latitude]
            }
        });

        const nearby = await getNearbyUsers(latitude, longitude, radiusKm);
        if (!Array.isArray(nearby) || nearby.length === 0) return [];

        const otherIds = nearby
            .map(u => u.userId)
            .filter(id => id && String(id) !== String(userId));

        if (otherIds.length === 0) return [];

        const users = await User.find({ _id: { $in: otherIds } })
            .select('username profileImage status age profesion gender')
            .lean();

        const byId = new Map(users.map(u => [String(u._id), u]));

        return nearby
            .filter(u => String(u.userId) !== String(userId))
            .map(u => {
                const dbUser = byId.get(String(u.userId));
                if (!dbUser) return null;
                return {
                    id: String(dbUser._id),
                    name: dbUser.username,
                    avatarUrl: toPublicPath(dbUser.profileImage?.path),
                    status: dbUser.status,
                    age: dbUser.age,
                    gender: dbUser.gender,
                    profession: dbUser.profesion,
                    coords: u.coords,
                    distanceKm: u.distanceKm
                };
            })
            .filter(Boolean);
    } catch (error) {
        console.error('location error: ', error);
        return null;
    }
}

async function handleUserDisconnect(userId) {
    try {
        if (!userId) return;
        await removeUser(userId);
    } catch (error) {
        console.error('removal error: ', error);
    }
}

module.exports = {
    handleLocationUpdate,
    handleUserDisconnect
};

