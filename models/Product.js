const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Product name is required'], trim: true, minlength: [2, 'Product name is too short'], maxlength: 120 },
    price: { type: Number, required: [true, 'Price is required'], min: [0, 'Price cannot be negative'] },
    stock: { type: Number, required: [true, 'Stock is required'], min: [0, 'Stock cannot be negative'], validate: { validator: Number.isInteger, message: 'Stock must be a whole number' } },
    image: { type: String, required: [true, 'Product image is required'] },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: [true, 'Category is required'] },
    description: { type: String, trim: true, maxlength: 1000, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Product', productSchema);
