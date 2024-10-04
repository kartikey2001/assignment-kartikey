const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    logger.info('Connected to MongoDB Atlas');
  } catch (err) {
    logger.error('Could not connect to MongoDB Atlas', { error: err.message });
    process.exit(1);
  }
};

module.exports = connectDB;