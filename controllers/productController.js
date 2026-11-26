const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Product = require('../models/Product');
const Category = require('../models/Category');
const asyncHandler = require('../utils/asyncHandler');
const httpError = require('../utils/httpError');
const { UPLOAD_DIR } = require('../middleware/uploadMiddleware');

const removeFile = (relPath) => {
  if (!relPath || !relPath.startsWith('/uploads/')) return;
  fs.unlink(path.join(UPLOAD_DIR, path.basename(relPath)), () => {});
};

// Validates body fields; returns clean values or throws 400.
const parseFields = async (body, { partial = false } = {}) => {
  const out = {};
  if (!partial || body.name !== undefined) {
    out.name = String(body.name || '').trim();
    if (out.name.length < 2) throw httpError(400, 'Product name must be at least 2 characters');
  }
  if (!partial || body.price !== undefined) {
    out.price = Number(body.price);
    if (body.price === '' || body.price === undefined || !Number.isFinite(out.price) || out.price < 0) throw httpError(400, 'Price must be a number ≥ 0');
  }
  if (!partial || body.stock !== undefined) {
    out.stock = Number(body.stock);
    if (body.stock === '' || body.stock === undefined || !Number.isInteger(out.stock) || out.stock < 0) throw httpError(400, 'Stock must be a whole number ≥ 0');
  }
  if (!partial || body.category !== undefined) {
    if (!mongoose.isValidObjectId(body.category)) throw httpError(400, 'Invalid category ID');
    if (!(await Category.exists({ _id: body.category }))) throw httpError(400, 'Category does not exist');
    out.category = body.category;
  }
  if (body.description !== undefined) out.description = String(body.description).trim();
  return out;
};

exports.createProduct = asyncHandler(async (req, res) => {
  const uploaded = req.file ? `/uploads/${req.file.filename}` : null;
  try {
    if (!uploaded) throw httpError(400, 'Product image is required');
    const data = await parseFields(req.body);
    const product = await Product.create({ ...data, image: uploaded });
    await product.populate('category', 'name');
    res.status(201).json({ success: true, product });
  } catch (err) {
    removeFile(uploaded);
    throw err;
  }
});

exports.getProducts = asyncHandler(async (req, res) => {
  const { category, search } = req.query;
  const filter = {};
  if (category) {
    if (!mongoose.isValidObjectId(category)) throw httpError(400, 'Invalid category ID');
    filter.category = category;
  }
  if (search) filter.name = { $regex: String(search).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
  const products = await Product.find(filter).populate('category', 'name').sort({ createdAt: -1 });
  res.json({ success: true, count: products.length, products });
});

exports.getProduct = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw httpError(400, 'Invalid product ID');
  const product = await Product.findById(req.params.id).populate('category', 'name');
  if (!product) throw httpError(404, 'Product not found');
  res.json({ success: true, product });
});

exports.updateProduct = asyncHandler(async (req, res) => {
  const uploaded = req.file ? `/uploads/${req.file.filename}` : null;
  try {
    if (!mongoose.isValidObjectId(req.params.id)) throw httpError(400, 'Invalid product ID');
    const product = await Product.findById(req.params.id);
    if (!product) throw httpError(404, 'Product not found');
    const data = await parseFields(req.body, { partial: true });
    const oldImage = product.image;
    Object.assign(product, data);
    if (uploaded) product.image = uploaded;
    await product.save();
    if (uploaded) removeFile(oldImage);
    await product.populate('category', 'name');
    res.json({ success: true, product });
  } catch (err) {
    removeFile(uploaded);
    throw err;
  }
});

exports.deleteProduct = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw httpError(400, 'Invalid product ID');
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) throw httpError(404, 'Product not found');
  removeFile(product.image);
  res.json({ success: true, message: 'Product deleted' });
});
