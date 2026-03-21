//this is the model to store the posted images on the database 

const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    imageUrl: {
        type: String,
        required: true,
    },
    //timestamps will help to know when the post was created
}, {
    timestamps: true
});

//index for faster queries
postSchema.index({ userId: 1 });

module.exports = mongoose.model('Post', postSchema);