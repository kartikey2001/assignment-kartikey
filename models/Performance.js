const mongoose = require('mongoose');

const PerformanceSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  balance: Number,
  totalValue: Number,
  profitLoss: Number
});

module.exports = mongoose.model('Performance', PerformanceSchema);