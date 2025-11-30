const router = require('express').Router();
const Board = require('../models/Board');
const jwt = require('jsonwebtoken');

// Middleware to verify token
const verifyToken = (req, res, next) => {
    const authHeader = req.headers.token;
    if (authHeader) {
        const token = authHeader.split(" ")[1];
        jwt.verify(token, process.env.JWT_SECRET || 'secret', (err, user) => {
            if (err) return res.status(403).json("Token is not valid!");
            req.user = user;
            next();
        });
    } else {
        return res.status(401).json("You are not authenticated!");
    }
};

// Create Board
router.post('/', verifyToken, async (req, res) => {
    const newBoard = new Board({ ...req.body, user: req.user.id });
    try {
        const savedBoard = await newBoard.save();
        res.status(200).json(savedBoard);
    } catch (err) {
        res.status(500).json(err);
    }
});

// Get User Boards
router.get('/', verifyToken, async (req, res) => {
    try {
        const boards = await Board.find({ user: req.user.id }).sort({ createdAt: -1 });
        res.status(200).json(boards);
    } catch (err) {
        res.status(500).json(err);
    }
});

// Get Single Board
router.get('/:id', verifyToken, async (req, res) => {
    try {
        const board = await Board.findById(req.params.id);
        if (!board) return res.status(404).json("Board not found");
        if (board.user.toString() !== req.user.id) return res.status(403).json("You are not allowed to view this board");
        res.status(200).json(board);
    } catch (err) {
        res.status(500).json(err);
    }
});

// Update Board
router.put('/:id', verifyToken, async (req, res) => {
    try {
        const board = await Board.findById(req.params.id);
        if (!board) return res.status(404).json("Board not found");
        if (board.user.toString() !== req.user.id) return res.status(403).json("You are not allowed to update this board");

        const updatedBoard = await Board.findByIdAndUpdate(req.params.id, {
            $set: req.body,
        }, { new: true });
        res.status(200).json(updatedBoard);
    } catch (err) {
        res.status(500).json(err);
    }
});

// Delete Board
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const board = await Board.findById(req.params.id);
        if (!board) return res.status(404).json("Board not found");
        if (board.user.toString() !== req.user.id) return res.status(403).json("You are not allowed to delete this board");

        await Board.findByIdAndDelete(req.params.id);
        res.status(200).json("Board has been deleted...");
    } catch (err) {
        res.status(500).json(err);
    }
});

module.exports = router;
