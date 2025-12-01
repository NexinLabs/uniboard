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
        const board = await Board.findById(req.params.id)
            .populate('editors', 'username')
            .populate('viewers', 'username');
        if (!board) return res.status(404).json("Board not found");

        const isOwner = board.user.toString() === req.user.id;
        const isEditor = board.editors.some(u => u._id.toString() === req.user.id);
        const isViewer = board.viewers.some(u => u._id.toString() === req.user.id);
        const isPublic = board.visibility === 'public-view' || board.visibility === 'public-edit';

        if (!isOwner && !isEditor && !isViewer && !isPublic) {
            return res.status(403).json("You are not allowed to view this board");
        }
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

        const isOwner = board.user.toString() === req.user.id;
        if (!isOwner) {
            return res.status(403).json("You are not allowed to update this board");
        }

        const updatedBoard = await Board.findByIdAndUpdate(req.params.id, {
            $set: req.body,
        }, { new: true })
            .populate('editors', 'username email')
            .populate('viewers', 'username email');
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

// Add Collaborator
router.post('/:id/collaborators', verifyToken, async (req, res) => {
    try {
        const { userId, email, role } = req.body;
        const board = await Board.findById(req.params.id);
        if (!board) return res.status(404).json("Board not found");

        if (board.user.toString() !== req.user.id) {
            return res.status(403).json("Only the owner can add collaborators");
        }

        let targetUserId = userId;

        if (email) {
            const User = require('../models/User');
            const user = await User.findOne({ email });
            if (!user) return res.status(404).json("User not found");
            targetUserId = user._id.toString();
        }

        if (!targetUserId) return res.status(400).json("User ID or Email is required");

        if (targetUserId === req.user.id) {
            return res.status(400).json("You cannot add yourself as a collaborator");
        }

        const isEditor = board.editors.some(id => id.toString() === targetUserId);
        const isViewer = board.viewers.some(id => id.toString() === targetUserId);

        if (isEditor || isViewer) {
            return res.status(400).json("User is already a collaborator");
        }

        if (role === 'editor') {
            board.editors.push(targetUserId);
        } else {
            board.viewers.push(targetUserId);
        }

        await board.save();

        const updatedBoard = await Board.findById(req.params.id)
            .populate('editors', 'username email')
            .populate('viewers', 'username email');

        res.status(200).json({ editors: updatedBoard.editors, viewers: updatedBoard.viewers });
    } catch (err) {
        res.status(500).json(err);
    }
});

// Update Collaborator Role
router.put('/:id/collaborators/:userId', verifyToken, async (req, res) => {
    try {
        const { role } = req.body;
        const board = await Board.findById(req.params.id);
        if (!board) return res.status(404).json("Board not found");

        if (board.user.toString() !== req.user.id) {
            return res.status(403).json("Only the owner can update collaborators");
        }

        const userId = req.params.userId;

        // Remove from both lists first
        board.editors = board.editors.filter(id => id.toString() !== userId);
        board.viewers = board.viewers.filter(id => id.toString() !== userId);

        // Add to new role list
        if (role === 'editor') {
            board.editors.push(userId);
        } else {
            board.viewers.push(userId);
        }

        await board.save();

        const updatedBoard = await Board.findById(req.params.id)
            .populate('editors', 'username email')
            .populate('viewers', 'username email');

        res.status(200).json({ editors: updatedBoard.editors, viewers: updatedBoard.viewers });
    } catch (err) {
        res.status(500).json(err);
    }
});

// Remove Collaborator
router.delete('/:id/collaborators/:userId', verifyToken, async (req, res) => {
    try {
        const board = await Board.findById(req.params.id);
        if (!board) return res.status(404).json("Board not found");

        if (board.user.toString() !== req.user.id) {
            return res.status(403).json("Only the owner can remove collaborators");
        }

        board.editors = board.editors.filter(id => id.toString() !== req.params.userId);
        board.viewers = board.viewers.filter(id => id.toString() !== req.params.userId);

        await board.save();

        const updatedBoard = await Board.findById(req.params.id)
            .populate('editors', 'username email')
            .populate('viewers', 'username email');

        res.status(200).json({ editors: updatedBoard.editors, viewers: updatedBoard.viewers });
    } catch (err) {
        res.status(500).json(err);
    }
});

module.exports = router;
