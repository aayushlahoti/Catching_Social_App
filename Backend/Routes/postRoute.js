const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');

const { authMiddleware } = require('../middleware/auth.js');
const { uploadImage, getPost, checkPostStatus, deletePost } = require('../Controllers/postCont');

//upload post 
router.post('/upload', authMiddleware, upload.single('image'), uploadImage);

//check if the user has profile image 
router.get('/status/:userId', checkPostStatus);

//get user's post
router.get('/:userId', authMiddleware, getPost);

//delete attempt fail
router.delete('/delete', deletePost);


module.exports = router;
