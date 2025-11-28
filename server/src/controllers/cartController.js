import Cart from '../models/Cart.js';

const mapCartItems = (cartDoc) =>
  cartDoc.items.map((item) => ({
    productId: item.product.toString(),
    qty: item.qty,
  }));

export const getCart = async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) return res.json([]);
  res.json(mapCartItems(cart));
};

export const upsertCartItem = async (req, res) => {
  const { productId, qty } = req.body;
  if (!productId || !qty || qty <= 0) {
    return res.status(400).json({ message: 'Invalid payload' });
  }
  const cart =
    (await Cart.findOne({ user: req.user._id })) ||
    (await Cart.create({ user: req.user._id, items: [] }));
  const existing = cart.items.find((i) => i.product.toString() === productId);
  if (existing) existing.qty = qty;
  else cart.items.push({ product: productId, qty });
  await cart.save();
  res.json(mapCartItems(cart));
};

export const removeCartItem = async (req, res) => {
  const { productId } = req.params;
  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) return res.status(404).json({ message: 'Cart not found' });
  cart.items = cart.items.filter((i) => i.product.toString() !== productId);
  await cart.save();
  res.status(204).send();
};

