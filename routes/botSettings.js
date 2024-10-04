const express = require('express');
const router = express.Router();
const BotSettings = require('../models/BotSettings');
const logger = require('../utils/logger');

router.get('/settings', async (req, res) => {
  try {
    const settings = await BotSettings.findOne() || new BotSettings();
    res.json(settings);
  } catch (error) {
    logger.error('Error fetching bot settings', { error: error.message });
    res.status(500).json({ error: 'An error occurred while fetching bot settings' });
  }
});

router.post('/settings', async (req, res) => {
  try {
    const { buyThreshold, sellThreshold } = req.body;
    
    if (typeof buyThreshold !== 'number' || typeof sellThreshold !== 'number') {
      return res.status(400).json({ error: 'Invalid input', message: 'Thresholds must be numbers' });
    }

    let settings = await BotSettings.findOne();
    if (!settings) {
      settings = new BotSettings();
    }

    settings.buyThreshold = buyThreshold;
    settings.sellThreshold = sellThreshold;
    await settings.save();

    logger.info('Updated bot settings', { buyThreshold, sellThreshold });
    res.json({ message: 'Bot settings updated successfully', settings });
  } catch (error) {
    logger.error('Error updating bot settings', { error: error.message });
    res.status(500).json({ error: 'An error occurred while updating bot settings' });
  }
});

module.exports = router;