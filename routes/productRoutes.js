const router = require('express').Router();
const c = require('../controllers/productController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const { uploadImage } = require('../middleware/uploadMiddleware');

router.get('/', c.getProducts);
router.get('/:id', c.getProduct);
router.post('/', protect, authorize('admin'), uploadImage, c.createProduct);
router.put('/:id', protect, authorize('admin'), uploadImage, c.updateProduct);
router.delete('/:id', protect, authorize('admin'), c.deleteProduct);

module.exports = router;
