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

    // GEOSEARCH key FROMLONLAT lon lat BYRADIUS radius km WITHDIST WITHCOORD ASC
    const result = await client.sendCommand([
        'GEOSEARCH',
        GEO_KEY,
        'FROMLONLAT',
        String(longitude),
        String(latitude),
        'BYRADIUS',
        String(radiusKm),
        'km',
        'WITHDIST',
        'WITHCOORD',
        'ASC'
    ]);

    // result: [ [member, dist, [lon, lat]], ... ]
    if (!Array.isArray(result)) return [];

    return result
        .map((row) => {
            if (!Array.isArray(row) || row.length < 3) return null;
            const member = row[0];
            const dist = row[1];
            const coord = row[2];
            if (!Array.isArray(coord) || coord.length < 2) return null;
            const lng = Number(coord[0]);
            const lat = Number(coord[1]);
            return {
                userId: String(member),
                distanceKm: Number(dist),
                coords: { lat, lng }
            };
        })
        .filter(Boolean);
}

// Removing when users are offline
async function removeUser(userId) {
    if (!userId) return;
    const client = redisClient.getClient();
    if (!client) return;
    await client.zRem(GEO_KEY, String(userId));
}

module.exports = { saveUserLocation, getNearbyUsers, removeUser };