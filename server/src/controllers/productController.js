import Product from '../models/Product.js';

const toDto = (product) => ({
  id: product._id.toString(),
  name: product.name,
  price: product.price,
  description: product.description,
  imageUrl: product.imageUrl,
  owner: product.owner,
});

export const getProducts = async (req, res) => {
  const products = await Product.find().sort({ createdAt: -1 });
  res.json(products.map(toDto));
};

export const getProduct = async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ message: 'Product not found' });
  res.json(toDto(product));
};

export const createProduct = async (req, res) => {
  const { name, price, description, imageUrl } = req.body;
  if (!name || !price || !description) {
    return res.status(400).json({ message: 'Missing required fields' });
  }
  const payload = {
    name,
    price,
    description,
    imageUrl,
    owner: req.user._id,
  };
  if (req.file) {
    payload.imageUrl = `/uploads/${req.file.filename}`;
  }
  const product = await Product.create(payload);
  res.status(201).json(toDto(product));
};

export const updateProduct = async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ message: 'Product not found' });
  const { name, price, description, imageUrl } = req.body;
  if (name) product.name = name;
  if (price !== undefined) product.price = price;
  if (description) product.description = description;
  if (req.file) product.imageUrl = `/uploads/${req.file.filename}`;
  else if (imageUrl) product.imageUrl = imageUrl;
  await product.save();
  res.json(toDto(product));
};

export const deleteProduct = async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ message: 'Product not found' });
  await product.deleteOne();
  res.status(204).send();
};

