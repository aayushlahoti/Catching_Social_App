const Like = require('../Models/like.js');
const User = require('../Models/user.js');
const redisClient = require('../Redis/client.js');
const { isConnected } = require('../Database/db.js');


//store socket.io instance 
let io;

//initialize controller with socket.io
exports.initialize = (socketIo) => {
    io = socketIo;
};

//like a user's profile 
exports.likeProfile = async (req, res) => {
    const { userId, targetUserId, userName } = req.body;

    try {
        if (!isConnected()) {
            return res.status(503).json({
                success: false,
                message: "Database connection is not established. Please check your MONGO_URI in the .env file."
            });
        }
        //validation of fields
        if (!userId || !targetUserId) {

            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }

        if (userId === targetUserId) {
            return res.status(400).json({
                success: false,
                message: "You cannot like your own profile"
            });
        }

        //to check if already liked 
        const likeKey = `like:${userId}:${targetUserId}`;
        const isLiked = await redisClient.get(likeKey);
        if (isLiked) {
            return res.status(400).json({
                success: false,
                message: "You have already liked this profile"
            });
        }

        //storing the like expires after 24 hours 
        const likeData = {
            userId,
            targetUserId,
            userName: userName || 'Anonymous',
            likedAt: new Date().toISOString()
        };
        await redisClient.set(likeKey, likeData, 86400);

        //add to target user's "who liked me" list
        const targetLikesListKey = `user:${targetUserId}:likedBy`;
        let likedByList = await redisClient.get(targetLikesListKey) || [];

        //add liker info to the list
        likedByList.push({
            userId,
            userName: userName || 'Anonymous',
            likedAt: new Date().toISOString()
        });

        await redisClient.set(targetLikesListKey, likedByList, 30 * 24 * 60 * 60);

        //incrementing the target user's like count 
        const targetLikeKey = `likeCount:${targetUserId}`;
        let likeCount = await redisClient.get(targetLikeKey) || 0;
        likeCount = parseInt(likeCount) + 1;
        await redisClient.set(targetLikeKey, likeCount, 30 * 24 * 60 * 60);

        //add to user's "profiles I liked" list
        const userLikedListKey = `user:${userId}:liked`;
        let likedList = await redisClient.get(userLikedListKey) || [];

        likedList.push({
            userId: targetUserId,
            likedAt: new Date().toISOString()
        });

        await redisClient.set(userLikedListKey, likedList, 30 * 24 * 60 * 60);

        //send real time notification if user is online 
        if (io) {
            const onlineUserKey = 'onlineUsers';
            const onlineUsers = await redisClient.get(onlineUserKey) || {};

            //find the target user's socket Id 
            const targetUserSocket = Object.values(onlineUsers).find(
                user => user.userId === targetUserId
            );

            //send notif if target user is online only 
            if (targetUserSocket) {
                const notification = {
                    type: 'like',
                    from: {
                        userId,
                        userName: userName || 'Someone'
                    },
                    message: `${userName || 'Someone'} liked your profile`,
                    timestamp: new Date().toISOString()
                };
                io.to(targetUserSocket.socketId).emit('like_notification', notification);
                console.log(`Notification sent to user ${targetUserId}`);
            } else {
                console.log(`User ${targetUserId} is not online`);
            }
        }

        res.status(200).json({
            success: true,
            message: "Profile liked successfully",
            data: likeData
        });

    } catch (error) {
        console.error('Error liking the profile:', error);
        res.status(500).json({
            success: false,
            message: 'Error liking the profile',
            error: error.message
        });
    }
};

//get profiles who liked the user
exports.getWhoLikedMe = async (req, res) => {
    const { userId } = req.params;

    try {
        if (!isConnected()) {
            return res.status(503).json({
                success: false,
                message: "Database connection is not established. Please check your MONGO_URI in the .env file."
            });
        }
        if (!userId) {

            return res.status(400).json({
                success: false,
                message: "userId is required"
            });
        }

        //get the list of users who liked this profile
        const targetLikesListKey = `user:${userId}:likedBy`;
        const likedByList = await redisClient.get(targetLikesListKey) || [];

        //get the like count
        const targetLikeKey = `likeCount:${userId}`;
        const likeCount = await redisClient.get(targetLikeKey) || 0;

        res.status(200).json({
            success: true,
            data: {
                userId,
                totalLikes: parseInt(likeCount),
                likedBy: likedByList
            }
        });

    } catch (error) {
        console.error('Error getting who liked me:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching likes',
            error: error.message
        });
    }
};

//get profiles that the user has liked
exports.getProfilesILiked = async (req, res) => {
    const { userId } = req.params;

    try {
        if (!isConnected()) {
            return res.status(503).json({
                success: false,
                message: "Database connection is not established. Please check your MONGO_URI in the .env file."
            });
        }
        if (!userId) {

            return res.status(400).json({
                success: false,
                message: "userId is required"
            });
        }

        //get the list of profiles this user liked
        const userLikedListKey = `user:${userId}:liked`;
        const likedList = await redisClient.get(userLikedListKey) || [];

        res.status(200).json({
            success: true,
            data: {
                userId,
                totalLiked: likedList.length,
                likedProfiles: likedList
            }
        });

    } catch (error) {
        console.error('Error getting liked profiles:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching liked profiles',
            error: error.message
        });
    }
};

//check if user has already liked a profile
exports.checkLikeStatus = async (req, res) => {
    const { userId, targetUserId } = req.query;

    try {
        if (!isConnected()) {
            return res.status(503).json({
                success: false,
                message: "Database connection is not established. Please check your MONGO_URI in the .env file."
            });
        }
        if (!userId || !targetUserId) {

            return res.status(400).json({
                success: false,
                message: "userId and targetUserId are required"
            });
        }

        const likeKey = `like:${userId}:${targetUserId}`;
        const like = await redisClient.get(likeKey);

        res.status(200).json({
            success: true,
            data: {
                hasLiked: !!like,
                likeData: like || null
            }
        });

    } catch (error) {
        console.error('Error checking like status:', error);
        res.status(500).json({
            success: false,
            message: 'Error checking like status',
            error: error.message
        });
    }
};

//unlike a profile
exports.unlikeProfile = async (req, res) => {
    const { userId, targetUserId } = req.body;

    try {
        if (!isConnected()) {
            return res.status(503).json({
                success: false,
                message: "Database connection is not established. Please check your MONGO_URI in the .env file."
            });
        }
        if (!userId || !targetUserId) {

            return res.status(400).json({
                success: false,
                message: "userId and targetUserId are required"
            });
        }

        //check if like exists
        const likeKey = `like:${userId}:${targetUserId}`;
        const like = await redisClient.get(likeKey);

        if (!like) {
            return res.status(400).json({
                success: false,
                message: "You have not liked this profile"
            });
        }

        //remove the like
        await redisClient.del(likeKey);

        //remove from target user's "who liked me" list
        const targetLikesListKey = `user:${targetUserId}:likedBy`;
        let likedByList = await redisClient.get(targetLikesListKey) || [];
        likedByList = likedByList.filter(user => user.userId !== userId);
        await redisClient.set(targetLikesListKey, likedByList, 30 * 24 * 60 * 60);

        //decrement target user's like count
        const targetLikeKey = `likeCount:${targetUserId}`;
        let likeCount = await redisClient.get(targetLikeKey) || 0;
        likeCount = Math.max(0, parseInt(likeCount) - 1);
        await redisClient.set(targetLikeKey, likeCount, 30 * 24 * 60 * 60);

        //remove from user's "profiles I liked" list
        const userLikedListKey = `user:${userId}:liked`;
        let likedList = await redisClient.get(userLikedListKey) || [];
        likedList = likedList.filter(profile => profile.userId !== targetUserId);
        await redisClient.set(userLikedListKey, likedList, 30 * 24 * 60 * 60);

        res.status(200).json({
            success: true,
            message: "Profile unliked successfully"
        });

    } catch (error) {
        console.error('Error unliking profile:', error);
        res.status(500).json({
            success: false,
            message: 'Error unliking profile',
            error: error.message
        });
    }
};




