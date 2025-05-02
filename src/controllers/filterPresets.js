const FilterPreset = require('../models/FilterPreset');

// @desc    Get all filter presets for the current user
// @route   GET /api/filter-presets
// @access  Private
exports.getFilterPresets = async (req, res) => {
  try {
    const filterPresets = await FilterPreset.find({ user: req.user.id });
    
    res.status(200).json({
      success: true,
      count: filterPresets.length,
      data: filterPresets
    });
  } catch (error) {
    console.error('Error fetching filter presets:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Create a new filter preset
// @route   POST /api/filter-presets
// @access  Private
exports.createFilterPreset = async (req, res) => {
  try {
    // Add user to request body
    req.body.user = req.user.id;
    
    const filterPreset = await FilterPreset.create(req.body);
    
    res.status(201).json({
      success: true,
      data: filterPreset
    });
  } catch (error) {
    console.error('Error creating filter preset:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Delete a filter preset
// @route   DELETE /api/filter-presets/:id
// @access  Private
exports.deleteFilterPreset = async (req, res) => {
  try {
    const filterPreset = await FilterPreset.findById(req.params.id);
    
    if (!filterPreset) {
      return res.status(404).json({
        success: false,
        error: 'Filter preset not found'
      });
    }
    
    // Make sure user owns the filter preset
    if (filterPreset.user.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to delete this filter preset'
      });
    }
    
    await filterPreset.remove();
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    console.error('Error deleting filter preset:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};