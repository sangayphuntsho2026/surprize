# Surprize – Frontend (HTML / CSS / JavaScript)

Open `index.html` in a browser – no server, PHP or database needed.
Data (accounts, plans, orders, favourites) is saved in the browser's localStorage.

| File | Purpose |
|---|---|
| `index.html` | Home (hero, why choose us, popular occasions) |
| `admin.html` | Admin login, dashboard, products, orders, customers and reports |
| `login.html`, `register.html` | Account screens |
| `plan.html` | Plan your surprise form + AI assistant |
| `items.html`, `favorites.html` | Gift catalogue, details popup, favourites |
| `order.html`, `payment.html`, `success.html` | Review → pay → done |
| `orders.html` | Order tracking (has a "Demo: next status" button) |
| `profile.html`, `notifications.html`, `about.html` | Profile, alerts, about |
| `css/style.css` | All styling (responsive) |
| `js/store.js` | Data + logic layer (swap these functions for `fetch()` calls to connect a real backend) |
| `js/layout.js` | Sidebar, top bar, stepper, gift grid and popup |

Notes: passwords are stored in plain text in localStorage – demo only (the PHP version hashes them).
The "AI assistant" is rule-based. Emojis stand in for gift photos – edit `GIFTS` in `store.js`.

## Admin demo

Open `admin.html` in your browser. Demo credentials:

- Email: `admin@surprize.bt`
- Password: `Admin@123`

The admin dashboard shares the same browser `localStorage` data as the customer pages. Product changes and order status updates will be visible to the customer-side pages in that same browser. This is a front-end demonstration only: credentials and permissions are not secure, and data is not shared between different devices or browsers. Before publishing, connect a server-side backend with hashed passwords, role-based access control and a real database.
