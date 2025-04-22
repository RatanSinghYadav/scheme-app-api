const Scheme = require('../models/Scheme');
const User = require('../models/User');

// @desc    Get dashboard stats
// @route   GET /api/dashboard/stats
// @access  Private
exports.getDashboardStats = async (req, res) => {
  try {
    // Get total schemes count
    const total = await Scheme.countDocuments();
    
    // Get verified schemes count
    const verified = await Scheme.countDocuments({ status: 'Verified' });
    
    // Get pending verification schemes count
    const pending = await Scheme.countDocuments({ status: 'Pending Verification' });
    
    // Get active schemes today (schemes that are active and have today's date between start and end date)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const activeToday = await Scheme.countDocuments({
      status: 'Verified',
      startDate: { $lte: today },
      endDate: { $gte: today }
    });
    
    res.status(200).json({
      success: true,
      data: {
        total,
        verified,
        pending,
        activeToday
      }
    });
  } catch (err) {
    console.error('Error getting dashboard stats:', err);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Get recent activities
// @route   GET /api/dashboard/activities
// @access  Private
exports.getRecentActivities = async (req, res) => {
  try {
    // Get schemes with their history, sorted by the most recent history entry
    const schemes = await Scheme.find()
      .populate({
        path: 'history.user',
        select: 'name username'
      })
      .sort({ 'history.timestamp': -1 })
      .limit(10);
    
    // Extract and format activities from schemes
    let activities = [];
    
    schemes.forEach(scheme => {
      if (scheme.history && scheme.history.length > 0) {
        scheme.history.forEach(historyItem => {
          // Map action to type
          let type;
          switch (historyItem.action) {
            case 'created':
              type = 'create';
              break;
            case 'verified':
              type = 'verify';
              break;
            case 'rejected':
              type = 'reject';
              break;
            case 'modified':
              type = 'update';
              break;
            default:
              type = historyItem.action;
          }
          
          activities.push({
            type,
            user: historyItem.user ? historyItem.user.name || historyItem.user.username : 'Unknown User',
            schemeId: scheme.schemeCode,
            timestamp: historyItem.timestamp
          });
        });
      }
    });
    
    // Sort activities by timestamp (most recent first)
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // Limit to 10 most recent activities
    activities = activities.slice(0, 10);
    
    res.status(200).json({
      success: true,
      data: activities
    });
  } catch (err) {
    console.error('Error getting recent activities:', err);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};