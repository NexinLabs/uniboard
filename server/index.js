const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

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

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
