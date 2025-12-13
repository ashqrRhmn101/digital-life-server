
### Server Side (Backend) – `README.md` (Node.js + Express + MongoDB)

Live Link:-
https://digital-life-client.vercel.app/

```markdown
# Digital Life Lessons – Backend API

RESTful API for the Digital Life Lessons platform. Built with Node.js, Express, MongoDB, and Stripe payments.

## Features

- User authentication support (Firebase token verification optional)
- CRUD operations for lessons
- Favorites, likes, comments, reports
- Premium user management (Stripe webhook)
- Admin routes (manage users, lessons, reports)
- Secure, upsert-based user system

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB (Atlas)
- **Payments**: Stripe
- **Others**: cors, dotenv, mongodb driver

## API Endpoints

### Users
- `GET /user?email=...` → Fetch or create user
- `PUT /users` → Upsert user (register + Google)
- `GET /user-stats?email=...` → Dashboard stats
- `GET /users/admin/:email` → Check admin

### Lessons
- `POST /lessons` → Add lesson
- `GET /lessons` → Public + filtered lessons
- `GET /lessons/:id` → Single lesson
- `PATCH /lessons/:id` → Update
- `DELETE /lessons/:id` → Delete

### Favorites & Interactions
- `POST /favorites` → Save lesson
- `GET /favorites?email=...` → User's favorites
- `DELETE /favorites/:id` → Remove

### Admin
- `GET /admin-stats` → Platform stats
- `GET /admin/users` → All users
- `PATCH /admin/users/:id/role` → Change role
- `DELETE /admin/users/:id` → Delete user
- `GET /admin/reported-lessons` → Reported content
- `POST /admin/report-action` → Delete/Ignore report

### Payments
- `POST /create-checkout-session` → Stripe checkout
- `POST /webhook` → Stripe webhook (premium flag)

## Installation

1. Clone the repo
```bash
git clone https://github.com/yourusername/digital-life-lessons-server.git
cd digital-life-lessons-server

npm install
DB_USER=your_mongo_user
DB_PASS=your_mongo_pass
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
PORT=5000
npm start
# or
nodemon index.js
