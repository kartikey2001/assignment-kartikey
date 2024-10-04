const express = require('express');
const router = express.Router();
const tradingBot = require('../services/tradingBot');
const logger = require('../utils/logger');

router.get('/:symbol', async (req, res) => {
  try {
    const price = await tradingBot.getLatestPrice(req.params.symbol);
    res.json({ symbol: req.params.symbol, price });
  } catch (error) {
    logger.error('Error fetching price', { symbol: req.params.symbol, error: error.message });
    res.status(500).json({ error: 'Failed to fetch stock price' });
  }
});

module.exports = router;