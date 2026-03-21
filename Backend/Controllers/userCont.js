const User = require('../Models/user.js');
const Post = require('../Models/post.js');
const Like = require('../Models/like.js');
const upload = require('../middleware/upload.js');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookies = require('cookie-parser');
const dotenv = require('dotenv');
const redisClient = require('../Redis/client.js');
const { isConnected } = require('../Database/db.js');
dotenv.config();


//1 -------> signup user 
exports.signupUser = async (req, res) => {
    try {
        if (!isConnected()) {
            return res.status(503).json({
                success: false,
                message: "Database connection is not established. Please check your MONGO_URI in the .env file."
            });
        }
        const { username, password, confirmPassword, location, profesion, age, gender } = req.body;


        //validation of feilds
        if (!username || !password || !confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "All feilds are required"
            });
        }
        //checking if password matches the confirm password
        if (password !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "Password do not match"
            });
        }
        //password length validation 
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password should be at least 6 characters long"
            });
        }
        //checking if username already exists
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "Username already exists"
            });
        };

        //creating new user 
        const newUser = await User.create({
            username,
            // password hashing handled by User pre-save hook
            password,
            location,
            profesion,
            age,
            gender
        });
        //generating jwt token
        const token = jwt.sign(
            { userId: newUser._id, username: newUser.username },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );
        //setting generic token cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'Strict' : 'Lax',
            maxAge: 24 * 60 * 60 * 1000 // 1 day
        });

        //returning success response
        res.status(201).json({
            success: true,
            message: "User registered successfully",
            data: {
                user: {
                    id: newUser._id,
                    username: newUser.username
                },
                token: token
            }
        });
    } catch (error) {
        console.error('Sign up error', error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });

    }
};


//2 -------> login user
exports.loginUser = async (req, res) => {
    try {
        if (!isConnected()) {
            return res.status(503).json({
                success: false,
                message: "Database connection is not established. Please check your MONGO_URI in the .env file."
            });
        }
        const { username, password } = req.body;


        //validation of feilds
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: "All feilds are required"
            });
        }
        //checking if user exists 
        const user = await User.findOne({ username }).select('+password');
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        //verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: "Invalid password"
            });
        }
        //generating JWT token
        const token = jwt.sign(
            { userId: user._id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );
        //generating refresh jwt token
        const refreshToken = jwt.sign(
            { userId: user._id, username: user.username },
            process.env.JWT_REFRESH_TOKEN_SECRET,
            { expiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRES_IN }
        );
        //setting httpOnly cookie for refresh token
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Strict',
            maxAge: 30 * 24 * 60 * 60 * 1000 //30 days
        });

        //setting generic token cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'Strict' : 'Lax',
            maxAge: 24 * 60 * 60 * 1000 // 1 day
        });

        //fetching user's data without the password
        const userData = {
            id: user._id,
            username: user.username,
            profileImage: user.profileImage,
            age: user.age,
            profesion: user.profesion,
            status: user.status,
            isOnline: user.isOnline,
            gender: user.gender
        }
        //returning success response
        res.status(200).json({
            success: true,
            message: "Login successful",
            data: {
                user: userData,
                token: token
            }
        });
    } catch (error) {
        console.error('Login error', error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};


//3 -------> update profile details (age, gender, status, profession)
exports.updateUserDetails = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { age, gender, status, profession, profesion } = req.body;

        const user = await User.findById(userId).select('-password');
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        if (age !== undefined) {
            if (typeof age !== 'number' || age < 8 || age > 80) {
                return res.status(400).json({
                    success: false,
                    message: "Age must be a number between 8 and 80"
                });
            }
            user.age = age;
        }

        if (gender !== undefined) {
            const normalized = String(gender).toLowerCase();
            const validGenders = ['male', 'female', 'other'];
            if (!validGenders.includes(normalized)) {
                return res.status(400).json({
                    success: false,
                    message: "Gender must be male, female, or other"
                });
            }
            user.gender = normalized;
        }

        if (status !== undefined) {
            if (typeof status !== 'string') {
                return res.status(400).json({
                    success: false,
                    message: "Status must be a string"
                });
            }
            const trimmed = status.trim();
            if (trimmed.length === 0 && status.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: "Status cannot be empty or whitespace only"
                });
            }
            if (trimmed.length > 200) {
                return res.status(400).json({
                    success: false,
                    message: "Status can not exceed 200 characters"
                });
            }
            user.status = trimmed;
        }

        const incomingProfession = profession ?? profesion;
        if (incomingProfession !== undefined) {
            if (typeof incomingProfession !== 'string') {
                return res.status(400).json({
                    success: false,
                    message: "Profession must be a string"
                });
            }
            user.profesion = incomingProfession.trim() || 'Not specified';
        }

        await user.save();
        await redisClient.delete(`user: ${userId}`);

        res.status(200).json({
            success: true,
            message: "User details updated successfully",
            data: {
                user: {
                    id: user._id,
                    username: user.username,
                    profileImage: user.profileImage,
                    age: user.age,
                    gender: user.gender,
                    status: user.status,
                    profesion: user.profesion
                }
            }
        });
    } catch (error) {
        console.error('Update profile error..', error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};

//4 ------> updating the age
exports.updateAge = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { age } = req.body;

        //validation 
        if (!age) {
            return res.status(400).json({
                success: false,
                message: "Age is required"
            });
        }
        if (typeof age !== 'number' || age < 8 || age > 80) {
            return res.status(400).json({
                success: false,
                message: "Age must be a number between 8 and 80"
            });
        }
        //updating age
        const user = await User.findByIdAndUpdate(
            userId,
            { age: age },
            { new: true, select: '-password' }
        );
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }
        res.status(200).json({
            success: true,
            message: "Age updated successfully",
            data: {
                age: user.age
            }
        });
        await redisClient.delete(`user: ${userId}`);
    } catch (error) {
        console.error('Update age error', error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
}

//5 -------> updating the status
exports.updateStatus = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { status } = req.body;

        //validation 
        if (status === undefined) {
            return res.status(400).json({
                success: false,
                message: "Status is required"
            });
        }
        if (typeof status !== 'string') {
            return res.status(400).json({
                success: false,
                message: "must include string here"
            });
        }
        if (status.length > 200) {
            return res.status(400).json({
                success: false,
                message: "Status can not exceed 200 characters"
            });
        }
        const trimmedStatus = status.trim();
        if (trimmedStatus.length === 0 && status.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Status cannot be empty or whitespace only"
            });
        }

        //updating status
        const user = await User.findByIdAndUpdate(
            userId,
            { status: trimmedStatus },
            { new: true, select: '-password' }
        );
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }
        res.status(200).json({
            success: true,
            message: "Status updated successfully",
            data: {
                status: user.status
            }
        });
        await redisClient.delete(`user: ${userId}`);
    } catch (error) {
        console.error('Update status error', error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};

//6 -------> updating the gender 
exports.updateGender = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { gender } = req.body;

        //validation of field
        if (!gender) {
            return res.status(400).json({
                success: false,
                message: "gender is required"
            });
        };

        const normalized = String(gender).toLowerCase();
        const validGenders = ['male', 'female', 'other'];
        if (!validGenders.includes(normalized)) {
            return res.status(400).json({
                success: false,
                message: "Gender must be male, female, or other"
            });
        }

        const user = await User.findByIdAndUpdate(
            userId,
            { gender: normalized },
            { new: true, select: '-password' }
        );
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "user not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "gender updated successfully",
            data: {
                gender: user.gender
            }
        });

        await redisClient.delete(`user: ${userId}`);
    } catch (error) {
        console.error("gender can't be updated", error);
        res.status(500).json({
            success: false,
            message: "internal server error",
            error: error.message
        });

    }
};


//7 -------> updating the profile pic
exports.updateProfilePic = async (req, res) => {
    try {
        //check if file is uploaded 
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'please upload your profile pic'
            });
        }

        //Get user ID from token(authenticated user)
        const userId = req.user.userId;

        //Find user in database 
        const user = await User.findById(userId);

        if (!user) {
            //delete the file if useer doesn't exist
            fs.unlinkSync(req.file.path);
            return res.status(404).json({
                success: false,
                message: "user not found"
            });
        }
        //delete old profile pic if exists
        if (user.profileImage && user.profileImage.path) {
            const oldImagePath = path.join(__dirname, '../', user.profileImage.path);
            if (fs.existsSync(oldImagePath)) {
                try {
                    fs.unlinkSync(oldImagePath);
                } catch (error) {
                    console.error('error deleting the old image', error);
                }
            }
        }
        //update the user's profile image details 
        user.profileImage = {
            path: req.file.path.replace(/\\/g, '/'),
            mimeType: req.file.mimetype,
            size: req.file.size,
            filename: req.file.filename,
            uploadTime: Date.now()
        };

        //save and update the user 
        await user.save();

        //invalidate cache
        await redisClient.delete(`user: ${userId}`);

        //duccess response 
        res.status(200).json({
            success: true,
            message: 'profile picture uploaded successfully',
            data: {
                profileImage: user.profileImage
            }
        });


    } catch (error) {
        console.error('error updating profile picture', error);
        res.status(500).json({
            success: false,
            message: 'internal server error'
        });

    }
};

//8 -------> delete te profile picture 
exports.deleteProfilePic = async (req, res) => {
    try {
        const userId = req.user.userId;
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "user not found"
            });
        }
        if (user.profileImage && user.profileImage.path) {
            const oldImagePath = path.join(__dirname, '../', user.profileImage.path);
            if (fs.existsSync(oldImagePath)) {
                try {
                    fs.unlinkSync(oldImagePath);
                } catch (error) {
                    console.error('error deleting the old image', error);
                }
            }
        }

        //reset the pfp to null 
        user.profileImage = {
            path: null,
            mimeType: null,
            size: null,
            filename: null,
            uploadTime: null
        };

        await user.save();
        await redisClient.delete(`user: ${userId}`);

        res.status(200).json({
            success: true,
            message: 'profile picture deleted successfully'
        });
    } catch (error) {
        console.error('error deleting profile picture', error);
        res.status(500).json({
            success: false,
            message: 'internal server error'
        });
    }
};

//9 -------> fetching the logged in user's details
exports.getCurrentUser = async (req, res) => {
    try {
        const userId = req.user.userId;
        //getting user from redis
        const cacheKey = `user: ${userId}`;
        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) {
            return res.status(200).json({
                success: true,
                source: 'cache',
                data: { user: cachedData }
            });
        }
        //fetches user data
        const user = await User.findById(userId).select('-password');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }
        const payload = {
            id: String(user._id),
            username: user.username,
            profileImage: user.profileImage,
            age: user.age,
            profesion: user.profesion,
            status: user.status,
            isOnline: user.isOnline,
            gender: user.gender,
        };

        // cache for short time (best-effort)
        try {
            await redisClient.set(cacheKey, payload, 300);
        } catch (e) {
            // ignore cache errors
        }

        res.status(200).json({
            success: true,
            data: { user: payload }
        });
    } catch (error) {
        console.error('user error', error);
        res.status(500).json({
            success: false,
            message: "error fetching user's data",
            error: error.message
        });
    }
}

//9b -------> fetching another user's profile (authenticated)
exports.getUserById = async (req, res) => {
    try {
        const { userId } = req.params;
        if (!userId) {
            return res.status(400).json({ success: false, message: 'userId is required' });
        }

        const user = await User.findById(userId).select('-password').lean();
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.status(200).json({
            success: true,
            data: {
                user: {
                    id: String(user._id),
                    username: user.username,
                    profileImage: user.profileImage,
                    age: user.age,
                    profesion: user.profesion,
                    status: user.status,
                    isOnline: user.isOnline,
                    gender: user.gender,
                }
            }
        });
    } catch (error) {
        console.error('getUserById error', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// -------> Logout User 
exports.logoutUser = async (req, res) => {
    try {
        const token = req.token;
        const refreshToken = req.cookies.refreshToken;
        //the blacklisting time of token from redis could be added here
        if (token) {
            await redisClient.set(`blacklisted: ${token}`, true, 24 * 60 * 60);
        }

        //clearing cookies
        res.clearCookie('refreshToken');
        res.clearCookie('token');

        res.status(200).json({
            success: true,
            message: "Logout successful"
        });

    } catch (error) {
        console.error('Logout error', error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};




//10 ------> Refresh Access Token
exports.refreshUserToken = async (req, res) => {
    try {
        // Get refresh token from cookie
        const refreshToken = req.cookies.refreshToken;

        if (!refreshToken) {
            return res.status(401).json({
                success: false,
                message: "No refresh token provided, please log in again"
            });
        }

        // Verify the refresh token
        jwt.verify(refreshToken, process.env.JWT_REFRESH_TOKEN_SECRET, async (err, decoded) => {
            if (err) {
                return res.status(403).json({
                    success: false,
                    message: "Invalid refresh token",
                    error: "INVALID_REFRESH_TOKEN"
                });
            }

            // Generate new access token
            // We use the same payload structure as login
            const accessToken = jwt.sign(
                { userId: decoded.userId, username: decoded.username },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRES_IN }
            );

            // Set new access token cookie
            res.cookie('token', accessToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === 'production' ? 'Strict' : 'Lax',
                maxAge: 24 * 60 * 60 * 1000 // 1 day
            });

            const user = await User.findById(decoded.userId).select('-password').lean();

            // Return success
            res.status(200).json({
                success: true,
                message: "Token refreshed successfully",
                data: {
                    token: accessToken,
                    user: user ? { 
                        id: String(user._id), 
                        username: user.username,
                        profileImage: user.profileImage,
                        age: user.age,
                        profesion: user.profesion,
                        status: user.status,
                        isOnline: user.isOnline,
                        gender: user.gender
                    } : null
                }
            });
        });

    } catch (error) {
        console.error('Refresh token error', error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};

//11 ------> Delete User Profile completely
exports.deleteUserProfile = async (req, res) => {
    try {
        const userId = req.user.userId;

        // 1. Find user to get their profile picture info
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // 2. Delete profile picture from filesystem if it exists
        if (user.profileImage && user.profileImage.path) {
            const imagePath = path.join(__dirname, '../', user.profileImage.path);
            if (fs.existsSync(imagePath)) {
                try {
                    fs.unlinkSync(imagePath);
                } catch (fsError) {
                    console.error('Error deleting profile image from filesystem:', fsError);
                    // continue with deletion even if file removal fails
                }
            }
        }

        // 3. Delete any posts created by this user
        // Posts might also have images stored on the filesystem
        const userPosts = await Post.find({ userId: userId });
        for (const post of userPosts) {
            if (post.imageUrl) {
                // Determine if imageUrl is relative path or URL. Our app seems to store relative path.
                const postImagePath = path.join(__dirname, '../', post.imageUrl);
                if (fs.existsSync(postImagePath)) {
                    try {
                        fs.unlinkSync(postImagePath);
                    } catch (fsError) {
                        console.error('Error deleting post image from filesystem:', fsError);
                    }
                }
            }
        }
        await Post.deleteMany({ userId: userId });

        // 4. Delete any likes associated with this user (either they liked someone, or someone liked them)
        await Like.deleteMany({
            $or: [
                { likerId: userId },
                { likedId: userId }
            ]
        });

        // 5. Delete the user document itself
        await User.findByIdAndDelete(userId);

        // 6. Delete from Redis cache
        await redisClient.delete(`user: ${userId}`);
        
        // 7. Handle token invalidation / logout actions
        const token = req.token; // token is put into req by authMiddleware usually... wait let's check auth.js to be sure. It's often req.token or req.header('Authorization'). Let's just use what logoutUser uses.
        if (token) {
            await redisClient.set(`blacklisted: ${token}`, true, 24 * 60 * 60);
        }
        res.clearCookie('refreshToken');
        res.clearCookie('token');

        // Return success response
        res.status(200).json({
            success: true,
            message: "User profile and associated data deleted successfully"
        });

    } catch (error) {
        console.error('Delete profile error:', error);
        res.status(500).json({
            success: false,
            message: "Internal server error while deleting profile",
            error: error.message
        });
    }
};

