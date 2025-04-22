const Router = require('express');
const route = Router();

// Import all route files
const authRoutes = require('./auth');
const schemeRoutes = require('./schemes');
const distributorRoutes = require('./distributors');
const productRoutes = require('./products');
const dashboardRoutes = require('./dashboard');

// Mount routes with their respective paths
route.use(authRoutes);
route.use(schemeRoutes);
route.use(distributorRoutes);
route.use(productRoutes);
route.use(dashboardRoutes);

module.exports = route;