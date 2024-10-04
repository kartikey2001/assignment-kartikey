const mongoose = require('mongoose');

const BotSettingsSchema = new mongoose.Schema({
  buyThreshold: { type: Number, default: -2 },
  sellThreshold: { type: Number, default: 3 }
});

module.exports = mongoose.model('BotSettings', BotSettingsSchema);