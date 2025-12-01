const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const path = require('path');
const config = require('./config');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const Board = require('./models/Board');

dotenv.config();

const app = express();
const PORT = config.PORT;

// Create HTTP server
const server = http.createServer(app);

// Setup Socket.IO with CORS
const io = new Server(server, {
    cors: {
        origin: config.CLIENT_ORIGIN,
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const authRoute = require('./routes/auth');
const boardRoute = require('./routes/boards');
const uploadRoute = require('./routes/upload');
const userRoute = require('./routes/users');

app.use('/api/auth', authRoute);
app.use('/api/boards', boardRoute);
app.use('/api/upload', uploadRoute);
app.use('/api/users', userRoute);

mongoose.connect(config.MONGODB_URI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error(err));

app.get('/', (req, res) => {
    res.send('Uniboard API is running');
});

// Socket.IO Middleware for Authentication
io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (token) {
        const tokenString = token.split(" ")[1]; // Remove "Bearer "
        jwt.verify(tokenString, process.env.JWT_SECRET || 'secret', (err, user) => {
            if (!err) {
                socket.user = user;
            }
            // We don't reject connection if token is invalid/missing, 
            // because unauthenticated users can still view public boards.
            // Authorization is checked per-event.
            next();
        });
    } else {
        next();
    }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
    //console.log('User connected:', socket.id, socket.user ? `(${socket.user.username})` : '(Guest)');

    // Join a specific board room
    socket.on('join-board', (boardId) => {
        socket.join(boardId);
        // console.log(`User ${socket.id} joined board ${boardId}`);

        // Notify others in the room
        socket.to(boardId).emit('user-joined', {
            userId: socket.id,
            username: socket.user ? socket.user.username : 'Guest',
            timestamp: new Date()
        });
    });

    // Handle element updates
    socket.on('element-update', async ({ boardId, elements }) => {
        try {
            const board = await Board.findById(boardId);
            if (!board) return;

            
            const userId = socket.user ? socket.user.id : null;
            const isOwner = userId && board.user.toString() === userId;
            const isEditor = userId && board.editors.some(id => id.toString() === userId);
            const isPublicEdit = board.visibility === 'public-edit';

            if (isOwner || isEditor || isPublicEdit) {
                // Broadcast to all other users in the board (real-time)
                socket.to(boardId).emit('elements-updated', elements);

                // Save to database
                await Board.findByIdAndUpdate(boardId, { elements });
                // console.log(`💾 Saved board ${boardId} to database`);
            } else {

                //console.warn(`⚠️ Unauthorized update attempt on board ${boardId} by user ${userId || 'Guest'}`);
                // Optionally emit an error back to the sender
                socket.emit('error', { message: 'Unauthorized to edit this board' });
            }
        } catch (err) {
            console.error('Error processing element-update:', err);
        }
    });

    // Handle single element changes (more efficient)
    socket.on('element-change', async ({ boardId, element, action }) => {
        try {
            const board = await Board.findById(boardId);
            if (!board) return;

            const userId = socket.user ? socket.user.id : null;
            const isOwner = userId && board.user.toString() === userId;
            const isEditor = userId && board.collaborators.some(c => c.user.toString() === userId && c.role === 'editor');
            const isPublicEdit = board.visibility === 'public-edit';

            if (isOwner || isEditor || isPublicEdit) {
                socket.to(boardId).emit('element-changed', { element, action });
            }
        } catch (err) {
            console.error('Error processing element-change:', err);
        }
    });

    // Handle cursor movement (optional - for showing other users' cursors)
    socket.on('cursor-move', ({ boardId, position }) => {
        socket.to(boardId).emit('cursor-moved', {
            userId: socket.id,
            username: socket.user ? socket.user.username : 'Guest',
            position
        });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        // console.log('User disconnected:', socket.id);
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
