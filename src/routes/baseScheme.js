const { Router } = require('express');
const route = Router();
const {
  getSchemes,
  getScheme,
  createScheme,
  updateScheme,
  deleteScheme,
  verifyScheme, 
  rejectScheme,
  exportScheme,
  exportSchemesByDate  // Add this new controller
} = require('../controllers/baseScheme');

const { protect, authorize } = require('../middleware/auth');

route.get('/api/base/schemes/getAllSchemes',  getSchemes);
route.get('/api/base/schemes/getScheme/:id',protect,  getScheme);

route.post('/api/base/schemes/create', protect, authorize('creator', 'admin'), createScheme);
route.put('/api/base/schemes/update/:id', protect,  authorize('creator', 'admin'), updateScheme);
route.delete('/api/base/schemes/delete/:id', protect, authorize('admin'), deleteScheme);
route.put('/api/base/schemes/verify/:id', protect, authorize('verifier', 'admin'), verifyScheme);
route.put('/api/base/schemes/reject/:id', protect, authorize('verifier', 'admin'), rejectScheme);
route.get('/api/base/schemes/export/:id', protect, exportScheme);
// Add new route for exporting schemes by date range
route.get('/api/base/schemes/exportByDate',  exportSchemesByDate);

module.exports = route;