# Dynamic Online Shopping Website

Fully responsive e-commerce assignment solution featuring a Bootstrap 5 + Material Design frontend (hero/layout inspired by the provided muted-green template image) with dual data modes (LocalStorage-first with automatic REST API detection) and a secure Node.js/Express/MongoDB backend.

## Tech Stack

- Frontend: HTML5, Bootstrap 5, Material Icons, vanilla JS modules, LocalStorage
- Backend: Node.js (ESM), Express, MongoDB/Mongoose, JWT, bcrypt, Multer
- Storage modes: LocalStorage arrays (`users`, `products`, `cart_<email>`) or API (`/api/*`) chosen at runtime via `/api/ping`

## Project Structure

```
frontend/         # Static assignment-ready UI pages
  assets/css/     # Global Material+Bootstrap styles
  assets/js/      # App bootstrap logic (dual-mode data layer)
server/           # Express API (auth/products/cart)
  src/            # Config, models, routes and controllers
  uploads/        # Local image uploads (served as /uploads/<file>)
```

## Frontend Pages

- `register.html`, `login.html`
- `index.html` (home/hero), `shop.html`
- `add-product.html`, `edit-product.html` (admin only)
- `cart.html`

All forms include client-side validation, Material inputs, and snackbar feedback. The navbar renders conditionally per role and exposes Logout and Cart shortcuts.

## Running Locally

```bash
# 1. Install backend dependencies
npm --prefix server install

# 2. (Optional) create server/.env overriding defaults
# PORT=4000
# MONGO_URI=mongodb://127.0.0.1:27017/eco-shop
# JWT_SECRET=super_secret_key

# 3. Start the API (uses nodemon in dev)
npm --prefix server run dev

# 4. Serve the frontend (any static server, e.g. using VS Code Live Server or npx serve)
npx serve frontend
```

The frontend automatically checks `GET /api/ping`. If reachable it stores JWT tokens (`accessToken`) and talks to the API; otherwise it falls back to LocalStorage-only mode (seeded admin + sample products).

### Default credentials

- Admin: `admin@gmail.com` / `admin123`

## API Surface

| Method | Endpoint | Notes |
| ------ | -------- | ----- |
| `GET` | `/api/ping` | Backend availability probe |
| `POST` | `/api/auth/register` | Create user (hashes password) |
| `POST` | `/api/auth/login` | Returns `{ token, user }` |
| `GET` | `/api/users/me` | Requires `Authorization: Bearer <token>` |
| `GET` | `/api/products` | Public listing |
| `POST` | `/api/products` | Admin only — JSON or multipart (image upload) |
| `GET` | `/api/products/:id` | Product detail |
| `PUT` | `/api/products/:id` | Admin update |
| `DELETE` | `/api/products/:id` | Admin delete |
| `GET` | `/api/cart` | Logged-in user cart |
| `POST` | `/api/cart` | Upsert `{ productId, qty }` |
| `DELETE` | `/api/cart/:productId` | Remove cart line |

## Alternative SQLite Instructions

The backend defaults to MongoDB via Mongoose. To run with SQLite instead:

1. Install extra deps: `npm --prefix server install sqlite3 knex`.
2. Replace the `connectDB` helper with a Knex instance pointing to `sqlite.db`, and adjust the models/controllers to use Knex queries instead of Mongoose schemas (structure matches Users, Products, Cart tables).
3. Update `server/src/index.js` to create tables if they do not exist and seed the admin row.

MongoDB remains the primary supported path for the assignment, but the controllers are intentionally thin so swapping to Knex is straightforward.

## Testing & Notes

- Frontend LocalStorage mode pre-populates admin account and starter products.
- Snackbar + alerts provide user feedback for validations.
- JWT tokens are stored in `localStorage.accessToken` and cleared on Logout.
- Product images can be remote URLs (for LocalStorage) or uploaded files (API mode → stored under `server/uploads/`).

Feel free to push this directory as-is to GitHub — no build step required for the frontend; the backend runs via `node src/index.js`.

