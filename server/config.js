const dotenv = require('dotenv');
dotenv.config();


const config = {
    PORT : process.env.PORT || 5000,
    CLIENT_ORIGIN : process.env.CLIENT_ORIGIN || "http://localhost:5173",
    MONGODB_URI : process.env.MONGODB_URI || "mongodb://localhost:27017/uniboard",
    JWT : {
        SECRET : process.env.JWT_SECRET,
        EXPIRES_IN : process.env.JWT_EXPIRES_IN || "1d",
        COOKIE_EXPIRES_IN : process.env.JWT_COOKIE_EXPIRES_IN || "7d",
    }
}

if (!config.JWT.SECRET) {
    throw new Error("JWT_SECRET is not defined");
}

module.exports = config;
