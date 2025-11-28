const App = (() => {
  const uuid = () =>
    (window.crypto?.randomUUID
      ? crypto.randomUUID()
      : `id-${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`);
  const apiBase = '/api';
  let mode = 'local'; // 'local' | 'api'
  let backendReady = false;
  let userCache = null;

  const snackbar = (() => {
    let el = null;
    const ensureEl = () => {
      if (!el) {
        el = document.createElement('div');
        el.className = 'snackbar';
        document.body.appendChild(el);
      }
    };
    const show = (message, variant = 'info') => {
      ensureEl();
      el.textContent = message;
      el.style.background =
        variant === 'error' ? '#c62828' : variant === 'success' ? '#2e7d32' : '#345344';
      el.classList.add('show');
      setTimeout(() => el.classList.remove('show'), 3000);
    };
    return { show };
  })();

  const ls = {
    get(key, fallback) {
      try {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : fallback;
      } catch (err) {
        console.error('localStorage get error', err);
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (err) {
        console.error('localStorage set error', err);
      }
    },
    remove(key) {
      localStorage.removeItem(key);
    },
  };

  const hashPassword = async (password) => {
    if (window.crypto?.subtle) {
      const enc = new TextEncoder().encode(password);
      const digest = await crypto.subtle.digest('SHA-256', enc);
      return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    }
    return btoa(unescape(encodeURIComponent(password)));
  };

  const detectMode = async () => {
    try {
      const res = await fetch(`${apiBase}/ping`, { cache: 'no-store' });
      if (res.ok) {
        backendReady = true;
        return 'api';
      }
    } catch (err) {
      console.info('API not reachable, falling back to LocalStorage mode.');
    }
    backendReady = false;
    return 'local';
  };

  const seedLocalData = async () => {
    const users = ls.get('users', []);
    if (!users.length) {
      const adminHash = await hashPassword('admin123');
      users.push({
        id: uuid(),
        name: 'Admin',
        email: 'admin@gmail.com',
        passwordHash: adminHash,
        role: 'admin',
      });
      ls.set('users', users);
    }

    const products = ls.get('products', []);
    if (!products.length) {
      const seedProducts = [
        {
          name: 'Lush Indoor Plant',
          price: 79,
          description: 'Bring nature home with our curated indoor planters.',
          imageUrl:
            'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?auto=format&fit=crop&w=600&q=60',
        },
        {
          name: 'Minimal Desk Lamp',
          price: 120,
          description: 'Soft, warm lighting with sustainable materials.',
          imageUrl:
            'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=600&q=60',
        },
        {
          name: 'Woven Cotton Throw',
          price: 55,
          description: 'Muted green palette throw blanket for cozy evenings.',
          imageUrl:
            'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=600&q=60',
        },
      ];
      ls.set(
        'products',
        seedProducts.map((p) => ({ ...p, id: uuid() }))
      );
    }
  };

  const auth = {
    get loggedInEmail() {
      return localStorage.getItem('loggedInUser');
    },
    async loginLocal(email, password) {
      const users = ls.get('users', []);
      const hash = await hashPassword(password);
      const found = users.find((u) => u.email === email && u.passwordHash === hash);
      if (!found) throw new Error('Invalid email or password.');
      localStorage.setItem('loggedInUser', email);
      userCache = found;
      return found;
    },
    logoutLocal() {
      localStorage.removeItem('loggedInUser');
      userCache = null;
    },
  };

  const api = {
    async request(path, options = {}) {
      const token = localStorage.getItem('accessToken');
      const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      };
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(`${apiBase}${path}`, {
        ...options,
        headers,
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || 'API Error');
      }
      return res.status === 204 ? null : res.json();
    },
    async register(payload) {
      return this.request('/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    async login(payload) {
      return this.request('/auth/login', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    async me() {
      return this.request('/users/me');
    },
    async getProducts() {
      return this.request('/products');
    },
    async saveProduct(product, isEdit = false) {
      const path = isEdit ? `/products/${product.id}` : '/products';
      return this.request(path, {
        method: isEdit ? 'PUT' : 'POST',
        body: JSON.stringify(product),
      });
    },
    async deleteProduct(id) {
      return this.request(`/products/${id}`, { method: 'DELETE' });
    },
    async getCart() {
      return this.request('/cart');
    },
    async updateCart(item) {
      return this.request('/cart', { method: 'POST', body: JSON.stringify(item) });
    },
    async removeCartItem(productId) {
      return this.request(`/cart/${productId}`, { method: 'DELETE' });
    },
  };

  const local = {
    getUsers: () => ls.get('users', []),
    saveUsers: (users) => ls.set('users', users),
    getProducts: () => ls.get('products', []),
    saveProducts: (products) => ls.set('products', products),
    getCart: (email) => ls.get(`cart_${email}`, []),
    saveCart: (email, cart) => ls.set(`cart_${email}`, cart),
  };

  const ensureAuthOrRedirect = async () => {
    const loggedIn = localStorage.getItem('loggedInUser');
    if (mode === 'api') {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        window.location.href = 'login.html';
        return null;
      }
      try {
        const me = await api.me();
        userCache = me;
        return me;
      } catch (err) {
        localStorage.removeItem('accessToken');
        window.location.href = 'login.html';
      }
      return null;
    }
    if (!loggedIn) {
      window.location.href = 'login.html';
      return null;
    }
    if (!userCache) {
      const users = local.getUsers();
      userCache = users.find((u) => u.email === loggedIn) || null;
    }
    if (!userCache) {
      localStorage.removeItem('loggedInUser');
      window.location.href = 'login.html';
      return null;
    }
    return userCache;
  };

  const renderNavbar = (user) => {
    const navContainer = document.querySelector('[data-app-navbar]');
    if (!navContainer) return;
    navContainer.innerHTML = `
      <nav class="navbar navbar-expand-lg navbar-light bg-white rounded-4 shadow-sm px-4 py-3">
        <a class="navbar-brand text-uppercase text-primary" href="index.html">EcoShop</a>
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#mainNav">
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="mainNav">
          <ul class="navbar-nav ms-auto gap-2 align-items-lg-center">
            <li class="nav-item"><a class="nav-link" href="index.html">Home</a></li>
            <li class="nav-item"><a class="nav-link" href="shop.html">Shop</a></li>
            ${
              user?.role === 'admin'
                ? `
              <li class="nav-item"><a class="nav-link" href="add-product.html">Add Product</a></li>`
                : ''
            }
            <li class="nav-item"><a class="nav-link" href="cart.html">Cart</a></li>
            <li class="nav-item">
              <button class="btn btn-sm btn-outline-success rounded-pill" id="logoutBtn">
                <span class="material-icons align-middle me-1" style="font-size:18px;">logout</span>
                Logout
              </button>
            </li>
          </ul>
        </div>
      </nav>`;
    const logoutBtn = document.querySelector('#logoutBtn');
    logoutBtn?.addEventListener('click', () => {
      if (mode === 'api') {
        localStorage.removeItem('accessToken');
      } else {
        auth.logoutLocal();
      }
      snackbar.show('Logged out successfully', 'success');
      setTimeout(() => (window.location.href = 'login.html'), 600);
    });
  };

  const productCards = (products, user) =>
    products
      .map(
        (product) => `
        <div class="col-sm-6 col-lg-4">
          <div class="card material-card h-100">
            <img src="${product.imageUrl}" alt="${product.name}" class="product-img w-100">
            <div class="card-body d-flex flex-column">
              <div class="d-flex justify-content-between align-items-center mb-2">
                <h5 class="card-title mb-0">${product.name}</h5>
                <span class="badge bg-success text-white">$${Number(product.price).toFixed(2)}</span>
              </div>
              <p class="text-muted flex-grow-1">${product.description}</p>
              <div class="d-flex gap-2">
                <button class="btn btn-material btn-primary w-100" data-add-to-cart="${product.id}">
                  <span class="material-icons align-middle me-1" style="font-size:18px;">add_shopping_cart</span>
                  Add to Cart
                </button>
                ${
                  user?.role === 'admin'
                    ? `
                <a class="btn btn-outline-secondary rounded-pill" href="edit-product.html?id=${product.id}">
                  <span class="material-icons" style="font-size:18px;">edit</span>
                </a>
                <button class="btn btn-outline-danger rounded-pill" data-delete-product="${product.id}">
                  <span class="material-icons" style="font-size:18px;">delete</span>
                </button>`
                    : ''
                }
              </div>
            </div>
          </div>
        </div>`
      )
      .join('');

  const addToCart = async (productId, qty = 1) => {
    if (mode === 'api') {
      await api.updateCart({ productId, qty });
      snackbar.show('Added to cart', 'success');
      return;
    }
    const email = auth.loggedInEmail;
    const cart = local.getCart(email);
    const existing = cart.find((item) => item.productId === productId);
    if (existing) existing.qty += qty;
    else cart.push({ productId, qty });
    local.saveCart(email, cart);
    snackbar.show('Added to cart', 'success');
  };

  const removeProduct = async (productId) => {
    if (mode === 'api') {
      await api.deleteProduct(productId);
      return;
    }
    const products = local.getProducts().filter((p) => p.id !== productId);
    local.saveProducts(products);
  };

  const pageHandlers = {
    async login() {
      const form = document.querySelector('#loginForm');
      form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = form.email.value.trim();
        const password = form.password.value.trim();
        if (!email || !password) return snackbar.show('Fill all fields', 'error');
        try {
          if (mode === 'api') {
            const { token, user } = await api.login({ email, password });
            localStorage.setItem('accessToken', token);
            userCache = user;
          } else {
            await auth.loginLocal(email, password);
          }
          snackbar.show('Welcome back!', 'success');
          setTimeout(() => (window.location.href = 'index.html'), 500);
        } catch (err) {
          snackbar.show(err.message, 'error');
        }
      });
    },
    async register() {
      const form = document.querySelector('#registerForm');
      form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = form.name.value.trim();
        const email = form.email.value.trim().toLowerCase();
        const password = form.password.value.trim();
        const confirm = form.confirmPassword.value.trim();
        if (!name || !email || !password || !confirm)
          return snackbar.show('Please fill all fields', 'error');
        if (!/^[^@]+@[^@]+\.[^@]+$/.test(email))
          return snackbar.show('Invalid email format', 'error');
        if (password.length < 6) return snackbar.show('Password too short', 'error');
        if (password !== confirm) return snackbar.show('Passwords do not match', 'error');
        try {
          if (mode === 'api') {
            await api.register({ name, email, password });
          } else {
            const users = local.getUsers();
            if (users.some((u) => u.email === email)) throw new Error('Email already exists');
            const passwordHash = await hashPassword(password);
            users.push({
              id: uuid(),
              name,
              email,
              passwordHash,
              role: 'customer',
            });
            local.saveUsers(users);
          }
          snackbar.show('Account created! Redirecting to login...', 'success');
          setTimeout(() => (window.location.href = 'login.html'), 1000);
        } catch (err) {
          snackbar.show(err.message, 'error');
        }
      });
    },
    async home(user) {
      renderNavbar(user);
      const cta = document.querySelector('[data-start-shopping]');
      cta?.addEventListener('click', () => (window.location.href = 'shop.html'));
    },
    async shop(user) {
      renderNavbar(user);
      const grid = document.querySelector('#productsGrid');
      const products =
        mode === 'api' ? await api.getProducts() : local.getProducts();
      grid.innerHTML = products.length
        ? productCards(products, user)
        : `<div class="col-12 text-center text-muted">No products yet.</div>`;
      grid.addEventListener('click', async (e) => {
        const addBtn = e.target.closest('[data-add-to-cart]');
        const deleteBtn = e.target.closest('[data-delete-product]');
        if (addBtn) {
          await addToCart(addBtn.dataset.addToCart);
        }
        if (deleteBtn && confirm('Delete this product?')) {
          await removeProduct(deleteBtn.dataset.deleteProduct);
          snackbar.show('Product removed', 'success');
          pageHandlers.shop(user);
        }
      });
    },
    async cart(user) {
      renderNavbar(user);
      const wrapper = document.querySelector('#cartWrapper');
      const render = (items, products) => {
        if (!items.length) {
          wrapper.innerHTML = `<div class="text-center text-muted py-5">Cart is empty.</div>`;
          return;
        }
        let total = 0;
        wrapper.innerHTML = items
          .map((item) => {
            const product = products.find((p) => p.id === item.productId);
            if (!product) return '';
            const subtotal = product.price * item.qty;
            total += subtotal;
            return `
            <div class="card cart-item-card mb-3">
              <div class="card-body d-flex gap-3 align-items-center">
                <img src="${product.imageUrl}" alt="${product.name}" class="rounded-4" width="96" height="96" style="object-fit:cover;">
                <div class="flex-grow-1">
                  <h5>${product.name}</h5>
                  <p class="text-muted mb-1">$${product.price} x ${item.qty}</p>
                  <div class="d-flex gap-2 align-items-center">
                    <input type="number" min="1" class="form-control material-input" value="${item.qty}" data-qty="${item.productId}" style="max-width:120px;">
                    <button class="btn btn-outline-danger rounded-pill" data-remove="${item.productId}">
                      <span class="material-icons" style="font-size:18px;">delete</span>
                    </button>
                  </div>
                </div>
                <strong>$${subtotal.toFixed(2)}</strong>
              </div>
            </div>`;
          })
          .join('');
        document.querySelector('#cartTotal').textContent = `$${total.toFixed(2)}`;
      };

      const products = mode === 'api' ? await api.getProducts() : local.getProducts();
      const items =
        mode === 'api'
          ? await api.getCart()
          : local.getCart(user.email).map((item) => ({ ...item }));
      render(items, products);

      wrapper.addEventListener('input', async (e) => {
        if (e.target.matches('[data-qty]')) {
          const productId = e.target.dataset.qty;
          const qty = Number(e.target.value);
          if (qty <= 0) return;
          if (mode === 'api') await api.updateCart({ productId, qty });
          else {
            const cart = local.getCart(user.email);
            const existing = cart.find((c) => c.productId === productId);
            if (existing) existing.qty = qty;
            local.saveCart(user.email, cart);
          }
          snackbar.show('Cart updated', 'success');
          pageHandlers.cart(user);
        }
      });

      wrapper.addEventListener('click', async (e) => {
        const btn = e.target.closest('[data-remove]');
        if (!btn) return;
        const productId = btn.dataset.remove;
        if (mode === 'api') await api.removeCartItem(productId);
        else {
          const updated = local.getCart(user.email).filter((c) => c.productId !== productId);
          local.saveCart(user.email, updated);
        }
        snackbar.show('Item removed', 'success');
        pageHandlers.cart(user);
      });
    },
    async addProduct(user) {
      renderNavbar(user);
      if (user?.role !== 'admin') {
        document.querySelector('#addProductForm').innerHTML =
          '<p class="text-danger">Only admins can add products.</p>';
        return;
      }
      const form = document.querySelector('#addProductForm');
      form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
          name: form.name.value.trim(),
          price: Number(form.price.value),
          description: form.description.value.trim(),
          imageUrl: form.imageUrl.value.trim(),
        };
        if (!payload.name || !payload.description || !payload.price) {
          return snackbar.show('Fill all required fields', 'error');
        }
        if (payload.price <= 0) return snackbar.show('Price must be positive', 'error');
        if (mode === 'api') {
          await api.saveProduct(payload, false);
        } else {
          const products = local.getProducts();
          products.push({ ...payload, id: uuid() });
          local.saveProducts(products);
        }
        snackbar.show('Product added', 'success');
        setTimeout(() => (window.location.href = 'shop.html'), 600);
      });
    },
    async editProduct(user) {
      renderNavbar(user);
      if (user?.role !== 'admin') {
        document.querySelector('#editProductForm').innerHTML =
          '<p class="text-danger">Only admins can edit products.</p>';
        return;
      }
      const params = new URLSearchParams(window.location.search);
      const productId = params.get('id');
      const products =
        mode === 'api' ? await api.getProducts() : local.getProducts();
      const product = products.find((p) => p.id === productId);
      if (!product) {
        document.querySelector('#editProductForm').innerHTML =
          '<p class="text-danger">Product not found.</p>';
        return;
      }
      const form = document.querySelector('#editProductForm');
      form.name.value = product.name;
      form.price.value = product.price;
      form.description.value = product.description;
      form.imageUrl.value = product.imageUrl;
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const updated = {
          ...product,
          name: form.name.value.trim(),
          price: Number(form.price.value),
          description: form.description.value.trim(),
          imageUrl: form.imageUrl.value.trim(),
        };
        if (mode === 'api') {
          await api.saveProduct(updated, true);
        } else {
          const products = local.getProducts();
          const index = products.findIndex((p) => p.id === product.id);
          products[index] = updated;
          local.saveProducts(products);
        }
        snackbar.show('Product updated', 'success');
        setTimeout(() => (window.location.href = 'shop.html'), 600);
      });
    },
  };

  const init = async () => {
    await seedLocalData();
    mode = await detectMode();
    document.body.dataset.mode = mode;
    const page = document.body.dataset.page;
    if (['home', 'shop', 'cart', 'addProduct', 'editProduct'].includes(page)) {
      const user = await ensureAuthOrRedirect();
      if (!user) return;
      await pageHandlers[page](user);
    } else if (pageHandlers[page]) {
      await pageHandlers[page]();
    }
  };

  return {
    init,
    snackbar,
    get mode() {
      return mode;
    },
    get backendReady() {
      return backendReady;
    },
  };
})();

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

