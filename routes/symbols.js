const express = require('express');
const router = express.Router();
const Config = require('../models/Config');
const logger = require('../utils/logger');

// Get all trading symbols
router.get('/', async (req, res) => {
  try {
    const config = await Config.findOne();
    res.json(config ? config.tradingSymbols : []);
  } catch (error) {
    logger.error('Error fetching trading symbols', { error: error.message });
    res.status(500).json({ error: 'An error occurred while fetching trading symbols' });
  }
});

// Add new trading symbols
router.post('/', async (req, res) => {
  try {
    const { symbol } = req.body;
    if (!symbol) {
      return res.status(400).json({ error: 'Invalid input', message: 'Symbol is required' });
    }

    let config = await Config.findOne();
    if (!config) {
      config = new Config({ tradingSymbols: [] });
    }

    if (!config.tradingSymbols.includes(symbol)) {
      config.tradingSymbols.push(symbol);
      await config.save();
      logger.info('Added new trading symbol', { symbol });
    }

    res.json({ message: 'Trading symbol added successfully', symbols: config.tradingSymbols });
  } catch (error) {
    logger.error('Error adding trading symbol', { error: error.message });
    res.status(500).json({ error: 'An error occurred while adding the trading symbol' });
  }
});

// Remove a trading symbol
router.delete('/', async (req, res) => {
  try {
    const { symbol } = req.body;
    if (!symbol) {
      return res.status(400).json({ error: 'Invalid input', message: 'Symbol is required' });
    }

    const config = await Config.findOne();
    if (!config) {
      return res.status(404).json({ error: 'Not found', message: 'No configuration found' });
    }

    config.tradingSymbols = config.tradingSymbols.filter(s => s !== symbol);
    await config.save();

    logger.info('Removed trading symbol', { symbol });
    res.json({ message: 'Trading symbol removed successfully', symbols: config.tradingSymbols });
  } catch (error) {
    logger.error('Error removing trading symbol', { error: error.message });
    res.status(500).json({ error: 'An error occurred while removing the trading symbol' });
  }
});

module.exports = router;