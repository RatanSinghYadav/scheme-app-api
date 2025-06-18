const { Router } = require('express');
const route = Router();
const {
  getCombinedSchemes,
  getCombinedScheme,
  getSchemesByCustomer,
  getCombinedSchemeSummary,
  getCustomerSchemeDetails
} = require('../controllers/combinedScheme');

const { protect } = require('../middleware/auth');

// Get all combined schemes
route.get('/api/combined/schemes', getCombinedSchemes);

// Get combined scheme by ID
route.get('/api/combined/schemes/:id', protect, getCombinedScheme);

// Get schemes by customer code
route.get('/api/combined/schemes/customer/:code', protect, getSchemesByCustomer);

// Get combined scheme summary (grouped by customer)
route.get('/api/combined/schemes/summary', protect, getCombinedSchemeSummary);

// Get detailed scheme information for a specific customer
route.get('/api/combined/schemes/customer/details/:code', protect, getCustomerSchemeDetails);

module.exports = route;