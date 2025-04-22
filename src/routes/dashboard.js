const { Router } = require('express');
const route = Router();
const {
  getDashboardStats,
  getRecentActivities
} = require('../controllers/dashboard');

const { protect } = require('../middleware/auth');

route.get('/api/dashboard/stats', protect, getDashboardStats);
route.get('/api/dashboard/activities', protect, getRecentActivities);

module.exports = route;