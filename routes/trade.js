const express = require('express');
const router = express.Router();
const tradingBot = require('../services/tradingBot');

router.get('/:symbol', async (req, res) => {
  try {
    const result = await tradingBot.executeStrategy(req.params.symbol);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to execute trading strategy' });
  }
});

module.exports = router;