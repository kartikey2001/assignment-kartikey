const logger = require('../utils/logger');
const finnhubClient = require('../config/finnhub');
const Portfolio = require('../models/Portfolio');
const Trade = require('../models/Trade');
const Config = require('../models/Config');
const BotSettings = require('../models/BotSettings');
const Performance = require('../models/Performance');

async function getLatestPrice(symbol) {
  return new Promise((resolve, reject) => {
    finnhubClient.quote(symbol, (error, data, response) => {
      if (error) {
        logger.error('Error fetching stock price', { symbol, error: error.message });
        reject(error);
      } else if (data.c === 0 && data.h === 0 && data.l === 0 && data.o === 0) {
        logger.error('Invalid symbol or no data available', { symbol });
        reject(new Error('Invalid symbol or no data available'));
      } else {
        logger.info('Fetched stock price', { symbol, price: data.c });
        resolve(data.c); // Current price
      }
    });
  });
}

async function executeStrategy(symbol) {
  try {
    let portfolio = await Portfolio.findOne();
    if (!portfolio) {
      portfolio = new Portfolio();
      await portfolio.save();
    }

    const settings = await BotSettings.findOne() || new BotSettings();
    const currentPrice = await getLatestPrice(symbol);
    const lastPrice = portfolio.lastPrices.get(symbol) || currentPrice;
    const priceChange = (currentPrice - lastPrice) / lastPrice;

    if (priceChange <= settings.buyThreshold / 100 && portfolio.balance >= currentPrice) {
      // Buy condition
      const quantity = Math.floor(portfolio.balance / currentPrice);
      portfolio.positions.set(symbol, (portfolio.positions.get(symbol) || 0) + quantity);
      portfolio.balance -= quantity * currentPrice;
      logger.info('Bought shares', { symbol, quantity, price: currentPrice });
      
      await new Trade({ symbol, type: 'buy', quantity, price: currentPrice }).save();
    } else if (priceChange >= settings.sellThreshold / 100 && portfolio.positions.get(symbol) > 0) {
      // Sell condition
      const quantity = portfolio.positions.get(symbol);
      portfolio.balance += quantity * currentPrice;
      portfolio.positions.set(symbol, 0);
      logger.info('Sold shares', { symbol, quantity, price: currentPrice });
      
      await new Trade({ symbol, type: 'sell', quantity, price: currentPrice }).save();
    }

    portfolio.lastPrices.set(symbol, currentPrice);
    await portfolio.save();

    // Update performance
    const totalValue = portfolio.balance + Array.from(portfolio.positions.entries()).reduce((total, [sym, qty]) => {
      return total + qty * (portfolio.lastPrices.get(sym) || 0);
    }, 0);

    await new Performance({
      balance: portfolio.balance,
      totalValue: totalValue,
      profitLoss: totalValue - 10000 // Assuming initial balance was 10000
    }).save();

    return { price: currentPrice, position: portfolio.positions.get(symbol) || 0, balance: portfolio.balance };
  } catch (error) {
    logger.error('Error executing strategy', { symbol, error: error.message });
    throw error;
  }
}

async function executeTrades() {
  try {
    const config = await Config.findOne();
    if (config && config.tradingSymbols.length > 0) {
      logger.info('Executing scheduled trades', { symbols: config.tradingSymbols });
      for (const symbol of config.tradingSymbols) {
        await executeStrategy(symbol);
      }
    } else {
      logger.warn('No trading symbols configured');
    }
  } catch (error) {
    logger.error('Error in scheduled trading job', { error: error.message });
  }
}

module.exports = {
  getLatestPrice,
  executeStrategy,
  executeTrades
};