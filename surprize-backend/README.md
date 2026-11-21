# Surprize backend

Node.js + Express + MySQL backend for the Surprize frontend.

## 1. Requirements
- Node.js 18 or newer
- MySQL 8 or compatible
- npm

## 2. Install
Open a terminal in this `surprize-backend` folder:

```bash
npm install
```

## 3. Create the database
Open MySQL Workbench, open `database/schema.sql`, and execute the whole file.

## 4. Configure environment
Copy `.env.example` to `.env`. Fill in your MySQL password and a long random `SESSION_SECRET`.

Set `FRONTEND_DIR` to the folder containing your existing `index.html`. For example, if the frontend folder is beside `surprize-backend`, use:

```env
FRONTEND_DIR=../your-frontend-folder
```

For real AI suggestions, create an API key and put it in `OPENAI_API_KEY`. Keep this key only in `.env` on the server. Never put it in frontend JavaScript or upload `.env` to GitHub. If the key is blank or the AI request fails, the endpoint uses rule-based suggestions.

## 5. Create an admin
Add these values temporarily to `.env`:

```env
ADMIN_NAME=Surprize Admin
ADMIN_EMAIL=admin@surprize.bt
ADMIN_PASSWORD=choose-a-strong-password
```

Run:

```bash
npm run create-admin
```

Remove `ADMIN_PASSWORD` from `.env` after the admin is created.

## 6. Start the server

```bash
npm run dev
```

Open `http://localhost:3000`. Test `http://localhost:3000/api/health`.

## API routes

### Authentication
- `POST /api/auth/register` — `{name,email,phone,password,password2}`
- `POST /api/auth/login` — `{email,password}`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `PUT /api/auth/profile` — `{name,phone,address,bio}`
- `PATCH /api/auth/password` — `{currentPassword,newPassword}`

### Gifts and favourites
- `GET /api/gifts?q=&type=`
- `GET /api/gifts/favorites`
- `POST /api/gifts/favorites/:giftId`
- `DELETE /api/gifts/favorites/:giftId`

### AI gift assistant
- `POST /api/gifts/ai-suggestions`
- Body: `{occasion,budget,recipient,interests}`
- Response: `{source,explanation,bundle,spent,ideas,messages}`
- `source` is `ai` when the real AI service succeeds and `rules` when fallback is used.

### Plans, orders and notifications
- `POST /api/plans`
- `GET /api/plans/mine`
- `POST /api/orders` — requires title, occasion, date, recipient details and `items: [{giftId,quantity}]`
- `GET /api/orders/mine`
- `GET /api/orders/:id`
- `PATCH /api/orders/:id/cancel`
- `POST /api/orders/:id/payment` — `{method:'bank_transfer'|'cod',reference}`
- `GET /api/notifications`
- `PATCH /api/notifications/read-all`

### Admin (admin session required)
- `GET /api/admin/stats`
- `GET /api/admin/users`
- `GET /api/admin/orders`
- `PATCH /api/admin/orders/:id/status` — `{status}`
- `PATCH /api/admin/orders/:id/payment` — `{status}`
- `GET /api/admin/gifts`
- `POST /api/admin/gifts`
- `PUT /api/admin/gifts/:id`
- `DELETE /api/admin/gifts/:id` — soft-deletes a gift

## Important integration note
The uploaded frontend HTML calls functions such as `S.login()`, `S.register()`, `S.placeOrder()` and `S.suggest()`. Those functions live in `js/store.js`, which was not included in the uploaded files. The `js/layout.js`, CSS, `success.html`, and actual gift catalogue were also not included. Therefore this backend is a working API foundation, but the existing pages still need a frontend API adapter and a final integration pass using those missing files.

Bank transfer is recorded as **Awaiting verification**; this code does not connect to a bank or automatically verify transfers. The admin must verify the reference. Cash on delivery is recorded as **Pay on delivery**. No real payment gateway is connected.
