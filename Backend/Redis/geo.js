// Live geolocation storage/query via Redis GEO* commands
const redisClient = require('./client.js');

// Redis GEO key (stored as a sorted set internally)
const GEO_KEY = 'geo:online_users';

function hasNumber(v) {
    return typeof v === 'number' && Number.isFinite(v);
}

async function saveUserLocation(userId, latitude, longitude) {
    if (!userId) return;
    if (!hasNumber(latitude) || !hasNumber(longitude)) return;

    const client = redisClient.getClient();
    if (!client) return;

    await client.geoAdd(GEO_KEY, {
        longitude,
        latitude,
        member: String(userId)
    });
}

// Returns: [{ userId, distanceKm, coords: { lat, lng } }]
async function getNearbyUsers(latitude, longitude, radiusKm = 3) {
    if (!hasNumber(latitude) || !hasNumber(longitude)) return [];

    const client = redisClient.getClient();
    if (!client) return [];

    const result = await client.geoSearchWith(GEO_KEY, {
        longitude,
        latitude
    }, {
        radius: radiusKm,
        unit: 'km'
    }, [
        'DIST',
        'COORD'
    ]);

    // result: [ { member, distance, coordinates: { latitude, longitude } }, ... ]
    if (!Array.isArray(result)) return [];

    return result.map(u => ({
        userId: String(u.member),
        distanceKm: Number(u.distance),
        coords: {
            lat: Number(u.coordinates.latitude),
            lng: Number(u.coordinates.longitude)
        }
    }));
}

// Removing when users are offline
async function removeUser(userId) {
    if (!userId) return;
    const client = redisClient.getClient();
    if (!client) return;
    await client.zRem(GEO_KEY, String(userId));
}

module.exports = { saveUserLocation, getNearbyUsers, removeUser };