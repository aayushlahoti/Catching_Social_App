const express = require('express');
const router = express.Router();

const { authMiddleware } = require('../middleware/auth.js');
const requestController = require('../Controllers/requestCont.js');

router.post('/send', authMiddleware, requestController.sendRequest);
router.post('/accept', authMiddleware, requestController.acceptRequest);
router.post('/decline', authMiddleware, requestController.declineRequest);
router.get('/incoming', authMiddleware, requestController.listIncoming);
router.get('/matches', authMiddleware, requestController.listMatches);

module.exports = router;

