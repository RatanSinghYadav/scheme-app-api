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

// @desc    Bulk update distributors
// @route   PUT /api/distributors/bulk-update
// @access  Private (admin)
exports.bulkUpdateDistributors = async (req, res) => {
  try {
    if (!Array.isArray(req.body)) {
      return res.status(400).json({
        success: false,
        error: 'Request body must be an array of distributors'
      });
    }

    const updatePromises = req.body.map(async (distributor) => {
      if (!distributor._id) {
        return { success: false, error: 'Distributor ID is required', distributor };
      }
      
      const updatedDistributor = await Distributor.findByIdAndUpdate(
        distributor._id,
        distributor,
        { new: true, runValidators: true }
      );
      
      if (!updatedDistributor) {
        return { success: false, error: 'Distributor not found', distributor };
      }
      
      return { success: true, data: updatedDistributor };
    });

    const results = await Promise.all(updatePromises);
    
    const allSuccessful = results.every(result => result.success);
    
    if (allSuccessful) {
      res.status(200).json({
        success: true,
        count: results.length,
        data: results.map(result => result.data)
      });
    } else {
      res.status(207).json({
        success: false,
        results
      });
    }
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
};

// @desc    Bulk delete distributors
// @route   DELETE /api/distributors/bulk-delete
// @access  Private (admin)
exports.bulkDeleteDistributors = async (req, res) => {
  try {
    if (!Array.isArray(req.body.ids)) {
      return res.status(400).json({
        success: false,
        error: 'Request body must contain an array of distributor IDs'
      });
    }

    const deletePromises = req.body.ids.map(async (id) => {
      const distributor = await Distributor.findById(id);
      
      if (!distributor) {
        return { success: false, error: 'Distributor not found', id };
      }
      
      await distributor.remove();
      return { success: true, id };
    });

    const results = await Promise.all(deletePromises);
    
    const allSuccessful = results.every(result => result.success);
    
    if (allSuccessful) {
      res.status(200).json({
        success: true,
        count: results.length,
        data: results
      });
    } else {
      res.status(207).json({
        success: false,
        results
      });
    }
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
};