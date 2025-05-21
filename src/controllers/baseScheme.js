const BaseScheme = require('../models/BaseScheme');
const { generateSchemeCode } = require('../utils/helpers');
const ExcelJS = require('exceljs');

// @desc    Get all schemes
// @route   GET /api/schemes
// @access  Private
exports.getSchemes = async (req, res) => {
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
        query = BaseScheme.find(JSON.parse(queryStr));

        // Executing query - get all schemes without complex population
        const schemes = await query
            .populate('createdBy', 'name email role')
            .populate('verifiedBy', 'name email role')
            .sort('-createdDate');

        // Manually handle population based on distributorType after fetching
        const populatedSchemes = await Promise.all(schemes.map(async (scheme) => {
            if (scheme.distributorType === 'individual' && scheme.distributors && scheme.distributors.length > 0) {
                // Only populate for individual type
                const populatedScheme = await BaseScheme.findById(scheme._id)
                    .populate('distributors', 'SMCODE CUSTOMERACCOUNT ORGANIZATIONNAME ADDRESSCITY CUSTOMERGROUPID')
                    .populate('createdBy', 'name email role')
                    .populate('verifiedBy', 'name email role');
                return populatedScheme;
            }
            return scheme;
        }));

        res.status(200).json({
            success: true,
            count: populatedSchemes.length,
            data: populatedSchemes
        });
    } catch (err) {
        console.error('Error fetching schemes:', err);
        res.status(400).json({
            success: false,
            error: err.message
        });
    }
};

// @desc    Get single scheme
// @route   GET /api/schemes/:id
// @access  Private
exports.getScheme = async (req, res) => {
    try {

        // First find the scheme to check its distributorType
        const schemeCheck = await BaseScheme.findOne({ schemeCode: req.params.id });

        if (!schemeCheck) {
            return res.status(404).json({
                success: false,
                error: 'Scheme not found'
            });
        }

        // Determine if we should populate distributors based on distributorType
        let scheme;
        if (schemeCheck.distributorType === 'individual') {
            // If individual, populate distributor details
            scheme = await BaseScheme.findOne({ schemeCode: req.params.id })
                .populate('distributors', 'SMCODE CUSTOMERACCOUNT ORGANIZATIONNAME ADDRESSCITY CUSTOMERGROUPID')
                .populate('createdBy', 'name email role')
                .populate('verifiedBy', 'name email role')
                .populate('history.user', 'name email role timestamp notes action');
        } else {
            // If group, don't populate distributor details
            scheme = await BaseScheme.findOne({ schemeCode: req.params.id })
                .populate('createdBy', 'name email role')
                .populate('verifiedBy', 'name email role')
                .populate('history.user', 'name email role timestamp notes action');
        }

        res.status(200).json({
            success: true,
            data: scheme
        });
    } catch (err) {
        res.status(400).json({
            success: false,
            error: err.message
        });
    }
};

// @desc    Create new scheme
// @route   POST /api/schemes/create
// @access  Private (creator, admin)
exports.createScheme = async (req, res) => {
    try {
        // Add user to req.body
        req.body.createdBy = req.user.id;

        // Generate a unique scheme code if not provided
        if (!req.body.schemeCode) {
            req.body.schemeCode = generateSchemeCode();
        }

        // Ensure dates are stored correctly by creating new Date objects
        // and adding one day to compensate for timezone issues
        let startDate = new Date(req.body.startDate);
        startDate.setDate(startDate.getDate() + 1); // Add one day to fix timezone issue
        startDate.setUTCHours(0, 0, 0, 0);

        let endDate = new Date(req.body.endDate);
        endDate.setDate(endDate.getDate() + 1); // Add one day to fix timezone issue
        endDate.setUTCHours(0, 0, 0, 0);

        // Format the data from frontend to match the Scheme model
        const schemeData = {
            schemeCode: req.body.schemeCode,
            startDate: startDate,
            endDate: endDate,
            distributors: req.body.distributors || [], // Array of distributor IDs or groups
            distributorType: req.body.distributorType || 'individual', // Add this field to identify type
            products: req.body.products.map(product => ({
                ITEMID: product.itemCode || product.ITEMID,
                ITEMNAME: product.itemName || product.ITEMNAME,
                FLAVOURTYPE: product.flavour || product.FLAVOUR,
                BRANDNAME: product.brandName || product.BRANDNAME,
                PACKTYPE: product.packType || product.PACKTYPE,
                PACKTYPEGROUPNAME: product.packGroup || product.PACKTYPEGROUPNAME,
                Style: product.style || product.Style,
                NOB: product.nob || product.NOB,
                Configuration: product.mrp || product.Configuration,
                discountPrice: product.discountPrice || 0,
                customFields: product.customFields || {}
            })),
            status: 'Pending Verification',
            createdBy: req.user.id,
            history: [
                {
                    action: 'created',
                    user: req.user.id,
                    timestamp: Date.now(),
                    notes: 'Scheme created'
                }
            ]
        };

        const scheme = await BaseScheme.create(schemeData);

        // Populate the created scheme with distributor and user details
        const populatedScheme = await BaseScheme.findById(scheme._id)
            // .populate('distributors')
            .populate({
                path: 'createdBy',
                select: 'name username'
            });

        res.status(201).json({
            success: true,
            data: populatedScheme
        });
    } catch (err) {
        console.error('Error creating scheme:', err);
        res.status(400).json({
            success: false,
            error: err.message
        });
    }
};

// @desc    Update scheme
// @route   PUT /api/schemes/:id
// @access  Private (creator, admin)
exports.updateScheme = async (req, res) => {
    try {
        let scheme = await BaseScheme.findById(req.params.id);

        if (!scheme) {
            return res.status(404).json({
                success: false,
                error: 'BaseScheme not found'
            });
        }

        // Make sure user is scheme creator or admin
        if (
            scheme.createdBy.toString() !== req.user.id &&
            req.user.role !== 'admin'
        ) {
            return res.status(401).json({
                success: false,
                error: 'Not authorized to update this scheme'
            });
        }

        // Add history entry
        if (!req.body.history) {
            req.body.history = scheme.history;
        }

        req.body.history.push({
            action: 'modified',
            user: req.user.id,
            notes: req.body.notes || 'BaseScheme updated'
        });

        scheme = await BaseScheme.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        res.status(200).json({
            success: true,
            data: scheme
        });
    } catch (err) {
        res.status(400).json({
            success: false,
            error: err.message
        });
    }
};

// @desc    Verify scheme
// @route   PUT /api/schemes/:id/verify
// @access  Private (verifier, admin)
exports.verifyScheme = async (req, res) => {
    try {
        const scheme = await BaseScheme.findOne({ schemeCode: req.params.id });

        if (!scheme) {
            return res.status(404).json({
                success: false,
                error: 'BaseScheme not found'
            });
        }

        // Update status and verifier
        scheme.status = 'Verified';
        scheme.verifiedBy = req.user.id;

        // Add history entry
        scheme.history.push({
            action: 'verified',
            user: req.user.id,
            notes: req.body.notes || 'BaseScheme verified'
        });

        await scheme.save();

        res.status(200).json({
            success: true,
            data: scheme
        });
    } catch (err) {
        res.status(400).json({
            success: false,
            error: err.message
        });
    }
};

// @desc    Reject scheme
// @route   PUT /api/schemes/:id/reject
// @access  Private (verifier, admin)
exports.rejectScheme = async (req, res) => {
    try {
        const scheme = await BaseScheme.findOne({ schemeCode: req.params.id });

        if (!scheme) {
            return res.status(404).json({
                success: false,
                error: 'BaseScheme not found'
            });
        }

        // Update status
        scheme.status = 'Rejected';

        // Add history entry
        scheme.history.push({
            action: 'rejected',
            user: req.user.id,
            notes: req.body.notes || 'BaseScheme rejected'
        });

        await scheme.save();

        res.status(200).json({
            success: true,
            data: scheme
        });
    } catch (err) {
        res.status(400).json({
            success: false,
            error: err.message
        });
    }
};

// @desc    Delete scheme
// @route   DELETE /api/schemes/:id
// @access  Private (admin)
exports.deleteScheme = async (req, res) => {
    try {
        const scheme = await BaseScheme.findOne({ schemeCode: req.params.id });

        if (!scheme) {
            return res.status(404).json({
                success: false,
                error: 'BaseScheme not found'
            });
        }

        await scheme.remove();

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

// @desc    Export schemes by date range
// @route   GET /api/schemes/exportByDate
// @access  Private
exports.exportSchemesByDate = async (req, res) => {
    try {
        // Get start and end date from query params
        const { startDate, endDate, format = 'excel' } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                error: 'Please provide start and end date'
            });
        }

        // Convert string dates to Date objects
        const start = new Date(startDate);
        const end = new Date(endDate);

        // Find schemes within the date range
        const schemes = await BaseScheme.find({
            startDate: { $gte: start },
            endDate: { $lte: end }
        });

        if (schemes.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'No schemes found for the given date range'
            });
        }

        if (format === 'excel') {
            // Create a new Excel workbook
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('BaseScheme Data');

            // Define fixed columns (yellow in the reference)
            const fixedColumns = [
                { header: 'schemeCode', key: 'schemeCode', width: 15 },
                { header: 'startingDate', key: 'startingDate', width: 15 },
                { header: 'endingDate', key: 'endingDate', width: 15 },
                { header: 'salesType', key: 'salesType', width: 10 },
                { header: 'salesCode', key: 'salesCode', width: 15 },
                { header: 'salesDescription', key: 'salesDescription', width: 20 },
                { header: 'type', key: 'type', width: 10 },
                { header: 'code', key: 'code', width: 15 },
                { header: 'itemName', key: 'itemName', width: 30 },
                { header: 'itemCombinationGroup', key: 'itemCombinationGroup', width: 20 },
                { header: 'configId', key: 'configId', width: 15 },
                { header: 'size', key: 'size', width: 10 },
                { header: 'color', key: 'color', width: 10 },
                { header: 'style', key: 'style', width: 10 },
                { header: 'taxChargeCode', key: 'taxChargeCode', width: 15 },
                { header: 'minimumQuantity', key: 'minimumQuantity', width: 15 },
                { header: 'lineDiscount', key: 'lineDiscount', width: 15 },
                { header: 'company', key: 'company', width: 15 }
            ];

            // Set columns in worksheet
            worksheet.columns = fixedColumns;

            // Style for headers (yellow background)
            worksheet.getRow(1).eachCell((cell) => {
                cell.font = { bold: true };
            });

            // Add data rows - for all schemes, for each distributor, add all products
            let rowData = [];

            // For each scheme, for each distributor, create entries for all products
            for (const scheme of schemes) {
                // Populate distributors if needed
                if (scheme.distributorType === 'individual') {
                    // For individual distributors, populate them
                    await scheme.populate('distributors', 'SMCODE CUSTOMERACCOUNT ORGANIZATIONNAME ADDRESSCITY CUSTOMERGROUPID');

                    scheme.distributors.forEach(distributor => {
                        scheme.products.forEach(product => {
                            // Create date objects and ensure we're using UTC dates
                            const startDate = new Date(scheme.startDate);
                            const endDate = new Date(scheme.endDate);

                            rowData.push({
                                schemeCode: 'SCHM000009' || '',
                                startingDate: `${startDate.getUTCDate().toString().padStart(2, '0')}-${(startDate.getUTCMonth() + 1).toString().padStart(2, '0')}-${startDate.getUTCFullYear()}`,
                                endingDate: `${endDate.getUTCDate().toString().padStart(2, '0')}-${(endDate.getUTCMonth() + 1).toString().padStart(2, '0')}-${endDate.getUTCFullYear()}`,
                                salesType: 0, // Fixed value
                                salesCode: distributor.CUSTOMERACCOUNT || distributor.CUSTOMERGROUPID,
                                salesDescription: '',
                                type: 0, // Fixed value
                                code: product.ITEMID,
                                itemName: product.ITEMNAME,
                                itemCombinationGroup: '', // Empty or can be populated if available
                                configId: product.Configuration, // Empty or can be populated if available
                                size: '',
                                color: '', // Empty or can be populated if available
                                style: product.Style,
                                taxChargeCode: 'DIS_PRI_VL', // Fixed value
                                minimumQuantity: '',
                                lineDiscount: product.discountPrice || 0,
                                company: 'brly' // Fixed value
                            });
                        });
                    });
                } else {
                    // For group distributors, use the group codes directly
                    scheme.distributors.forEach(groupCode => {
                        scheme.products.forEach(product => {
                            // Create date objects and ensure we're using UTC dates
                            const startDate = new Date(scheme.startDate);
                            const endDate = new Date(scheme.endDate);

                            rowData.push({
                                schemeCode: 'SCHM000009' || '',
                                startingDate: `${startDate.getUTCDate().toString().padStart(2, '0')}-${(startDate.getUTCMonth() + 1).toString().padStart(2, '0')}-${startDate.getUTCFullYear()}`,
                                endingDate: `${endDate.getUTCDate().toString().padStart(2, '0')}-${(endDate.getUTCMonth() + 1).toString().padStart(2, '0')}-${endDate.getUTCFullYear()}`,
                                salesType: 0, // Fixed value
                                salesCode: typeof groupCode === 'string' ? groupCode : groupCode.CUSTOMERGROUPID || groupCode,
                                salesDescription: '',
                                type: 0, // Fixed value
                                code: product.ITEMID,
                                itemName: product.ITEMNAME,
                                itemCombinationGroup: '', // Empty or can be populated if available
                                configId: product.Configuration, // Empty or can be populated if available
                                size: '',
                                color: '', // Empty or can be populated if available
                                style: product.Style,
                                taxChargeCode: 'DIS_PRI_VL', // Fixed value
                                minimumQuantity: '',
                                lineDiscount: product.discountPrice || 0,
                                company: 'brly' // Fixed value
                            });
                        });
                    });
                }
            }

            // Add all rows to worksheet
            worksheet.addRows(rowData);

            // Write to buffer
            const buffer = await workbook.xlsx.writeBuffer();

            // Set response headers
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=Schemes_${startDate}_to_${endDate}.xlsx`);

            // Send the buffer
            res.send(buffer);
        } else if (format === 'pdf') {
            // For PDF format, you would need to implement PDF generation
            // This is a placeholder - you would need to add a PDF library
            res.status(501).json({
                success: false,
                error: 'PDF export not yet implemented'
            });
        } else {
            res.status(400).json({
                success: false,
                error: 'Invalid export format'
            });
        }
    } catch (err) {
        console.error('Error exporting schemes by date:', err);
        res.status(500).json({
            success: false,
            error: 'Server Error'
        });
    }
};

// @desc    Export scheme
// @route   GET /api/base/schemes/export/:id
// @access  Private
exports.exportScheme = async (req, res) => {
    try {
        // First find the scheme to check its distributorType
        const schemeCheck = await BaseScheme.findOne({ schemeCode: req.params.id });
        console.log(schemeCheck); // Log the schemeCheck t

        if (!schemeCheck) {
            return res.status(404).json({
                success: false,
                error: 'Scheme not found'
            });
        }

        // Determine if we should populate distributors based on distributorType
        let scheme;
        if (schemeCheck.distributorType === 'individual') {
            // If individual, populate distributor details
            scheme = await BaseScheme.findOne({ schemeCode: req.params.id })
                .populate('distributors', 'SMCODE CUSTOMERACCOUNT ORGANIZATIONNAME ADDRESSCITY CUSTOMERGROUPID');
        } else {
            // If group, don't populate distributor details
            scheme = scheme = await BaseScheme.findOne({ schemeCode: req.params.id });
        }

        // Create a new Excel workbook
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Scheme Data');

        // Define fixed columns
        const fixedColumns = [
            { header: 'schemeCode', key: 'schemeCode', width: 15 },
            { header: 'startingDate', key: 'startingDate', width: 15 },
            { header: 'endingDate', key: 'endingDate', width: 15 },
            { header: 'salesType', key: 'salesType', width: 10 },
            { header: 'salesCode', key: 'salesCode', width: 15 },
            { header: 'salesDescription', key: 'salesDescription', width: 20 },
            { header: 'type', key: 'type', width: 10 },
            { header: 'code', key: 'code', width: 15 },
            { header: 'itemName', key: 'itemName', width: 30 },
            { header: 'itemCombinationGroup', key: 'itemCombinationGroup', width: 20 },
            { header: 'configId', key: 'configId', width: 15 },
            { header: 'size', key: 'size', width: 10 },
            { header: 'color', key: 'color', width: 10 },
            { header: 'style', key: 'style', width: 10 },
            { header: 'taxChargeCode', key: 'taxChargeCode', width: 15 },
            { header: 'minimumQuantity', key: 'minimumQuantity', width: 15 },
            { header: 'lineDiscount', key: 'lineDiscount', width: 15 },
            { header: 'company', key: 'company', width: 15 }
        ];

        // Set columns in worksheet
        worksheet.columns = fixedColumns;

        // Style for headers
        worksheet.getRow(1).eachCell((cell) => {
            cell.font = { bold: true };
        });

        // Add data rows
        let rowData = [];

        // Create date objects and ensure we're using UTC dates
        const startDate = new Date(scheme.startDate);
        const endDate = new Date(scheme.endDate);

        // For individual distributors
        if (scheme.distributorType === 'individual') {
            scheme.distributors.forEach(distributor => {
                scheme.products.forEach(product => {
                    rowData.push({
                        schemeCode: 'SCHM000009' || '',
                        startingDate: `${startDate.getUTCDate().toString().padStart(2, '0')}-${(startDate.getUTCMonth() + 1).toString().padStart(2, '0')}-${startDate.getUTCFullYear()}`,
                        endingDate: `${endDate.getUTCDate().toString().padStart(2, '0')}-${(endDate.getUTCMonth() + 1).toString().padStart(2, '0')}-${endDate.getUTCFullYear()}`,
                        salesType: 0, // Fixed value
                        salesCode: distributor.CUSTOMERACCOUNT || distributor.CUSTOMERGROUPID,
                        salesDescription: distributor.ORGANIZATIONNAME || '',
                        type: 0, // Fixed value
                        code: product.ITEMID,
                        itemName: product.ITEMNAME,
                        itemCombinationGroup: '', // Empty or can be populated if available
                        configId: product.Configuration, // Empty or can be populated if available
                        size: '',
                        color: '', // Empty or can be populated if available
                        style: product.Style,
                        taxChargeCode: 'DIS_PRI_VL', // Fixed value
                        minimumQuantity: '',
                        lineDiscount: product.discountPrice || 0,
                        company: 'brly' // Fixed value
                    });
                });
            });
        } else {
            // For group distributors
            scheme.distributors.forEach(groupCode => {
                scheme.products.forEach(product => {
                    rowData.push({
                        schemeCode: scheme.schemeCode || '',
                        startingDate: `${startDate.getUTCDate().toString().padStart(2, '0')}-${(startDate.getUTCMonth() + 1).toString().padStart(2, '0')}-${startDate.getUTCFullYear()}`,
                        endingDate: `${endDate.getUTCDate().toString().padStart(2, '0')}-${(endDate.getUTCMonth() + 1).toString().padStart(2, '0')}-${endDate.getUTCFullYear()}`,
                        salesType: 0, // Fixed value
                        salesCode: typeof groupCode === 'string' ? groupCode : groupCode.CUSTOMERGROUPID || groupCode,
                        salesDescription: '',
                        type: 0, // Fixed value
                        code: product.ITEMID,
                        itemName: product.ITEMNAME,
                        itemCombinationGroup: '', // Empty or can be populated if available
                        configId: product.Configuration, // Empty or can be populated if available
                        size: '',
                        color: '', // Empty or can be populated if available
                        style: product.Style,
                        taxChargeCode: 'DIS_PRI_VL', // Fixed value
                        minimumQuantity: '',
                        lineDiscount: product.discountPrice || 0,
                        company: 'brly' // Fixed value
                    });
                });
            });
        }

        // Add all rows to worksheet
        worksheet.addRows(rowData);

        // Write to buffer
        const buffer = await workbook.xlsx.writeBuffer();

        // Set response headers
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=${scheme.schemeCode}.xlsx`);

        // Send the buffer
        res.send(buffer);
    } catch (err) {
        console.error('Error exporting scheme:', err);
        res.status(500).json({
            success: false,
            error: 'Server Error'
        });
    }
};