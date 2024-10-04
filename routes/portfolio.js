const express = require('express');
const router = express.Router();
const Portfolio = require('../models/Portfolio');
const logger = require('../utils/logger');

router.get('/', async (req, res) => {
  try {
    const portfolio = await Portfolio.findOne();
    if (!portfolio) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }

    const totalValue = portfolio.balance + Array.from(portfolio.positions.entries()).reduce((total, [symbol, quantity]) => {
      const price = portfolio.lastPrices.get(symbol) || 0;
      return total + quantity * price;
    }, 0);

    const response = {
      balance: portfolio.balance,
      positions: Object.fromEntries(portfolio.positions),
      totalValue: totalValue,
      profitLoss: totalValue - 10000 // Assuming initial balance was 10000
    };

    res.json(response);
  } catch (error) {
    logger.error('Error fetching portfolio', { error: error.message });
    res.status(500).json({ error: 'An error occurred while fetching the portfolio' });
  }
});

module.exports = router;