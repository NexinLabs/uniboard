const mongoose = require('mongoose');

const iconSchema = new mongoose.Schema({
    name: { type: String, required: true },
    category: { type: String, required: true, default: 'brands' }, // brands, shapes, arrows, etc.
    path: { type: String, required: true }, // e.g., '/icons/brands/github.svg'
    tags: [String], // for search functionality
    isDefault: { type: Boolean, default: true }, // default icons available to all users
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // for custom user icons
}, { timestamps: true });

// Index for faster queries
iconSchema.index({ category: 1, isDefault: 1 });
iconSchema.index({ createdBy: 1 });
iconSchema.index({ tags: 1 });

module.exports = mongoose.model('Icon', iconSchema);
