const { syncAllData, syncProductsToMongoDB, syncDistributorsToMongoDB } = require('../services/dataSyncService');

// @desc    Sync all data from MSSQL to MongoDB
// @route   POST /api/sync/all
// @access  Private (admin)
exports.syncAll = async (req, res) => {
  try {
    await syncAllData();
    res.status(200).json({
      success: true,
      message: 'All data synced successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Sync only products from MSSQL to MongoDB
// @route   POST /api/sync/products
// @access  Private (admin)
exports.syncProducts = async (req, res) => {
  try {
    await syncProductsToMongoDB();
    res.status(200).json({
      success: true,
      message: 'Product data synced successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Sync only distributors from MSSQL to MongoDB
// @route   POST /api/sync/distributors
// @access  Private (admin)
exports.syncDistributors = async (req, res) => {
  try {
    await syncDistributorsToMongoDB();
    res.status(200).json({
      success: true,
      message: 'Distributor data synced successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};