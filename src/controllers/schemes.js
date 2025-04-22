const Scheme = require('../models/Scheme');
const Distributor = require('../models/Distributor');
const { generateSchemeCode } = require('../utils/helpers');
const ExcelJS = require('exceljs');
const path = require('path');

// @desc    Get all schemes
// @route   GET /api/schemes
// @access  Private
exports.getSchemes = async (req, res) => {
  try {
    let query;

    // Copy req.query
    const reqQuery = { ...req.query };

    // Fields to exclude
    const removeFields = ['select', 'sort', 'page', 'limit'];

    // Loop over removeFields and delete them from reqQuery
    removeFields.forEach(param => delete reqQuery[param]);

    // Create query string
    let queryStr = JSON.stringify(reqQuery);

    // Create operators ($gt, $gte, etc)
    queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);

    // Finding resource
    query = Scheme.find(JSON.parse(queryStr))
      .populate('distributors', 'SMCODE CUSTOMERACCOUNT ORGANIZATIONNAME ADDRESSCITY CUSTOMERGROUPID')
      .populate('createdBy', 'name email role')
      .populate('verifiedBy', 'name email role');

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
      query = query.sort('-createdDate');
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await Scheme.countDocuments();

    query = query.skip(startIndex).limit(limit);

    // Executing query
    const schemes = await query;

    // Pagination result
    const pagination = {};

    if (endIndex < total) {
      pagination.next = {
        page: page + 1,
        limit
      };
    }

    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit
      };
    }

    res.status(200).json({
      success: true,
      count: schemes.length,
      pagination,
      data: schemes
    });
  } catch (err) {
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
   
    const scheme = await Scheme.findOne({ schemeCode: req.params.id })
      .populate('distributors', 'SMCODE CUSTOMERACCOUNT ORGANIZATIONNAME ADDRESSCITY CUSTOMERGROUPID')
      .populate('createdBy', 'name email role')
      .populate('verifiedBy', 'name email role')
      .populate('history.user', 'name email role timestamp notes action');


    if (!scheme) {
      return res.status(404).json({
        success: false,
        error: 'Scheme not found'
      });
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
    
    // Format the data from frontend to match the Scheme model
    const schemeData = {
      schemeCode: req.body.schemeCode,
      startDate: req.body.startDate,
      endDate: req.body.endDate,
      distributors: req.body.distributors || [], // Array of distributor IDs
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

    const scheme = await Scheme.create(schemeData);

    // Populate the created scheme with distributor and user details
    const populatedScheme = await Scheme.findById(scheme._id)
      .populate('distributors')
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
    let scheme = await Scheme.findById(req.params.id);

    if (!scheme) {
      return res.status(404).json({
        success: false,
        error: 'Scheme not found'
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
      notes: req.body.notes || 'Scheme updated'
    });

    scheme = await Scheme.findByIdAndUpdate(req.params.id, req.body, {
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
    const scheme = await Scheme.findOne({ schemeCode: req.params.id });

    if (!scheme) {
      return res.status(404).json({
        success: false,
        error: 'Scheme not found'
      });
    }

    // Update status and verifier
    scheme.status = 'Verified';
    scheme.verifiedBy = req.user.id;
    
    // Add history entry
    scheme.history.push({
      action: 'verified',
      user: req.user.id,
      notes: req.body.notes || 'Scheme verified'
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
    const scheme = await Scheme.findOne({ schemeCode: req.params.id });

    if (!scheme) {
      return res.status(404).json({
        success: false,
        error: 'Scheme not found'
      });
    }

    // Update status
    scheme.status = 'Rejected';
    
    // Add history entry
    scheme.history.push({
      action: 'rejected',
      user: req.user.id,
      notes: req.body.notes || 'Scheme rejected'
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
    const scheme = await Scheme.findById(req.params.id);

    if (!scheme) {
      return res.status(404).json({
        success: false,
        error: 'Scheme not found'
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

// @desc    Export scheme to Excel/PDF
// @route   GET /api/schemes/export/:id
// @access  Private
exports.exportScheme = async (req, res) => {
  try {
    const scheme = await Scheme.findOne({ schemeCode: req.params.id })
      .populate('distributors', 'SMCODE CUSTOMERACCOUNT ORGANIZATIONNAME ADDRESSCITY CUSTOMERGROUPID')
      .populate('createdBy', 'name email role')
      .populate('verifiedBy', 'name email role');

    if (!scheme) {
      return res.status(404).json({
        success: false,
        error: 'Scheme not found'
      });
    }

    const format = req.query.format || 'excel';

    if (format === 'excel') {
      // Create a new Excel workbook
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Scheme Data');

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

      // Add data rows - for each distributor, add all products
      let rowData = [];
      
      // For each distributor, create entries for all products
      scheme.distributors.forEach(distributor => {
        scheme.products.forEach(product => {
          rowData.push({
            schemeCode: 'SCHM000009' || '',
            startingDate: new Date(scheme.startDate).toLocaleDateString('en-GB').replace(/\//g, '-'),
            endingDate: new Date(scheme.endDate).toLocaleDateString('en-GB').replace(/\//g, '-'),
            salesType: 0, // Fixed value
            salesCode: distributor.CUSTOMERACCOUNT,
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

      // Add all rows to worksheet
      worksheet.addRows(rowData);

      // Write to buffer
      const buffer = await workbook.xlsx.writeBuffer();

      // Set response headers
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=Scheme_${scheme.schemeCode}.xlsx`);
      
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
    console.error('Export error:', err);
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
};