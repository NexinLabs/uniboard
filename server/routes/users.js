const router = require('express').Router();
const config = require('../config');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Middleware to verify token (duplicated for now, should be shared)
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
        }).select('username email _id').limit(10);

        res.status(200).json(users);
    } catch (err) {
        res.status(500).json(err);
    }
});

module.exports = router;
