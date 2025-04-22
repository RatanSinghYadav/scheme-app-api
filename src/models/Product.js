const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  ITEMID: {
    type: String,
    default: null,
    trim: true
  },
  ITEMNAME: {
    type: String,
    default: null,
    trim: true
  },
  BRANDNAME: {
    type: String,
    default: null,
    trim: true
  },
  FLAVOURTYPE: {
    type: String,
    default: null,
    trim: true
  },
  PACKTYPEGROUPNAME: {
    type: String,
    default: null,
    trim: true
  },
  Style: {
    type: String,
    default: null,
    trim: true
  },
  PACKTYPE: {
    type: String,
    default: null,
    trim: true
  },
  Configuration: {
    type: String,
    default: null,
    trim: true
  },
  NOB: {
    type: Number,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Product', ProductSchema);