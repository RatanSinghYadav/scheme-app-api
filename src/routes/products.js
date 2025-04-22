const { Router } = require('express');
const route = Router();
const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductStats,
  bulkImportProducts
} = require('../controllers/products');

const { protect, authorize } = require('../middleware/auth');

route.get('/api/products/getAllProducts', getProducts);
route.post('/api/products/create', protect, authorize('admin'), createProduct);
route.get('/api/products/getProduct/:id', protect, getProduct);
route.put('/api/products/update/:id', protect, authorize('admin'), updateProduct);
route.delete('/api/products/delete/:id', protect, authorize('admin'), deleteProduct);
route.get('/api/products/stats', protect, getProductStats);
route.post('/api/products/import', protect, authorize('admin'), bulkImportProducts);

module.exports = route;