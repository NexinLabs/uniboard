const mongoose = require('mongoose');

const boardSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: [true, 'User is required'] },
    title: { type: String, required: [true, 'Title is required'] },
    elements: { type: Array, default: [] }, // Store canvas elements here
    visibility: {
        type: String,
        enum: ['private', 'public-view', 'public-edit'],
        default: 'private'
    },
    editors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    viewers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

module.exports = mongoose.model('Board', boardSchema);
