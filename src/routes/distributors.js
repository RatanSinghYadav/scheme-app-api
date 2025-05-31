const { Router } = require('express');
const route = Router();
const {
  getDistributors,
  getDistributor,
  createDistributor,
  updateDistributor,
  deleteDistributor,
  bulkUpdateDistributors,
  bulkDeleteDistributors,
} = require('../controllers/distributors');

const { protect, authorize } = require('../middleware/auth');

route.get('/api/distributors/getAllDistributors', getDistributors);
route.post('/api/distributors/create', protect, authorize('admin'), createDistributor);
route.get('/api/distributors/getDistributor/:id', protect, getDistributor);
route.put('/api/distributors/update/:id', protect, authorize('admin'), updateDistributor);
route.delete('/api/distributors/delete/:id', protect, authorize('admin'), deleteDistributor);

// बल्क ऑपरेशन राउट्स जोड़ें
route.put('/api/distributors/bulk-update', protect, authorize('admin'), bulkUpdateDistributors);
route.delete('/api/distributors/bulk-delete', protect, authorize('admin'), bulkDeleteDistributors);

module.exports = route;