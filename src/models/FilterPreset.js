const mongoose = require('mongoose');

const FilterPresetSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name for this filter preset'],
    trim: true,
    maxlength: [50, 'Name cannot be more than 50 characters']
  },
  filters: {
    type: Object,
    // required: [true, 'Please add filter data']
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    // required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('FilterPreset', FilterPresetSchema);