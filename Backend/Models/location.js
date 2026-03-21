const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
    },
    coordinates: {
        type: [Number],
        validate: {
            validator: function (coords) {
                return coords.length === 2;
            },
            message: 'invalid coordinates'
        }
    },

    //this prevents mongoDB from creating a seperate id 
    _id: false
});


module.exports = locationSchema;