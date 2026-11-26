const Product = require('../models/Product');
const Category = require('../models/Category');
const Order = require('../models/Order');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');

exports.getStats = asyncHandler(async (req, res) => {
  const [products, categories, orders, customers, recentOrders] = await Promise.all([
    Product.countDocuments(),
    Category.countDocuments(),
    Order.countDocuments(),
    User.countDocuments({ role: 'user' }),
    Order.find().populate('user', 'name email').sort({ createdAt: -1 }).limit(5),
  ]);
  res.json({ success: true, stats: { products, categories, orders, customers }, recentOrders });
});
