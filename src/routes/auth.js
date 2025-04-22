const { Router } = require('express');
const route = Router();
const {
  register,
  login,
  getCurrentUser,
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  resetPassword,
  logout,
  checkEmail
} = require('../controllers/auth');

const { protect, authorize } = require('../middleware/auth');

// Public routes
route.post('/api/auth/register', register);
route.post('/api/auth/login', login);
route.post('/api/auth/check-email', checkEmail);
route.post('/api/auth/logout', logout);

// Protected routes
route.get('/api/auth/getCurrentUser', protect, getCurrentUser);

// Admin only routes
route.get('/api/auth/users', protect, authorize('admin'), getAllUsers);
route.post('/api/auth/users', protect, authorize('admin'), createUser);
route.put('/api/auth/users/:id', protect, authorize('admin'), updateUser);
route.delete('/api/auth/users/:id', protect, authorize('admin'), deleteUser);
route.post('/api/auth/users/:id/reset-password', protect, authorize('admin'), resetPassword);

module.exports = route;