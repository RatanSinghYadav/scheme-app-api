const Distributor = require('../models/Distributor');

// @desc    Get all distributors
// @route   GET /api/distributors
// @access  Private
exports.getDistributors = async (req, res) => {
  try {
    let query;

    // Copy req.query
    const reqQuery = { ...req.query };

    // Fields to exclude
    const removeFields = ['select', 'sort'];

    // Loop over removeFields and delete them from reqQuery
    removeFields.forEach(param => delete reqQuery[param]);

    // Create query string
    let queryStr = JSON.stringify(reqQuery);

    // Create operators ($gt, $gte, etc)
    queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);

    // Finding resource
    query = Distributor.find(JSON.parse(queryStr));

    // Select Fields
    if (req.query.select) {
      const fields = req.query.select.split(',').join(' ');
      query = query.select(fields);
    }

    // Sort
    if (req.query.sort) {
      const sortBy = req.query.sort.split(',').join(' ');
      query = query.sort(sortBy);
    } else {
      query = query.sort('ORGANIZATIONNAME');
    }

    // Executing query - get all distributors without pagination
    const distributors = await query;

    res.status(200).json({
      success: true,
      count: distributors.length,
      data: distributors
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
};

// @desc    Get single distributor
// @route   GET /api/distributors/:id
// @access  Private
exports.getDistributor = async (req, res) => {
  try {
    const distributor = await Distributor.findById(req.params.id);

    if (!distributor) {
      return res.status(404).json({
        success: false,
        error: 'Distributor not found'
      });
    }

    res.status(200).json({
      success: true,
      data: distributor
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
};

// @desc    Create new distributor
// @route   POST /api/distributors
// @access  Private (admin)
exports.createDistributor = async (req, res) => {
  try {
    const distributor = await Distributor.create(req.body);

    res.status(201).json({
      success: true,
      data: distributor
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
};

// @desc    Update distributor
// @route   PUT /api/distributors/:id
// @access  Private (admin)
exports.updateDistributor = async (req, res) => {
  try {
    const distributor = await Distributor.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!distributor) {
      return res.status(404).json({
        success: false,
        error: 'Distributor not found'
      });
    }

    res.status(200).json({
      success: true,
      data: distributor
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
};

// @desc    Delete distributor
// @route   DELETE /api/distributors/:id
// @access  Private (admin)
exports.deleteDistributor = async (req, res) => {
  try {
    const distributor = await Distributor.findById(req.params.id);

    if (!distributor) {
      return res.status(404).json({
        success: false,
        error: 'Distributor not found'
      });
    }

    await distributor.remove();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
};