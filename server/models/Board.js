const mongoose = require('mongoose');

const boardSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    elements: { type: Array, default: [] }, // Store canvas elements here
}, { timestamps: true });

module.exports = mongoose.model('Board', boardSchema);
