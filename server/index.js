const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Create HTTP server
const server = http.createServer(app);

// Setup Socket.IO with CORS
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json());

const authRoute = require('./routes/auth');
const boardRoute = require('./routes/boards');

app.use('/api/auth', authRoute);
app.use('/api/boards', boardRoute);

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/uniboard')
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error(err));

app.get('/', (req, res) => {
    res.send('Uniboard API is running');
});

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Join a specific board room
    socket.on('join-board', (boardId) => {
        socket.join(boardId);
        console.log(`User ${socket.id} joined board ${boardId}`);

        // Notify others in the room
        socket.to(boardId).emit('user-joined', {
            userId: socket.id,
            timestamp: new Date()
        });
    });

    // Handle element updates
    socket.on('element-update', async ({ boardId, elements }) => {
        // Broadcast to all other users in the board (real-time)
        socket.to(boardId).emit('elements-updated', elements);

        // Save to database
        try {
            const Board = require('./models/Board');
            await Board.findByIdAndUpdate(boardId, { elements });
            console.log(`💾 Saved board ${boardId} to database`);
        } catch (err) {
            console.error('Error saving board:', err);
        }
    });

    // Handle single element changes (more efficient)
    socket.on('element-change', ({ boardId, element, action }) => {
        socket.to(boardId).emit('element-changed', { element, action });
    });

    // Handle cursor movement (optional - for showing other users' cursors)
    socket.on('cursor-move', ({ boardId, position }) => {
        socket.to(boardId).emit('cursor-moved', {
            userId: socket.id,
            position
        });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });

    // Leave board room
    socket.on('leave-board', (boardId) => {
        socket.leave(boardId);
        socket.to(boardId).emit('user-left', {
            userId: socket.id,
            timestamp: new Date()
        });
    });
});

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Socket.IO server is ready`);
});
