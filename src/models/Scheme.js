const mongoose = require('mongoose');

const SchemeSchema = new mongoose.Schema({
    schemeCode: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    distributors: [
        {
            type: mongoose.Schema.ObjectId,
            ref: 'Distributor'
        }
    ],
    products: [
        {
            ITEMID: String,
            ITEMNAME: String,
            FLAVOURTYPE: String,
            BRANDNAME: String,
            PACKTYPE: String,
            PACKTYPEGROUPNAME: String,
            Style: String,
            NOB: Number,
            Configuration: Number,
            discountPrice: Number,
            customFields: {
                type: Map,
                of: mongoose.Schema.Types.Mixed
            }
        }
    ],
    status: {
        type: String,
        enum: ['Pending Verification', 'Verified', 'Active', 'Completed', 'Rejected'],
        default: 'Pending Verification'
    },
    createdBy: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
    },
    verifiedBy: {
        type: mongoose.Schema.ObjectId,
        ref: 'User'
    },
    createdDate: {
        type: Date,
        default: Date.now
    },
    history: [
        {
            action: {
                type: String,
                enum: ['created', 'verified', 'rejected', 'modified', 'activated', 'completed']
            },
            user: {
                type: mongoose.Schema.ObjectId,
                ref: 'User'
            },
            timestamp: {
                type: Date,
                default: Date.now
            },
            notes: String
        }
    ]
});

module.exports = mongoose.model('Scheme', SchemeSchema);