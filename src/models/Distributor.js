const mongoose = require('mongoose');

const DistributorSchema = new mongoose.Schema({
  SMCODE: {
    type: String,
    default: null,
    trim: true
  },
  CUSTOMERACCOUNT: {
    type: String,
    default: null,
    trim: true
  },
  ORGANIZATIONNAME: {
    type: String,
    default: null,
    trim: true,
  },
  ADDRESSCITY: {
    type: String,
    default: null,
  },
  CUSTOMERGROUPID: {
    type: String,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Distributor', DistributorSchema);