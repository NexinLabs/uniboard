const express = require('express');
const router = express.Router();
const Icon = require('../models/Icon');
const jwt = require('jsonwebtoken');
const config = require('../config');

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

// Get user's available icons (default + user's custom icons)
router.get('/me/icons', verifyToken, async (req, res) => {
    try {
        // Get default icons + user's custom icons
        const icons = await Icon.find({
            $or: [
                { isDefault: true },
                { createdBy: req.user.id }
            ]
        }).sort({ category: 1, name: 1 });

        res.json(icons);
    } catch (err) {
        console.error('Error fetching icons:', err);
        res.status(500).json({ error: 'Failed to fetch icons' });
    }
});

// Get icons by category
router.get('/me/icons/:category', verifyToken, async (req, res) => {
    try {
        const { category } = req.params;
        const icons = await Icon.find({
            category,
            $or: [
                { isDefault: true },
                { createdBy: req.user.id }
            ]
        }).sort({ name: 1 });

        res.json(icons);
    } catch (err) {
        console.error('Error fetching icons by category:', err);
        res.status(500).json({ error: 'Failed to fetch icons' });
    }
});

// Search icons
router.get('/me/icons/search/:query', verifyToken, async (req, res) => {
    try {
        const { query } = req.params;
        const icons = await Icon.find({
            $and: [
                {
                    $or: [
                        { isDefault: true },
                        { createdBy: req.user.id }
                    ]
                },
                {
                    $or: [
                        { name: { $regex: query, $options: 'i' } },
                        { tags: { $in: [new RegExp(query, 'i')] } }
                    ]
                }
            ]
        }).sort({ name: 1 });

        res.json(icons);
    } catch (err) {
        console.error('Error searching icons:', err);
        res.status(500).json({ error: 'Failed to search icons' });
    }
});

module.exports = router;
