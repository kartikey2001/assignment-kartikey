const mongoose = require('mongoose');

const ConfigSchema = new mongoose.Schema({
  tradingSymbols: [String]
});

module.exports = mongoose.model('Config', ConfigSchema);