const mongoose = require('mongoose');

const TradeSchema = new mongoose.Schema({
  symbol: String,
  type: String,
  quantity: Number,
  price: Number,
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Trade', TradeSchema);