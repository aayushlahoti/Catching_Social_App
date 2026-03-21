const mongoose = require('mongoose');

const likeSchema = new mongoose.Schema({
    likerID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    likedId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

//preventing duplicate likes from same user on same other user 
likeSchema.index({ likerId: 1, likedId: 1 }, { unique: true });

//prevent users from liking the same profile multiple times 
likeSchema.pre('save', async function (next) {
    if (this.isNew) {
        const existingLike = await this.constructor.findOne({
            likerId: this.likerId,
            likedId: this.likedId
        })
        if (existingLike) {
            throw new Error('You have already liked this profile');
        }
    }
    next();
});


module.exports = mongoose.model('Like', likeSchema);