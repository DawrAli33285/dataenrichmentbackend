// models/enrichedFile.js
const mongoose = require('mongoose');

const enrichedFileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true,
  },
  cloudinaryUrl: {
    type: String,
    required: true,
  },
  originalName: {
    type: String,
  },
  totalRecords: {
    type: Number,
  },
  enrichedRecords: {
    type: Number,
  },
  amountCharged: {
    type: Number,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('EnrichedFile', enrichedFileSchema);