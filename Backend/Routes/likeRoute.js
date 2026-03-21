const express = require('express');
const router = express.Router();

const { likeProfile, getWhoLikedMe, checkLikeStatus } = require('../Controllers/likeCont.js');


//like a user's profile 
router.post('/like', likeProfile);

//getting who liked the user
router.get('/who-liked-me/:userId', getWhoLikedMe);

//checking if user already liked the profile 
router.get('/check-status/:userId', checkLikeStatus);

module.exports = router;