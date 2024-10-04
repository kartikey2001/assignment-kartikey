const express = require('express');
const router = express.Router();
const Performance = require('../models/Performance');
const logger = require('../utils/logger');

router.get('/', async (req, res) => {
  try {
    const performances = await Performance.find().sort('-date').limit(30);
    res.json(performances);
  } catch (error) {
    logger.error('Error fetching performance data', { error: error.message });
    res.status(500).json({ error: 'An error occurred while fetching performance data' });
  }
});

module.exports = router;