const Category = require('../models/Category');
const Product = require('../models/Product');
const asyncHandler = require('../utils/asyncHandler');
const httpError = require('../utils/httpError');

exports.createCategory = asyncHandler(async (req, res) => {
  const name = String(req.body.name || '').trim();
  if (!name) throw httpError(400, 'Category name is required');
  const category = await Category.create({ name });
  res.status(201).json({ success: true, category });
});

exports.getCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find().sort({ name: 1 });
  res.json({ success: true, categories });
});

exports.getCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw httpError(404, 'Category not found');
  res.json({ success: true, category });
});

exports.updateCategory = asyncHandler(async (req, res) => {
  const name = String(req.body.name || '').trim();
  if (!name) throw httpError(400, 'Category name is required');
  const category = await Category.findById(req.params.id);
  if (!category) throw httpError(404, 'Category not found');
  category.name = name;
  await category.save();
  res.json({ success: true, category });
});

exports.deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw httpError(404, 'Category not found');
  const inUse = await Product.countDocuments({ category: category._id });
  if (inUse > 0) {
    throw httpError(409, `Cannot delete: ${inUse} product(s) use this category. Reassign or delete them first.`);
  }
  await category.deleteOne();
  res.json({ success: true, message: 'Category deleted' });
});
