const router = require('express').Router();
const c = require('../controllers/orderController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.use(protect);
router.post('/', c.createOrder);
router.get('/my-orders', c.getMyOrders);
router.get('/admin/all', authorize('admin'), c.getAllOrders); // must stay above /:id
router.get('/:id', c.getOrder);
router.patch('/:id/status', authorize('admin'), c.updateOrderStatus);

module.exports = router;
