const mongoose = require('mongoose');

const PortfolioSchema = new mongoose.Schema({
  balance: { type: Number, default: 10000 },
  positions: { type: Map, of: Number, default: {} },
  lastPrices: { type: Map, of: Number, default: {} },
  lastUpdated: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Portfolio', PortfolioSchema);