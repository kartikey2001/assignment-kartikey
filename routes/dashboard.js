const express = require('express');
const router = express.Router();
const Portfolio = require('../models/Portfolio');
const Trade = require('../models/Trade');
const Performance = require('../models/Performance');
const Config = require('../models/Config');

router.get('/', async (req, res) => {
  try {
    const portfolio = await Portfolio.findOne();
    const recentTrades = await Trade.find().sort('-timestamp').limit(10);
    const performances = await Performance.find().sort('-date').limit(30);
    const config = await Config.findOne();

    res.render('dashboard', {
      portfolio,
      recentTrades,
      performances,
      tradingSymbols: config ? config.tradingSymbols : []
    });
  } catch (error) {
    res.status(500).send('Error loading dashboard');
  }
});

module.exports = router;