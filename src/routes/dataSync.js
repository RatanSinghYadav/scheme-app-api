const { Router } = require('express');
const route = Router();
const {
  syncAll,
  syncProducts,
  syncDistributors
} = require('../controllers/dataSync');
// const { protect, authorize } = require('../middleware/auth');

// Protect all routes and allow only admin
// route.use(protect);
// route.use(authorize('admin')); 

// Routes for data synchronization
route.post('/api/sync/all', syncAll);
route.post('/api/sync/products', syncProducts);
route.post('/api/sync/distributors', syncDistributors);

module.exports = route;
