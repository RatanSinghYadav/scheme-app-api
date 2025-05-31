const Product = require('../models/Product');

// @desc    Get all products
// @route   GET /api/products
// @access  Private
exports.getProducts = async (req, res) => {
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
    query = Product.find(JSON.parse(queryStr));

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
      query = query.sort('ITEMNAME');
    }

    // Executing query - get all products without pagination
    const products = await query;

    res.status(200).json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
};

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Private
exports.getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    res.status(200).json({
      success: true,
      data: product
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
};

// @desc    Create new product
// @route   POST /api/products
// @access  Private (admin)
exports.createProduct = async (req, res) => {
  try {
    const product = await Product.create(req.body);

    res.status(201).json({
      success: true,
      data: product
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
};

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private (admin)
exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    res.status(200).json({
      success: true,
      data: product
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
};

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private (admin)
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    await product.remove();

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

// @desc    Get product stats (grouped by brand, packType, etc.)
// @route   GET /api/products/stats
// @access  Private
exports.getProductStats = async (req, res) => {
  try {
    const brandStats = await Product.aggregate([
      {
        $group: {
          _id: '$BRANDNAME', 
          count: { $sum: 1 },
          avgMrp: { $avg: '$Configuration' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const packTypeStats = await Product.aggregate([
      {
        $group: {
          _id: '$PACKTYPE', 
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        brandStats,
        packTypeStats
      }
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
};

// @desc    Bulk import products
// @route   POST /api/products/bulk
// @access  Private (admin)
exports.bulkImportProducts = async (req, res) => {
  try {
    if (!Array.isArray(req.body)) {
      return res.status(400).json({
        success: false,
        error: 'Request body must be an array of products'
      });
    }

    const products = await Product.insertMany(req.body);

    res.status(201).json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
};

// @desc    Bulk update products
// @route   PUT /api/products/bulk-update
// @access  Private (admin)
exports.bulkUpdateProducts = async (req, res) => {
  try {
    if (!Array.isArray(req.body)) {
      return res.status(400).json({
        success: false,
        error: 'Request body must be an array of products'
      });
    }

    const updatePromises = req.body.map(async (product) => {
      if (!product._id) {
        return { success: false, error: 'Product ID is required', product };
      }
      
      const updatedProduct = await Product.findByIdAndUpdate(
        product._id,
        product,
        { new: true, runValidators: true }
      );
      
      if (!updatedProduct) {
        return { success: false, error: 'Product not found', product };
      }
      
      return { success: true, data: updatedProduct };
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

// @desc    Bulk delete products
// @route   DELETE /api/products/bulk-delete
// @access  Private (admin)
exports.bulkDeleteProducts = async (req, res) => {
  try {
    if (!Array.isArray(req.body.ids)) {
      return res.status(400).json({
        success: false,
        error: 'Request body must contain an array of product IDs'
      });
    }

    const deletePromises = req.body.ids.map(async (id) => {
      const product = await Product.findById(id);
      
      if (!product) {
        return { success: false, error: 'Product not found', id };
      }
      
      await product.remove();
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

// @desc    Find duplicate products
// @route   GET /api/products/find-duplicates
// @access  Private
exports.findDuplicateProducts = async (req, res) => {
  try {
    const { criteria } = req.query;
    let duplicates = [];

    switch (criteria) {
      case 'itemid':
        // Find products with same ITEMID
        duplicates = await Product.aggregate([
          {
            $group: {
              _id: "$ITEMID",
              count: { $sum: 1 },
              products: { $push: "$$ROOT" }
            }
          },
          { $match: { count: { $gt: 1 } } },
          { $sort: { count: -1 } }
        ]);
        break;

      case 'itemid_style':
        // Find products with same ITEMID and Style
        duplicates = await Product.aggregate([
          {
            $group: {
              _id: { itemId: "$ITEMID", style: "$Style" },
              count: { $sum: 1 },
              products: { $push: "$$ROOT" }
            }
          },
          { $match: { count: { $gt: 1 } } },
          { $sort: { count: -1 } }
        ]);
        break;

      case 'itemname':
        // Find products with same ITEMNAME
        duplicates = await Product.aggregate([
          {
            $group: {
              _id: "$ITEMNAME",
              count: { $sum: 1 },
              products: { $push: "$$ROOT" }
            }
          },
          { $match: { count: { $gt: 1 } } },
          { $sort: { count: -1 } }
        ]);
        break;
        
      case 'itemid_style_config':
        // Find products with same ITEMID, Style and Configuration
        duplicates = await Product.aggregate([
          {
            $group: {
              _id: { itemId: "$ITEMID", style: "$Style", config: "$Configuration" },
              count: { $sum: 1 },
              products: { $push: "$$ROOT" }
            }
          },
          { $match: { count: { $gt: 1 } } },
          { $sort: { count: -1 } }
        ]);
        break;

      default:
        // Default to ITEMID
        duplicates = await Product.aggregate([
          {
            $group: {
              _id: "$ITEMID",
              count: { $sum: 1 },
              products: { $push: "$$ROOT" }
            }
          },
          { $match: { count: { $gt: 1 } } },
          { $sort: { count: -1 } }
        ]);
    }

    // Calculate total duplicate count
    const totalDuplicates = duplicates.reduce((sum, group) => sum + group.count, 0);
    const uniqueGroupsCount = duplicates.length;

    res.status(200).json({
      success: true,
      totalDuplicates,
      uniqueGroupsCount,
      data: duplicates
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
};

// @desc    Delete duplicate products
// @route   DELETE /api/products/delete-duplicates
// @access  Private (admin)
exports.deleteDuplicateProducts = async (req, res) => {
  try {
    const { ids, keepId } = req.body;
    console.log(req.body);
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Product IDs array is required'
      });
    }

    if (!keepId) {
      return res.status(400).json({
        success: false,
        error: 'ID of product to keep is required'
      });
    }

    // Filter out the ID to keep from the deletion list
    const idsToDelete = ids.filter(id => id !== keepId);

    if (idsToDelete.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No products to delete after filtering'
      });
    }

    // Delete all products except the one to keep
    const deleteResult = await Product.deleteMany({ _id: { $in: idsToDelete } });

    res.status(200).json({
      success: true,
      message: `${deleteResult.deletedCount} duplicate products deleted successfully`,
      data: {
        deletedCount: deleteResult.deletedCount,
        keptId: keepId
      }
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
};