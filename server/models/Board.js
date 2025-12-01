const mongoose = require('mongoose');

const boardSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    elements: { type: Array, default: [] }, // Store canvas elements here
    visibility: {
        type: String,
        enum: ['private', 'public-view', 'public-edit'],
        default: 'private'
    },
    collaborators: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        role: { type: String, enum: ['viewer', 'editor'], default: 'viewer' }
    }]
}, { timestamps: true });

module.exports = mongoose.model('Board', boardSchema);
