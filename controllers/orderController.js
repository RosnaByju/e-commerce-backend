const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');
const asyncHandler = require('../utils/asyncHandler');
const httpError = require('../utils/httpError');

const STATUSES = ['Pending', 'Confirmed', 'Completed', 'Cancelled'];
const restock = (lines) => Promise.all(lines.map((l) => Product.updateOne({ _id: l.product }, { $inc: { stock: l.quantity } })));

/**
 * POST /api/orders
 * Body: { items: [{ product, quantity }] }  (or { productId, quantity } for Buy Now)
 * Prices/total are NEVER read from the client.
 *
 * Stock safety: each product is decremented with ONE atomic
 *   findOneAndUpdate({ _id, stock: { $gte: qty } }, { $inc: { stock: -qty } })
 * so two concurrent buyers can never push stock below zero. If any line fails,
 * previously reserved lines are restored. Works on standalone MongoDB (no replica set needed).
 */
exports.createOrder = asyncHandler(async (req, res) => {
  const { items, productId, quantity } = req.body;
  const raw = Array.isArray(items) ? items : productId ? [{ product: productId, quantity }] : [];
  if (!raw.length) throw httpError(400, 'Order must contain at least one item');

  // validate + merge duplicate products
  const merged = new Map();
  for (const it of raw) {
    const id = String(it.product);
    const qty = Number(it.quantity);
    if (!mongoose.isValidObjectId(id)) throw httpError(400, 'Invalid product ID');
    if (!Number.isInteger(qty) || qty < 1) throw httpError(400, 'Quantity must be a whole number of at least 1');
    merged.set(id, (merged.get(id) || 0) + qty);
  }

  const reserved = [];
  try {
    for (const [id, qty] of merged) {
      const p = await Product.findOneAndUpdate({ _id: id, stock: { $gte: qty } }, { $inc: { stock: -qty } }, { new: true });
      if (!p) {
        const current = await Product.findById(id).select('name stock');
        if (!current) throw httpError(404, 'Product not found');
        throw httpError(400, current.stock === 0 ? `"${current.name}" is out of stock` : `Insufficient stock for "${current.name}". Only ${current.stock} available.`);
      }
      reserved.push({ product: p._id, name: p.name, quantity: qty, price: p.price });
    }

    const totalAmount = Math.round(reserved.reduce((s, l) => s + l.price * l.quantity, 0) * 100) / 100;
    const order = await Order.create({ user: req.user._id, items: reserved, totalAmount });
    res.status(201).json({ success: true, message: 'Order placed successfully', order });
  } catch (err) {
    await restock(reserved); // roll back any stock already taken
    throw err;
  }
});

exports.getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).populate('items.product', 'name image').sort({ createdAt: -1 });
  res.json({ success: true, orders });
});

exports.getAllOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find().populate('user', 'name email').populate('items.product', 'name image').sort({ createdAt: -1 });
  res.json({ success: true, orders });
});

exports.getOrder = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw httpError(400, 'Invalid order ID');
  const order = await Order.findById(req.params.id).populate('user', 'name email').populate('items.product', 'name image');
  if (!order) throw httpError(404, 'Order not found');
  const ownerId = order.user._id.toString();
  if (req.user.role !== 'admin' && ownerId !== req.user._id.toString()) throw httpError(403, 'You cannot access this order');
  res.json({ success: true, order });
});

exports.updateOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!STATUSES.includes(status)) throw httpError(400, `Status must be one of: ${STATUSES.join(', ')}`);
  if (!mongoose.isValidObjectId(req.params.id)) throw httpError(400, 'Invalid order ID');

  const order = await Order.findById(req.params.id);
  if (!order) throw httpError(404, 'Order not found');
  if (order.status === 'Cancelled' && status !== 'Cancelled') throw httpError(400, 'A cancelled order cannot be reopened');

  if (status === 'Cancelled' && order.status !== 'Cancelled') await restock(order.items); // give stock back
  order.status = status;
  await order.save();
  await order.populate('user', 'name email');
  await order.populate('items.product', 'name image');
  res.json({ success: true, order });
});
