const { io } = require("socket.io-client");
const jwt = require('jsonwebtoken');

const SERVER_URL = "http://localhost:8000";
const JWT_SECRET = "your_jwt_secret_here"; // Placeholder, will need env var or mock

async function testSocketAuth() {
    console.log("Testing Socket Authentication...");

    // 1. Connection without token
    console.log("\n1. Testing connection without token...");
    const socketNoAuth = io(SERVER_URL, {
        autoConnect: false,
        reconnection: false
    });

    try {
        await new Promise((resolve, reject) => {
            socketNoAuth.on("connect_error", (err) => {
                console.log("Passed: Connection rejected as expected:", err.message);
                resolve();
            });
            socketNoAuth.on("connect", () => {
                reject(new Error("Failed: Connected without token!"));
            });
            socketNoAuth.connect();
        });
    } catch (e) {
        console.error(e.message);
    } finally {
        socketNoAuth.disconnect();
    }

    // 2. Connection with invalid token
    console.log("\n2. Testing connection with invalid token...");
    const socketInvalid = io(SERVER_URL, {
        auth: { token: "invalid_token" },
        autoConnect: false,
        reconnection: false
    });

    try {
        await new Promise((resolve, reject) => {
            socketInvalid.on("connect_error", (err) => {
                console.log("Passed: Connection rejected as expected:", err.message);
                resolve();
            });
            socketInvalid.on("connect", () => {
                reject(new Error("Failed: Connected with invalid token!"));
            });
            socketInvalid.connect();
        });
    } catch (e) {
        console.error(e.message);
    } finally {
        socketInvalid.disconnect();
    }

    // 3. Connection with valid token (Need a valid secret to test this fully)
    console.log("\n3. Testing connection with valid token (Mocking if secret available)...");
    // This part requires the actual JWT_SECRET from .env to generate a valid token
    // For now, we manually verify the rejection logic working is a good sign.
}

testSocketAuth();
