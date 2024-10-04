require('dotenv').config();
const express = require('express');
const path = require('path');
const cron = require('node-cron');
const connectDB = require('./config/database');
const logger = require('./utils/logger');
const tradingBot = require('./services/tradingBot');
const symbolsRoutes = require('./routes/symbols');

const app = express();
const port = process.env.PORT || 3000;

// Connect to database
connectDB();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
app.use('/', require('./routes/dashboard'));
app.use('/trade', require('./routes/trade'));
app.use('/portfolio', require('./routes/portfolio'));
app.use('/performance', require('./routes/performance'));
app.use('/bot', require('./routes/botSettings'));
app.use('/symbols', symbolsRoutes); // Add this line
app.use('/price', require('./routes/price'));

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(500).json({ 
    error: 'An unexpected error occurred',
    message: process.env.NODE_ENV === 'production' ? 'Invalid input or server error' : err.message
  });
});

// Cron job for automated trading
cron.schedule('*/5 * * * *', tradingBot.executeTrades);

// Start server
app.listen(port, () => {
  logger.info(`Trading bot server listening at http://localhost:${port}`);
});