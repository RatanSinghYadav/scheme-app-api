const mongoose = require('mongoose');

const CombinedSchemeSchema = new mongoose.Schema({
    schemeCode: {
        type: String,
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    salesType: {
        type: String,
        // Add validation or enum if needed
    },
    salesCode: {
        type: String,
    },
    salesDescription: {
        type: String,
    },
    type: {
        type: String,
        // e.g., 'Product', 'Category', 'Brand'
    },
    code: {
        type: String,
        // Product Code, Category Code, etc.
    },
    itemName: {
        type: String,
    },
    configId: {
        type: String,
    },
    colour: {
        type: String,
    },
    size: {
        type: String,
    },
    style: {
        type: String,
    },
    itemCombinationGroup: {
        type: String,
    },
    taxChargeCode: {
        type: String,
    },
    minimumQuantity: {
        type: Number,
    },
    schemeCalculationType: {
        type: String,
        // e.g., 'Percentage', 'Fixed Amount'
    },
    lineDiscount: {
        type: Number,
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('CombinedSchemes', CombinedSchemeSchema);