const CombinedScheme = require('../models/CombinedScheme');
const Distributor = require('../models/Distributor'); // यह लाइन जोड़ें

// @desc    Get all combined schemes
// @route   GET /api/combined/schemes
// @access  Private
exports.getCombinedSchemes = async (req, res) => {
    try {
        let query;
        const reqQuery = { ...req.query };

        // Remove fields
        const removeFields = ['select', 'sort', 'page', 'limit'];
        removeFields.forEach(param => delete reqQuery[param]);

        let queryStr = JSON.stringify(reqQuery);
        queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);

        query = CombinedScheme.find(JSON.parse(queryStr));

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
            query = query.sort('-createdAt');
        }

        // Pagination
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 5000;
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;
        const total = await CombinedScheme.countDocuments(JSON.parse(queryStr));

        query = query.skip(startIndex).limit(limit);

        // Execute query with timeout
        const schemes = await query.maxTimeMS(30000); // 30 second timeout

        // Pagination result
        const pagination = {};
        if (endIndex < total) {
            pagination.next = { page: page + 1, limit };
        }
        if (startIndex > 0) {
            pagination.prev = { page: page - 1, limit };
        }

        res.status(200).json({
            success: true,
            count: schemes.length,
            total,
            pagination,
            data: schemes
        });
    } catch (err) {
        res.status(400).json({
            success: false,
            message: err.message
        });
    }
};

// @desc    Get combined scheme by ID
// @route   GET /api/combined/schemes/:id
// @access  Private
const mongoose = require('mongoose');

exports.getCombinedScheme = async (req, res) => {
    try {
        const { id } = req.params;
        console.log('Requested ID:', id);

        // Check if ID is valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid scheme ID format'
            });
        }

        const scheme = await CombinedScheme.findById(id);
        console.log('Found scheme:', scheme);

        if (!scheme) {
            return res.status(404).json({
                success: false,
                message: `No scheme found with id of ${id}`
            });
        }

        res.status(200).json({
            success: true,
            data: scheme
        });
    } catch (err) {
        console.error('Error fetching scheme:', err);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// @desc    Get combined schemes by customer
// @route   GET /api/combined/schemes/customer/:code
// @access  Private
exports.getSchemesByCustomer = async (req, res) => {
    try {
        const customerCode = req.params.code;

        const schemes = await CombinedScheme.find({
            salesCode: customerCode,
            endDate: { $gte: new Date() } // Only active schemes (end date >= current date)
        })

        res.status(200).json({
            success: true,
            count: schemes.length,
            data: schemes
        });
    } catch (err) {
        res.status(400).json({
            success: false,
            message: err.message
        });
    }
};

// @desc    Get combined scheme summary (grouped by customer)
// @route   GET /api/combined/schemes/summary
// @access  Private
exports.getCombinedSchemeSummary = async (req, res) => {
    try {
        console.log('getCombinedSchemeSummary called');
        const summary = await CombinedScheme.aggregate([
            // Stage 1: Match with filters (if any)
            ...(Object.keys(req.query).length > 0 ? [{
                $match: buildMatchQuery(req.query)
            }] : []),

            // Stage 2: Group by salesCode and salesDescription
            {
                $group: {
                    _id: {
                        salesType: "$salesType",
                        salesCode: "$salesCode",
                        salesDescription: "$salesDescription"
                    },
                    totalSchemes: { $sum: 1 },
                    uniqueProducts: { $addToSet: "$itemName" },
                    totalDiscount: { $sum: { $convert: { input: "$lineDiscount", to: "double", onError: 0, onNull: 0 } } },
                    avgDiscount: { $avg: { $convert: { input: "$lineDiscount", to: "double", onError: 0, onNull: 0 } } },
                    maxDiscount: { $max: { $convert: { input: "$lineDiscount", to: "double", onError: 0, onNull: 0 } } },
                    minDiscount: { $min: { $convert: { input: "$lineDiscount", to: "double", onError: 0, onNull: 0 } } }
                }
            },

            // Stage 3: Project final structure
            {
                $project: {
                    _id: 0,
                    salesType: "$_id.salesType",
                    salesCode: "$_id.salesCode",
                    salesDescription: "$_id.salesDescription",
                    totalSchemes: 1,
                    totalProducts: { $size: "$uniqueProducts" },
                    totalDiscount: { $round: ["$totalDiscount", 2] },
                    avgDiscount: { $round: ["$avgDiscount", 2] },
                    maxDiscount: { $round: ["$maxDiscount", 2] },
                    minDiscount: { $round: ["$minDiscount", 2] }
                }
            },

            // Stage 4: Sort by totalSchemes descending
            {
                $sort: { totalSchemes: -1 }
            },

            // Stage 5: Add pagination (optional)
            ...(req.query.limit ? [
                { $skip: parseInt(req.query.skip || 0) },
                { $limit: parseInt(req.query.limit || 50) }
            ] : [])
        ],
            {
                maxTimeMS: 30000, // 30 second timeout
                allowDiskUse: true // For large datasets
            });

        const result = await CombinedScheme.aggregate(pipeline);
        console.log('Aggregation result:', result);

        res.status(200).json({
            success: true,
            count: result.length,
            data: result,
        });
    } catch (err) {
        console.error('Error in getCombinedSchemeSummary:', err);
        res.status(400).json({
            success: false,
            message: err.message
        });
    }
};

// Helper function for building match query
function buildMatchQuery(queryParams) {
    const match = {};

    // Add date filters if provided
    if (queryParams.startDate) {
        match.startDate = { $gte: new Date(queryParams.startDate) };
    }
    if (queryParams.endDate) {
        match.endDate = { $lte: new Date(queryParams.endDate) };
    }
    if (queryParams.salesType) {
        match.salesType = queryParams.salesType;
    }
    if (queryParams.salesCode) {
        match.salesCode = new RegExp(queryParams.salesCode, 'i');
    }

    return match;
}

// @desc    Get combined scheme details for a specific customer
// @route   GET /api/combined/schemes/customer/:code/details
// @access  Private
exports.getCustomerSchemeDetails = async (req, res) => {
    try {
        const customerCode = req.params.code;

        // 1. पहले Distributor मॉडल से ग्राहक की जानकारी प्राप्त करें
        const distributor = await Distributor.findOne({ CUSTOMERACCOUNT: customerCode });
        if (!distributor) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found'
            });
        }


        // 2. ग्राहक के लिए सीधे लागू स्कीम्स प्राप्त करें (Additional Schemes)
        const directSchemes = await CombinedScheme.find({
            salesCode: distributor.CUSTOMERACCOUNT,
            // endDate: { $gte: new Date() } 
        });

        // 3. ग्राहक के ग्रुप के लिए लागू स्कीम्स प्राप्त करें (Group Schemes)
        const groupSchemes = await CombinedScheme.find({
            salesCode: distributor.CUSTOMERGROUPID,
            // endDate: { $gte: new Date() } 
        });


        // 4. सभी स्कीम्स को एक साथ जोड़ें और स्कीम प्रकार जोड़ें
        const allSchemes = [
            ...directSchemes.map(scheme => ({
                ...scheme.toObject(),
                schemeType: 'Additional' // अतिरिक्त स्कीम
            })),
            ...groupSchemes.map(scheme => ({
                ...scheme.toObject(),
                schemeType: 'Group' // ग्रुप स्कीम
            }))
        ];

        // 5. उत्पाद द्वारा स्कीम्स को समूहित करें
        const productDiscounts = [];
        const productMap = new Map();


        allSchemes.forEach(scheme => {
            // lineDiscount को संख्या में परिवर्तित करें
            const lineDiscount = typeof scheme.lineDiscount === 'string'
                ? parseFloat(scheme.lineDiscount) || 0
                : scheme.lineDiscount || 0;

            console.log(scheme);

            if (!productMap.has(scheme.code)) {  // code द्वारा समूहित करें
                productMap.set(scheme.code, {
                    productCode: scheme.code,
                    itemName: scheme.ItemName, // आइटम नाम अलग से रखें
                    schemes: [],
                    totalDiscount: 0
                });
            }

            const product = productMap.get(scheme.code);  // code द्वारा प्राप्त करें
            product.schemes.push({
                schemeCode: scheme.schemeCode,
                startDate: scheme.startDate,
                endDate: scheme.endDate,
                discount: lineDiscount,
                calculationType: scheme.schemeCalculationType,
                style: scheme.style,
                configId: scheme.configId,
                schemeType: scheme.schemeType
            });

            product.totalDiscount += lineDiscount; 
        });

        productMap.forEach(product => {
            productDiscounts.push(product);
        });

        // 6. ग्राहक की जानकारी प्राप्त करें
        const customerInfo = {
            salesType: directSchemes.length > 0 ? directSchemes[0].salesType : 'Customer',
            salesCode: customerCode,
            salesDescription: directSchemes.length > 0 ? directSchemes[0].salesDescription : distributor.ORGANIZATIONNAME,
            groupId: distributor.CUSTOMERGROUPID
        };

        // 7. तिथि-वार सारांश बनाएँ
        const dateMap = new Map();
        const today = new Date();

        allSchemes.forEach(scheme => {
            // Convert lineDiscount to number if it's a string
            const lineDiscount = typeof scheme.lineDiscount === 'string'
                ? parseFloat(scheme.lineDiscount) || 0
                : scheme.lineDiscount || 0;

            const startDate = new Date(scheme.startDate);
            const endDate = new Date(scheme.endDate);

            // Create entries for each date in the scheme's duration
            let currentDate = new Date(startDate);
            while (currentDate <= endDate && currentDate <= today) {
                const dateStr = currentDate.toISOString().split('T')[0];

                if (!dateMap.has(dateStr)) {
                    dateMap.set(dateStr, {
                        date: dateStr,
                        activeSchemes: 0,
                        totalDiscount: 0
                    });
                }

                const dateEntry = dateMap.get(dateStr);
                dateEntry.activeSchemes += 1;
                dateEntry.totalDiscount += lineDiscount;

                // Move to next day
                currentDate.setDate(currentDate.getDate() + 1);
            }
        });

        const dateWiseSummary = Array.from(dateMap.values()).sort((a, b) => {
            return new Date(a.date) - new Date(b.date);
        });

        res.status(200).json({
            success: true,
            data: {
                customer: customerInfo,
                productDiscounts,
                dateWiseSummary
            }
        });
    } catch (err) {
        console.error('Error in getCustomerSchemeDetails:', err);
        res.status(400).json({
            success: false,
            message: err.message
        });
    }
};
