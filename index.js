require('dotenv').config();
const express = require('express');
const finnhub = require('finnhub');
const mongoose = require('mongoose');
const winston = require('winston');
const cron = require('node-cron');
const path = require('path');

// Setup logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

const app = express();
const port = process.env.PORT || 3000;

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
})
.then(() => logger.info('Connected to MongoDB Atlas'))
.catch(err => logger.error('Could not connect to MongoDB Atlas', { error: err.message }));

// Define MongoDB schemas and models
const TradeSchema = new mongoose.Schema({
  symbol: String,
  type: String,
  quantity: Number,
  price: Number,
  timestamp: { type: Date, default: Date.now }
});

const PortfolioSchema = new mongoose.Schema({
  balance: Number,
  positions: { type: Map, of: Number },
  lastUpdated: { type: Date, default: Date.now }
});

const Trade = mongoose.model('Trade', TradeSchema);
const Portfolio = mongoose.model('Portfolio', PortfolioSchema);

// Add this new schema
const PerformanceSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  balance: Number,
  totalValue: Number,
  profitLoss: Number
});

const Performance = mongoose.model('Performance', PerformanceSchema);

// Setup Finnhub client
const api_key = finnhub.ApiClient.instance.authentications['api_key'];
api_key.apiKey = process.env.FINNHUB_API_KEY;
const finnhubClient = new finnhub.DefaultApi();

// Trading bot state (now we'll load this from the database)
let balance = 10000;
let positions = {};
let lastPrices = {};

// Function to fetch latest stock price
function getLatestPrice(symbol) {
  return new Promise((resolve, reject) => {
    finnhubClient.quote(symbol, (error, data, response) => {
      if (error) {
        logger.error('Error fetching stock price', { symbol, error: error.message });
        reject(error);
      } else if (data.c === 0 && data.h === 0 && data.l === 0 && data.o === 0) {
        // If all price fields are 0, it's likely an invalid symbol
        logger.error('Invalid symbol or no data available', { symbol });
        reject(new Error('Invalid symbol or no data available'));
      } else {
        logger.info('Fetched stock price', { symbol, price: data.c });
        resolve(data.c); // Current price
      }
    });
  });
}

// Modify the updatePortfolio function
async function updatePortfolio() {
  const portfolio = await Portfolio.findOneAndUpdate({}, { balance, positions }, { upsert: true, new: true }).exec();
  logger.info('Updated portfolio', { balance: portfolio.balance, positionsCount: Object.keys(portfolio.positions).length });
  
  // Calculate total value of positions
  let totalPositionsValue = 0;
  for (const [symbol, quantity] of Object.entries(positions)) {
    const price = await getLatestPrice(symbol);
    totalPositionsValue += price * quantity;
  }

  const totalValue = balance + totalPositionsValue;
  
  // Calculate profit/loss
  const initialBalance = 10000; // Assuming this was our starting balance
  const profitLoss = totalValue - initialBalance;

  // Record performance
  await new Performance({
    balance,
    totalValue,
    profitLoss
  }).save();

  return portfolio;
}

// Trading strategy
async function executeStrategy(symbol) {
  try {
    const currentPrice = await getLatestPrice(symbol);
    const lastPrice = lastPrices[symbol] || currentPrice;
    const priceChange = (currentPrice - lastPrice) / lastPrice;

    // Fetch bot settings
    const settings = await BotSettings.findOne() || new BotSettings();

    if (priceChange <= settings.buyThreshold / 100 && balance > currentPrice) {
      // Buy condition: price dropped by buyThreshold% or more and we have enough balance
      const quantity = Math.floor(balance / currentPrice);
      positions[symbol] = (positions[symbol] || 0) + quantity;
      balance -= quantity * currentPrice;
      logger.info('Bought shares', { symbol, quantity, price: currentPrice });
      
      // Record the trade
      await new Trade({ symbol, type: 'buy', quantity, price: currentPrice }).save();
      await updatePortfolio();
    } else if (priceChange >= settings.sellThreshold / 100 && positions[symbol] > 0) {
      // Sell condition: price increased by sellThreshold% or more and we have positions to sell
      const quantity = positions[symbol];
      balance += quantity * currentPrice;
      positions[symbol] = 0;
      logger.info('Sold shares', { symbol, quantity, price: currentPrice });
      
      // Record the trade
      await new Trade({ symbol, type: 'sell', quantity, price: currentPrice }).save();
      await updatePortfolio();
    }

    lastPrices[symbol] = currentPrice;
    return { price: currentPrice, position: positions[symbol] || 0, balance };
  } catch (error) {
    logger.error('Error executing strategy', { symbol, error: error.message });
    throw error;
  }
}

// Add this function to execute trades for multiple symbols
async function executeTrades(symbols) {
  for (const symbol of symbols) {
    if (symbol === 'INVALID_SYMBOL') {
      logger.warn(`Skipping invalid symbol: ${symbol}`);
      continue;
    }
    try {
      logger.info(`Executing trade for ${symbol}`);
      await executeStrategy(symbol);
    } catch (error) {
      logger.error(`Error executing trade for ${symbol}`, { error: error.message });
    }
  }
}

// Load initial portfolio state from database
async function loadPortfolio() {
  try {
    const portfolio = await Portfolio.findOne();
    if (portfolio) {
      balance = portfolio.balance;
      positions = portfolio.positions.toObject();
      logger.info('Loaded portfolio from database', { balance, positions });
    } else {
      balance = 10000; // Set initial balance
      positions = {};
      logger.info('No existing portfolio found, using default values', { balance, positions });
      await updatePortfolio(); // Save the initial portfolio
    }
  } catch (error) {
    logger.error('Error loading portfolio', { error: error.message });
  }
}

loadPortfolio().catch(error => logger.error('Failed to load portfolio', { error: error.message }));

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  
  // Send a user-friendly error message
  res.status(500).json({ 
    error: 'An unexpected error occurred',
    message: process.env.NODE_ENV === 'production' ? 'Invalid input or server error' : err.message
  });
});

// Set up EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files from a 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Add this route for the dashboard
app.get('/dashboard', async (req, res) => {
  try {
    const portfolio = await Portfolio.findOne();
    const recentTrades = await Trade.find().sort('-timestamp').limit(10);
    const performances = await Performance.find().sort('-date').limit(30);
    const config = await Config.findOne();

    // Ensure we have a valid config with trading symbols
    const tradingSymbols = config ? config.tradingSymbols.filter(symbol => symbol && symbol !== 'INVALID_SYMBOL') : [];

    // Convert positions Map to a plain object
    const positions = portfolio ? Object.fromEntries(portfolio.positions) : {};

    logger.info('Rendering dashboard', { 
      portfolioBalance: portfolio ? portfolio.balance : 'No portfolio found',
      positionsCount: Object.keys(positions).length,
      tradingSymbolsCount: tradingSymbols.length
    });

    res.render('dashboard', {
      portfolio: portfolio ? {
        balance: portfolio.balance,
        positions: positions
      } : null,
      recentTrades,
      performances,
      tradingSymbols
    });
  } catch (error) {
    logger.error('Error rendering dashboard', { error: error.message });
    res.status(500).send('Error loading dashboard');
  }
});

// Modify the root route to redirect to the dashboard
app.get('/', (req, res) => {
  res.redirect('/dashboard');
});

// Route to fetch stock price
app.get('/price/:symbol', async (req, res, next) => {
  try {
    const price = await getLatestPrice(req.params.symbol);
    res.json({ symbol: req.params.symbol, price: price });
  } catch (error) {
    if (error.message === 'Invalid symbol or no data available') {
      res.status(400).json({ error: 'Invalid symbol', message: 'The provided stock symbol is invalid or no data is available.' });
    } else {
      next(error);
    }
  }
});

// Route to execute trading strategy
app.get('/trade/:symbol', async (req, res, next) => {
  try {
    const result = await executeStrategy(req.params.symbol);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Add a new route to get performance data
app.get('/performance', async (req, res, next) => {
  try {
    const performances = await Performance.find().sort('-date').limit(30); // Get last 30 days
    res.json(performances);
  } catch (error) {
    next(error);
  }
});

// Modify the /portfolio route to include more information
app.get('/portfolio', async (req, res, next) => {
  try {
    const portfolio = await Portfolio.findOne();
    if (portfolio) {
      let totalValue = portfolio.balance;
      const positions = {};
      for (const [symbol, quantity] of portfolio.positions.entries()) {
        const price = await getLatestPrice(symbol);
        const value = price * quantity;
        totalValue += value;
        positions[symbol] = { quantity, price, value };
      }
      const initialBalance = 10000; // Assuming this was our starting balance
      const profitLoss = totalValue - initialBalance;
      res.json({
        balance: portfolio.balance,
        positions,
        totalValue,
        profitLoss
      });
    } else {
      res.json({ balance, positions });
    }
  } catch (error) {
    next(error);
  }
});

// Route to get trade history
app.get('/trades', async (req, res, next) => {
  try {
    const trades = await Trade.find().sort('-timestamp').limit(50);
    res.json(trades);
  } catch (error) {
    next(error);
  }
});

// Add this new schema near your other schemas
const ConfigSchema = new mongoose.Schema({
  tradingSymbols: [String]
});

const Config = mongoose.model('Config', ConfigSchema);

// Modify the cron job
cron.schedule('*/5 * * * *', async () => {
  logger.info('Running scheduled trading job');
  try {
    const config = await Config.findOne();
    if (config && config.tradingSymbols.length > 0) {
      logger.info('Trading symbols', { symbols: config.tradingSymbols }); // Add this line
      await executeTrades(config.tradingSymbols);
    } else {
      logger.warn('No trading symbols configured');
    }
  } catch (error) {
    logger.error('Error in scheduled trading job', { error: error.message });
  }
});

// Add a new route to update trading symbols
app.post('/config/symbols', express.json(), async (req, res, next) => {
  try {
    const { symbols } = req.body;
    if (!Array.isArray(symbols)) {
      return res.status(400).json({ error: 'Invalid input', message: 'Symbols must be an array' });
    }
    // Filter out 'INVALID_SYMBOL' and empty strings
    const validSymbols = symbols.filter(symbol => symbol && symbol !== 'INVALID_SYMBOL');
    
    // Find the existing config or create a new one
    let config = await Config.findOne();
    if (!config) {
      config = new Config({ tradingSymbols: [] });
    }
    
    // Add new symbols to the existing array, avoiding duplicates
    config.tradingSymbols = [...new Set([...config.tradingSymbols, ...validSymbols])];
    
    await config.save();
    
    logger.info('Updated trading symbols', { symbols: config.tradingSymbols });
    res.json({ message: 'Trading symbols updated successfully', symbols: config.tradingSymbols });
  } catch (error) {
    next(error);
  }
});

async function cleanInvalidSymbols() {
  try {
    const config = await Config.findOne();
    if (config) {
      const validSymbols = config.tradingSymbols.filter(symbol => symbol !== 'INVALID_SYMBOL');
      if (validSymbols.length !== config.tradingSymbols.length) {
        await Config.findOneAndUpdate({}, { tradingSymbols: validSymbols });
        logger.info('Cleaned invalid symbols from database', { symbols: validSymbols });
      }
    }
  } catch (error) {
    logger.error('Error cleaning invalid symbols', { error: error.message });
  }
}

async function initializePortfolio() {
  let portfolio = await Portfolio.findOne();
  if (!portfolio) {
    portfolio = new Portfolio({ balance: 10000, positions: new Map() });
    await portfolio.save();
    logger.info('Initialized new portfolio with 10000 balance');
  }
  return portfolio;
}

// Call this function before starting the server
cleanInvalidSymbols()
  .then(initializePortfolio)
  .then((portfolio) => {
    logger.info('Initial portfolio state', { 
      balance: portfolio.balance, 
      positionsCount: portfolio.positions.size 
    });
    app.listen(port, () => {
      logger.info(`Trading bot server listening at http://localhost:${port}`);
    });
  })
  .catch(error => {
    logger.error('Failed to initialize application', { error: error.message });
    process.exit(1);
  });

app.get('/config/symbols', async (req, res, next) => {
  try {
    const config = await Config.findOne();
    const symbols = config ? config.tradingSymbols : [];
    res.json(symbols);
  } catch (error) {
    next(error);
  }
});

// Add this near your other schemas
const BotSettingsSchema = new mongoose.Schema({
  buyThreshold: { type: Number, default: -2 },
  sellThreshold: { type: Number, default: 3 }
});

const BotSettings = mongoose.model('BotSettings', BotSettingsSchema);

// Add this route to handle bot settings updates
app.post('/bot/settings', express.json(), async (req, res, next) => {
  try {
    const { buyThreshold, sellThreshold } = req.body;
    
    // Validate input
    if (typeof buyThreshold !== 'number' || typeof sellThreshold !== 'number') {
      return res.status(400).json({ error: 'Invalid input', message: 'Thresholds must be numbers' });
    }

    // Find existing settings or create new ones
    let settings = await BotSettings.findOne();
    if (!settings) {
      settings = new BotSettings();
    }

    // Update settings
    settings.buyThreshold = buyThreshold;
    settings.sellThreshold = sellThreshold;
    await settings.save();

    logger.info('Updated bot settings', { buyThreshold, sellThreshold });
    res.json({ message: 'Bot settings updated successfully', settings });
  } catch (error) {
    logger.error('Error updating bot settings', { error: error.message });
    next(error);
  }
});

// Add this route to get current bot settings
app.get('/bot/settings', async (req, res, next) => {
  try {
    const settings = await BotSettings.findOne() || new BotSettings();
    res.json(settings);
  } catch (error) {
    next(error);
  }
});

// Add this new route to delete a symbol
app.delete('/config/symbols', express.json(), async (req, res, next) => {
  try {
    const { symbol } = req.body;
    if (!symbol) {
      return res.status(400).json({ error: 'Invalid input', message: 'Symbol is required' });
    }
    
    let config = await Config.findOne();
    if (!config) {
      return res.status(404).json({ error: 'Not found', message: 'No configuration found' });
    }
    
    // Remove the symbol from the array
    config.tradingSymbols = config.tradingSymbols.filter(s => s !== symbol);
    
    await config.save();
    
    logger.info('Deleted trading symbol', { symbol });
    res.json({ message: 'Trading symbol deleted successfully', symbols: config.tradingSymbols });
  } catch (error) {
    next(error);
  }
});