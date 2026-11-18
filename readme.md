# High Street Gym

A session booking and management system for a Brisbane gym. The original management site is built with Express, EJS, Tailwind CSS and MySQL; a mobile-first React app in `frontend/` consumes the same data through a JSON API.

## About the client

High Street Gym has clubs at Ashgrove, Brisbane City, Chermside, Graceville and Westlake. Classes include Yoga, Pilates, Abs, HIIT, Indoor Cycling, Boxing, Zumba and more.

The design follows the mock-up in [`docs/design/Screenshot.png`](docs/design/Screenshot.png).

## Roles

| Role | What they can do |
| --- | --- |
| Guest | View the timetable and blog |
| Member | Book sessions, view and cancel bookings, write posts, delete own posts |
| Trainer | Create, edit, delete and search their own sessions; write posts; delete own posts |
| Administrator | Manage users, posts, sessions, bookings, activities and locations |

## Features

- Weekly timetable of all sessions
- Session booking, with a trainer choice when the same class runs at the same time
- Member bookings page with cancellation
- Trainer dashboard for their own sessions
- Shared blog, with member and trainer posts and admin moderation
- Admin dashboard with CRUD and search for all six resources
- Mobile-first React app for the timetable, bookings, blog, profile editing and XML exports
- JSON API with key-based authentication

## Technologies

- Express for routing
- EJS for the server-side templates
- React 19 and Vite for the client app
- Tailwind CSS v4 and daisyUI for styling
- express-session for the server-side login sessions
- API keys in the `x-auth-key` header for the JSON API
- bcryptjs for password hashing
- mysql2 for database access
- swagger-jsdoc and swagger-ui-express for the interactive API documentation
- express-openapi-validator for request and response validation

## Setup

Install dependencies:

```bash
npm install
```

Copy the example environment file and fill in your MySQL details:

```bash
cp backend/.env.example backend/.env
```

```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your-mysql-password
DB_NAME=high-street-gym
```

Create and seed the database:

```bash
npm run setup-db
```

If the database already exists from an earlier version, add the API key column without dropping the data:

```bash
npm run db:migrate:api-key
npm run db:migrate
```

You can also import `docs/database/sample-db.sql` in MySQL Workbench instead.

Start the server-side app:

```bash
npm start
# or, with auto restart
npm run dev
```

Then open http://localhost:8080.

Start the React app in a second terminal:

```bash
npm run dev:frontend
```

Then open http://localhost:5173. It calls the API at http://localhost:8080/api, so the backend must be running. Build the production files with `npm run build:frontend`.

### Styles

The compiled stylesheet is already in `backend/public/css/tailwind.css`, so the app runs without a build step. Rebuild it after changing templates or the Tailwind source:

```bash
npm run tailwind        # watch
npm run tailwind:build  # one-off
```

Theme colours and the `.btn`, `.input` and `.card` classes are in `backend/src/tailwind.css`.

## Demo accounts

All seeded accounts use the password `password`.

| Email | Role |
| --- | --- |
| admin@hsgym.com | admin |
| liam@hsgym.com | trainer |
| sarah@hsgym.com | trainer |
| jack@hsgym.com | trainer |
| ava@hsgym.com | member |
| ethan@hsgym.com | member |
| mia@hsgym.com | member |

## Project structure

```
high-street-gym/
├── backend/
│   ├── controllers/    # route handlers
│   ├── models/         # database access
│   ├── views/          # EJS templates
│   ├── public/         # images and compiled CSS
│   ├── src/            # Tailwind source
│   ├── utils/          # validation rules
│   ├── scripts/        # database setup
│   └── server.mjs
├── frontend/           # React app (Vite, Tailwind, daisyUI)
│   └── src/
│       ├── authentication/
│       ├── bookings/
│       ├── common/
│       ├── posts/
│       ├── timetable/
│       └── trainer/
├── docs/               # sample SQL and design mock-up
├── brief.md
└── readme.md
```

## Validation

Form input is cleaned and checked in `backend/utils/Validation.mjs`. Controllers pass `req.body` through `Validation.run` before using any values. The rules cover required text, email and password formats, whole numbers, fixed choices, dates and times, plus route ids and search terms.

A few rules need more than one field or a database lookup, so they live in the controllers. For example, a session must end after it starts, cannot be scheduled in the past, and a member cannot book the same session twice or exceed its capacity.

## Routes

- `/timetable` and `/blog` are public.
- `/bookings` is for members.
- `/trainer` is for trainers.
- `/admin` is for administrators.

## JSON API

The API is mounted at `/api`. `GET /api` lists every endpoint. Log in with `POST /api/authenticate` (email and password) to receive a key, then send it on each authenticated request as the `x-auth-key` header.

Interactive documentation is at http://localhost:8080/api/docs. Use the **Authorize** button there to paste the key from `POST /api/authenticate` and try the protected endpoints. The raw OpenAPI document is at `/api/docs.json`.

Requests and responses are validated against that OpenAPI document by `express-openapi-validator`. A request that does not match its schema returns a 400 with the failing paths, and the controllers still apply their own rules for things a schema cannot express, such as capacity and double booking.

| Area | Endpoints |
| --- | --- |
| Authentication | `POST /api/authenticate`, `DELETE /api/authenticate` |
| Users | `POST /api/users` (register), `GET /api/users/self`, `PUT /api/users/self` |
| Sessions | `GET /api/sessions`, `GET /api/sessions/mine`, `GET /api/sessions/xml`, `POST /api/sessions`, `PUT /api/sessions/:id`, `DELETE /api/sessions/:id` |
| Bookings | `GET /api/bookings`, `GET /api/bookings/xml`, `POST /api/bookings`, `DELETE /api/bookings/:id` |
| Posts | `GET /api/posts`, `POST /api/posts`, `DELETE /api/posts/:id` |
| Reference data | `GET /api/activities`, `GET /api/locations` |

Trainers can export their sessions for the week, and members can export all their bookings with activity details, both as XML. The React app stores the key in local storage and sends it when downloading either export.
# high-street-gym
