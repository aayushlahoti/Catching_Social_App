const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth.js');
const upload = require('../middleware/upload.js');

const { deleteProfilePic, updateProfilePic, signupUser, loginUser, logoutUser, updateUserDetails, updateStatus, getCurrentUser, getUserById, updateGender, updateAge, refreshUserToken, deleteUserProfile } = require('../Controllers/userCont.js');

//Public routes without the jwt authentication 

router.post('/signup', signupUser);
router.post('/login', loginUser);

//protecteed routes with jwt authentication 

router.get('/profile', authMiddleware, getCurrentUser);
router.put('/updateDetails', authMiddleware, updateUserDetails);
router.patch('/updateStatus', authMiddleware, updateStatus);
router.patch('/updateAge', authMiddleware, updateAge);
router.patch('/updateGender', authMiddleware, updateGender);
router.post('/upload-profile-picture', authMiddleware, upload.single('profileImage'), updateProfilePic);
router.delete('/delete-profile-picture', authMiddleware, deleteProfilePic);
router.delete('/delete-profile', authMiddleware, deleteUserProfile);

//logout user 


router.post('/logout', authMiddleware, logoutUser);

//refreshing jwt tokens 
router.post('/refresh-token', refreshUserToken);

// must be last: dynamic userId route
router.get('/:userId', authMiddleware, getUserById);


module.exports = router;