import { Router } from 'express';
import { getCart, removeCartItem, upsertCartItem } from '../controllers/cartController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);
router.get('/', getCart);
router.post('/', upsertCartItem);
router.delete('/:productId', removeCartItem);

export default router;

