const express = require('express');
const router = express.Router();

const { authMiddleware } = require('../middleware/auth.js');
const { handleLocationUpdate, handleUserDisconnect } = require('../Controllers/locationCont.js');

//route to update location 
router.post('/update-location', authMiddleware, async (req, res) => {
    try {
        const userId = String(req.user.userId);
        const { latitude, longitude, radiusKm } = req.body;
        if (!userId || latitude === undefined || longitude === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        const nearbyUsers = await handleLocationUpdate({
            userId,
            latitude,
            longitude,
            radiusKm: radiusKm || 3
        });

        if (!nearbyUsers) {
            return res.status(500).json({
                success: false,
                message: 'Failed to update location'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Location updated successfully',
            data: {
                nearbyUsers
            }
        });

    } catch (error) {
        console.error('location update error:', error);
        return res.status(500).json({
            success: false,
            message: 'internal server error'
        });
    }
});

//remove the user's location 
router.delete('/remove-location', authMiddleware, async (req, res) => {
    try {
        const userId = String(req.user.userId);
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        await handleUserDisconnect(userId);
        res.status(200).json({
            success: true,
            message: 'Location removed successfully'
        });
    } catch (error) {
        console.error('location remove error:', error);
        return res.status(500).json({
            success: false,
            message: 'internal server error'
        });
    }
});

//getting nearby users (by coords)
router.get('/nearby', authMiddleware, async (req, res) => {
    try {
        const userId = String(req.user.userId);
        const latitude = req.query.lat != null ? Number(req.query.lat) : undefined;
        const longitude = req.query.lng != null ? Number(req.query.lng) : undefined;
        const radiusKm = req.query.radiusKm != null ? Number(req.query.radiusKm) : 3;

        if (!userId || latitude === undefined || longitude === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        const nearbyUsers = await handleLocationUpdate({ userId, latitude, longitude, radiusKm });
        if (nearbyUsers == null) {
            return res.status(500).json({
                success: false,
                message: 'Failed to get nearby users'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Nearby users retrieved successfully',
            data: {
                nearbyUsers
            }
        });
    } catch (error) {
        console.error('get nearby users error:', error);
        return res.status(500).json({
            success: false,
            message: 'internal server error'
        });
    }
});


module.exports = router;
