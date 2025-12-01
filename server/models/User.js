const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    displayName: { type: String, default: '' },
    bio: { type: String, default: '' },
    avatar: { type: String, default: '' },
    location: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
