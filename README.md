# Oliskey School App

**Change how school feels.**
Less stress. More connection. A better school day.

Oliskey School App is a school management and engagement platform that connects
**administrators, teachers, students and parents** in one place — academics,
attendance, results, communication and the everyday work of running a school.

- **Product:** <https://app.oliskey.com/>
- **Company:** <https://www.oliskey.com/>

---

## What is Oliskey?

Most school software is built for the office. Oliskey is built for the school day.

A teacher marks attendance and enters results without fighting a spreadsheet. A
parent sees how their child is actually doing without chasing anyone. A student
finds their timetable, assignments and results in one place. An administrator
sees the whole school — or one branch of it — without asking four people for
four reports.

Everyone signs in to the same platform and sees only what belongs to them.

---

## Features

Each item below corresponds to functionality present in this repository.

**School and people**
- Multi-school (multi-tenant) setup with a main branch and sub-branches
- Student, teacher, parent and staff records
- Class, subject and department management
- Standardised per-school IDs (`SCHOOL_BRANCH_ROLE_NUMBER`)
- Onboarding flow for a new school, and a fully interactive demo

**Academics**
- Attendance (including QR-scanned lesson attendance)
- Assignments and submissions
- Quizzes and exams
- Results, gradebook and report cards with an admin publishing step
- Timetables and academic calendar/terms
- Learning hub resources and study plans

**Engagement**
- Messaging and chat between roles
- Notices, announcements and notifications
- Parent engagement views for each child
- Rewards and recognition

**Operations**
- Fees, payments and payment plans (Paystack / Flutterwave integrations)
- Payroll and payslips
- Transport, hostel and inventory modules
- Safeguarding/incident workflows, inspections and compliance
- Reporting and analytics dashboards per role

**Platform**
- AI-assisted tools, served through a server-side proxy
- Progressive Web App with offline support and background sync
- Real-time updates over Socket.io
- Multi-language support

Roles supported: Admin, Super Admin, Proprietor, Teacher, Student, Parent,
Inspector, Exam Officer, Compliance Officer, Counselor.

---

## Demo

<https://app.oliskey.com/> — choose **Try Demo** to enter a working demo school
and switch between the admin, teacher, student and parent views without
creating an account.

---

## Technology

Confirmed from this repository:

| Layer | Stack |
|---|---|
| Frontend | React 19, TypeScript, Vite 6, Tailwind CSS |
| Backend | Node.js, Express 5, Socket.io |
| Database | PostgreSQL via Prisma, with row-level security |
| Realtime/cache | Socket.io, Redis (optional) |
| Testing | Vitest (unit + integration), Playwright (end-to-end) |
| Delivery | PWA with a service worker; deployed on Vercel |

---

## Security

Oliskey holds real school data, so access control is enforced in layers:

- **Authentication** — signed sessions; tokens are verified with a pinned algorithm.
- **Authorization** — every role's permissions are checked server-side. Hidden
  buttons are never treated as a security control.
- **Tenant isolation** — one school can never read or write another school's
  data, and within a school, branch scoping applies.
- **Database-level enforcement** — PostgreSQL row-level security policies are
  enabled and forced on tenant tables, and the application connects as a
  database role that cannot bypass them. The server refuses to start in
  production on a role that could.
- **Secrets** — API keys and database credentials are server-side only and are
  never bundled into the browser.

Automated tests cover cross-school access, cross-branch access, parent/child
isolation, payment replay and authentication bypass attempts.

Found a security issue? Please report it privately to the maintainers rather
than opening a public issue.

---

## Development

Requires Node.js 20 and a PostgreSQL database.

```bash
# install
npm run setup

# environment: create the two .env files
#   .env          (frontend, VITE_* values)
#   backend/.env  (DATABASE_URL, DIRECT_URL, JWT_SECRET, ...)
# see .env.example and backend/.env.example for the full list

# database
npm run db:migrate      # apply migrations
npm run db:seed         # seed the demo school

# run frontend (port 3000) and backend (port 5000) together
npm run start:all
```

Useful commands:

```bash
npm run dev             # frontend only
npm run server          # backend only
npm run build           # production build
npm run test:run        # frontend unit tests
npx playwright test     # end-to-end tests
```

Backend integration tests run against a real database:

```bash
npx tsx --tsconfig backend/tsconfig.json node_modules/vitest/vitest.mjs run \
  --config backend/vitest.config.ts
```

---

## Deployment

The application is deployed on **Vercel**: the Vite build is served as the
frontend and the Express API runs as a serverless function under `/api`
(`api/index.js`, see `vercel.json`). Database migrations are applied during the
build. Pushes to `main` deploy to production.

---

## Project structure

```
components/   React screens grouped by role (admin, teacher, student, parent, ...)
lib/          API client, AI client, shared browser utilities
backend/src/  Express app: routes, controllers, services, middleware
backend/prisma/  Schema and migrations (including row-level security policies)
tests/e2e/    Playwright end-to-end suites
public/       PWA manifest, icons, service worker, robots.txt, sitemap.xml
```

---

## License

This project does not currently declare an open-source license. All rights
reserved by Oliskey unless a license file is added.
