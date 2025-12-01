const router = require('express').Router();
const config = require('../config');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Middleware to verify token
const verifyToken = (req, res, next) => {
    const authHeader = req.headers.token;
    if (authHeader) {
        const token = authHeader.split(" ")[1];
        jwt.verify(token, config.JWT.SECRET, (err, user) => {
            if (err) return res.status(403).json("Token is not valid!");
            req.user = user;
            next();
        });
    } else {
        return res.status(401).json("You are not authenticated!");
    }
};

// Configure multer for avatar uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = uuidv4();
        cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only JPG and PNG files are allowed'), false);
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 512 * 1024 }, // 512KB max
    fileFilter: fileFilter
});

// Get user profile
router.get('/profile/:userId', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.params.userId).select('-password');
        if (!user) return res.status(404).json("User not found");
        res.status(200).json(user);
    } catch (err) {
        res.status(500).json(err);
    }
});

// Get current user profile
router.get('/me', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) return res.status(404).json("User not found");
        res.status(200).json(user);
    } catch (err) {
        res.status(500).json(err);
    }
});

// Update user profile
router.put('/profile', verifyToken, async (req, res) => {
    try {
        const { displayName, bio, location } = req.body;
        const updateData = {};

        if (displayName !== undefined) updateData.displayName = displayName;
        if (bio !== undefined) updateData.bio = bio;
        if (location !== undefined) updateData.location = location;

        const updatedUser = await User.findByIdAndUpdate(
            req.user.id,
            { $set: updateData },
            { new: true }
        ).select('-password');

        res.status(200).json(updatedUser);
    } catch (err) {
        res.status(500).json(err);
    }
});

// Upload avatar
router.post('/avatar', verifyToken, upload.single('avatar'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const protocol = req.protocol;
        const host = req.get('host');
        const avatarUrl = `${protocol}://${host}/uploads/${req.file.filename}`;

        const updatedUser = await User.findByIdAndUpdate(
            req.user.id,
            { $set: { avatar: avatarUrl } },
            { new: true }
        ).select('-password');

        res.json({
            message: 'Avatar uploaded successfully',
            user: updatedUser
        });
    } catch (err) {
        res.status(500).json(err);
    }
});

// Delete user profile
router.delete('/profile', verifyToken, async (req, res) => {
    try {
        await User.findByIdAndDelete(req.user.id);
        res.status(200).json("User has been deleted");
    } catch (err) {
        res.status(500).json(err);
    }
});

// Search Users
router.get('/search', verifyToken, async (req, res) => {
    const query = req.query.q;
    if (!query) return res.status(400).json("Query is required");

    try {
        const users = await User.find({
            $or: [
                { username: { $regex: query, $options: 'i' } },
                { email: { $regex: query, $options: 'i' } }
            ]
        }).select('username email _id avatar displayName').limit(10);

        res.status(200).json(users);
    } catch (err) {
        res.status(500).json(err);
    }
});

module.exports = router;
