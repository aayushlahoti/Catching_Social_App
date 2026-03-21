const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const locationSchema = require('./location.js');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        trim: true,
        minlength: 3,
        maxlength: 15
    },
    password: {
        type: String,
        required: true,
        minlength: 6,
        maxlength: 100,
        //when userid is selected, the password will not be fetched 
        select: false,
    },

    location: {
        type: locationSchema
    },

    //model for the profile pic of the user 
    profileImage: {
        path: {
            type: String,
            default: null
        },
        mimeType: {
            type: String,
            default: null
        },
        size: {
            type: Number,
            default: null
        },
        filename: {
            type: String,
            default: null
        },
        uploadTime: {
            type: Date,
            default: Date.now
        }
    },

    age: {
        type: Number,
        min: 8,
        max: 80
    },
    profesion: {
        type: String,
        trim: true,
        maxlength: 70,
        default: "Not specified"
    },
    gender: {
        type: String,
        enum: ['male', 'female', 'other'],
        lowercase: true
    },
    status: {
        type: String,
        maxlength: 200,
        default: "Hey there! I am using Catching.",
        trim: true
    },

    isOnline: {
        type: Boolean,
        default: false
    }
    //to know the timeline of creation and updation of user
}, {
    timestamps: true
});

//this is for geo loation queries + it enables fast radius search queries
userSchema.index({ location: '2dsphere' });

//hashing the password before storing in database 
userSchema.pre('save', async function () {

    //if password is not modified then skip hashing
    if (!this.isModified('password')) {
        return;
    }

    //generating salt so that when passwords are same, hashes are different
    const salt = 10;
    this.password = await bcrypt.hash(this.password, salt);
});

//method to compare password during login 
userSchema.methods.comparePassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

//exporting the model
module.exports = mongoose.model('User', userSchema);
