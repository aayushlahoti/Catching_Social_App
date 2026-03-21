const Post = require('../Models/post');
const fs = require('fs');
const { isConnected } = require('../Database/db.js');


//creating the post (only once)
exports.uploadImage = async (req, res) => {
    const userId = req.user?.userId || req.body.userId;

    try {
        if (!isConnected()) {
            return res.status(503).json({
                success: false,
                message: "Database connection is not established. Please check your MONGO_URI in the .env file."
            });
        }
        // validation 

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "User ID is required"
            });
        }
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Image is required"
            });
        }

        // checking if already has a post
        const existingPost = await Post.findOne({ userId });
        if (existingPost) {
            // Cleanup: delete the newly uploaded file since the DB record won't be created
            if (req.file.path) {
                fs.unlinkSync(req.file.path);
            }
            return res.status(400).json({
                success: false,
                message: "User already has a post"
            });
        }

        // creating post with image path 
        const post = new Post({
            userId,
            imageUrl: req.file.path,
            isSet: true
        });
        await post.save();

        res.status(200).json({
            success: true,
            message: "post uploaded successfully",
            data: {
                userId,
                imageUrl: req.file.path,
                isSet: true
            }
        });
    } catch (error) {
        console.error('Error uploading image', error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};

//get user's post (single)
exports.getPost = async (req, res) => {
    const { userId } = req.params;
    try {
        if (!isConnected()) {
            return res.status(503).json({
                success: false,
                message: "Database connection is not established. Please check your MONGO_URI in the .env file."
            });
        }
        if (!userId) {

            return res.status(400).json({ success: false, message: 'userId is required' });
        }

        const post = await Post.findOne({ userId }).lean();
        if (!post) {
            return res.status(404).json({ success: false, message: 'Post not found' });
        }

        res.status(200).json({
            success: true,
            data: {
                userId: String(userId),
                imageUrl: post.imageUrl ? `/${String(post.imageUrl).replace(/\\/g, '/')}` : null
            }
        });
    } catch (error) {
        console.error('Error getting post', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

//check if user has uploaded profile image 
exports.checkPostStatus = async (req, res) => {
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
                message: 'user ID is required'
            });
        }

        const post = await Post.findOne({ userId });

        res.status(200).json({
            success: true,
            data: {
                userId,
                isSet: !!post
            }
        });
    } catch (error) {
        console.error('Error checking post status', error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};

//attempt to delete the post termination 
exports.deletePost = async (req, res) => {
    return res.status(403).json({
        success: false,
        message: "Not allowed to delete post"
    });
};