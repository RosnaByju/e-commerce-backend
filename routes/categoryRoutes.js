const router = require('express').Router();
const c = require('../controllers/categoryController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.get('/', c.getCategories);
router.get('/:id', c.getCategory);
router.post('/', protect, authorize('admin'), c.createCategory);
router.put('/:id', protect, authorize('admin'), c.updateCategory);
router.delete('/:id', protect, authorize('admin'), c.deleteCategory);

module.exports = router;
