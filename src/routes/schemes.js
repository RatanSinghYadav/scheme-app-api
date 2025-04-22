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
  exportScheme
} = require('../controllers/schemes');

const { protect, authorize } = require('../middleware/auth');

route.get('/api/schemes/getAllSchemes',protect,  getSchemes);
route.get('/api/schemes/getScheme/:id',protect,  getScheme);

route.post('/api/schemes/create', protect, authorize('creator', 'admin'), createScheme);
route.put('/api/schemes/update/:id', protect,  authorize('creator', 'admin'), updateScheme);
route.delete('/api/schemes/delete/:id', protect, authorize('admin'), deleteScheme);
route.put('/api/schemes/verify/:id', protect, authorize('verifier', 'admin'), verifyScheme);
route.put('/api/schemes/reject/:id', protect, authorize('verifier', 'admin'), rejectScheme);
route.get('/api/schemes/export/:id', protect, exportScheme);

module.exports = route;