import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { createProduct, deleteProduct, getProduct, getProducts, updateProduct } from '../controllers/productController.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, '../../uploads');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const upload = multer({ storage });

const router = Router();

router.get('/', getProducts);
router.get('/:id', getProduct);
router.post('/', requireAuth, requireAdmin, upload.single('image'), createProduct);
router.put('/:id', requireAuth, requireAdmin, upload.single('image'), updateProduct);
router.delete('/:id', requireAuth, requireAdmin, deleteProduct);

export default router;

