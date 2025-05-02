const { Router } = require('express');
const route = Router();
const {
  getFilterPresets,
  createFilterPreset,
  deleteFilterPreset
} = require('../controllers/filterPresets');

const { protect } = require('../middleware/auth');

// All routes require authentication
route.use(protect);

route.route('/api/filter-presets')
  .get(getFilterPresets)
  .post(createFilterPreset);

route.route('/api/filter-presets/:id')
  .delete(deleteFilterPreset);

module.exports = route;