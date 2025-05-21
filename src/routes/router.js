const Router = require('express');
const route = Router();

// Import all route files
const authRoutes = require('./auth');
const schemeRoutes = require('./schemes');
const baseSchemeRoutes = require('./baseScheme');
const distributorRoutes = require('./distributors');
const productRoutes = require('./products');
const dashboardRoutes = require('./dashboard');
const filterPresetRoutes = require('./filterPresets');
const dataSyncRoutes = require('./dataSync'); // Added new route

// Mount routes with their respective paths
route.use(authRoutes);
route.use(schemeRoutes);
route.use(baseSchemeRoutes);
route.use(distributorRoutes);
route.use(productRoutes);
route.use(dashboardRoutes);
route.use(filterPresetRoutes);
route.use(dataSyncRoutes); 

module.exports = route;