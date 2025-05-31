const { Router } = require('express');
const route = Router();
const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductStats,
  bulkImportProducts,
  bulkUpdateProducts,
  bulkDeleteProducts,
  findDuplicateProducts,
  deleteDuplicateProducts,
} = require('../controllers/products');

const { protect, authorize } = require('../middleware/auth');

route.get('/api/products/getAllProducts', getProducts);
route.post('/api/products/create', protect, authorize('admin'), createProduct);
route.get('/api/products/getProduct/:id', protect, getProduct);
route.put('/api/products/update/:id', protect, authorize('admin'), updateProduct);
route.delete('/api/products/delete/:id', protect, authorize('admin'), deleteProduct);
route.get('/api/products/stats', protect, getProductStats);
route.post('/api/products/import', protect, authorize('admin'), bulkImportProducts);

// बल्क ऑपरेशन राउट्स जोड़ें
route.put('/api/products/bulk-update', protect, authorize('admin'), bulkUpdateProducts);
route.delete('/api/products/bulk-delete', protect, authorize('admin'), bulkDeleteProducts);
route.get('/api/products/find-duplicates', protect, findDuplicateProducts);
// पुराना कोड
// route.delete('/api/products/delete-duplicates', protect, authorize('admin'), deleteDuplicateProducts);

// नया कोड
route.delete('/api/products/delete-duplicates', deleteDuplicateProducts);

module.exports = route;