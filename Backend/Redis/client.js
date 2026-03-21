//one time for the online presence of the user 
require('dotenv').config();
const redis = require('redis');


class RedisClient {
    constructor() {
        this.client = null;
        this.isConnected = false;
    }

    async connect(config = {}) {
        try {
            const redisOptions = {
                socket: {
                    reconnectStrategy: (retries) => {
                        if (retries > 3) {
                            console.error('Redis: Max retries reached. Continuing without Redis.');
                            return false;
                        }
                        return Math.min(retries * 50, 500);
                    }
                }
            };

            // IMPORTANT: Use REDIS_URL if provided (Render includes this in environment)
            if (process.env.REDIS_URL && process.env.REDIS_URL.trim() !== '') {
                console.log('Connecting to Redis using REDIS_URL...');
                
                // Parse the connection URL provided by Render
                const url = new URL(process.env.REDIS_URL);
                
                redisOptions.socket = {
                    host: url.hostname,
                    port: parseInt(url.port) || 6379,
                    reconnectStrategy: (retries) => {
                        if (retries > 3) {
                            console.error('Redis: Max retries reached. Continuing without Redis.');
                            return false;
                        }
                        return Math.min(retries * 50, 500);
                    }
                };

                // Enable TLS if URL uses rediss:// protocol
                if (url.protocol === 'rediss:') {
                    redisOptions.socket.tls = true;
                    redisOptions.socket.rejectUnauthorized = false; // For Render's self-signed certificates
                }

                // Extract password from URL if present
                if (url.password) {
                    redisOptions.password = decodeURIComponent(url.password);
                }

                // Extract username if present (username support for newer Redis versions)
                if (url.username) {
                    redisOptions.username = decodeURIComponent(url.username);
                }

                this.client = redis.createClient(redisOptions);
                console.log(`Redis: Connecting to ${url.hostname}:${url.port}`);
                
            } else {
                // Fallback: Use individual environment variables (local development)
                console.log('Connecting to Redis using individual environment variables...');
                
                const host = process.env.REDIS_HOST || 'localhost';
                const port = parseInt(process.env.REDIS_PORT) || 6379;
                const password = process.env.REDIS_PASSWORD ? process.env.REDIS_PASSWORD.trim() : null;
                const db = parseInt(process.env.REDIS_DB) || 0;

                redisOptions.socket = {
                    host,
                    port,
                    reconnectStrategy: (retries) => {
                        if (retries > 3) {
                            console.error('Redis: Max retries reached. Continuing without Redis.');
                            return false;
                        }
                        return Math.min(retries * 50, 500);
                    }
                };

                // Enable TLS for Render connections
                if (process.env.NODE_ENV === 'production' && process.env.REDIS_TLS === 'true') {
                    redisOptions.socket.tls = true;
                    redisOptions.socket.rejectUnauthorized = false; // For Render's self-signed certificates
                }

                // Only set password if it exists and is not 'null' or 'undefined'
                if (password && password !== 'null' && password !== 'undefined') {
                    redisOptions.password = password;
                }

                // Set database number
                if (db > 0) {
                    redisOptions.database = db;
                }

                this.client = redis.createClient(redisOptions);
                console.log(`Redis: Connecting to ${host}:${port} (TLS: ${redisOptions.socket.tls === true})`);
            }

            this.client.on('error', (err) => {
                console.error('Redis connection error:', err.message);
                this.isConnected = false;
            });
            this.client.on('connect', () => {
                console.log('Redis client connected');
                this.isConnected = true;
            });
            this.client.on('ready', () => {
                console.log('Redis client ready');
            });

            await this.client.connect().catch(err => {
                console.error('Initial Redis connection failed. Continuing without Redis.');
            });
            return this.client;
        } catch (err) {
            console.error('Failed to initialize Redis client:', err);
            // Don't throw to allow server to start
        }
    }
    async disconnect() {
        if (this.client) {
            await this.client.quit();
            this.isConnected = false;
            console.log('Redis client disconnected');
        }
    }
    async set(key, value, expireSeconds = null) {
        try {
            if (!this.client || !this.isConnected) {
                throw new Error('Redis client is not connected');
            }
            if (expireSeconds) {
                await this.client.setEx(key, expireSeconds, JSON.stringify(value));
            } else {
                await this.client.set(key, JSON.stringify(value));
            }
            return true;
        } catch (err) {
            console.error('Error setting the key', err);
            throw err;
        }
    };
    async get(key) {
        try {
            if (!this.client || !this.isConnected) {
                // Return null or throw? Returning null might be safer for cache misses logic
                console.warn('Redis client not connected, returning null for get');
                return null;
            }
            const value = await this.client.get(key);
            return value ? JSON.parse(value) : null;
        } catch (err) {
            console.error('Error getting the key', err);
            throw err;
        }
    };
    async delete(key) {
        try {
            if (!this.client || !this.isConnected) {
                throw new Error('Redis client is not connected');
            }
            await this.client.del(key);
            return true;
        } catch (err) {
            console.error('Error deleting the key', err);
            throw err;
        }
    };
    async flushAll() {
        try {
            if (!this.client || !this.isConnected) {
                throw new Error('Redis client is not connected');
            }
            return await this.client.flushAll();
        } catch (error) {
            console.error('Error flushing the database', error);
            throw error;
        }
    };
    getClient() {
        return this.client;
    };
}
//creating the instance off the class RedisClient
const redisClient = new RedisClient();

module.exports = redisClient;

