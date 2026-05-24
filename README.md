# Task Management & Productivity Analytics Platform

Production-grade REST backend built with **NestJS + MongoDB**, satisfying the Batch-2025 Final Re-Assessment spec.

Teams can register, log in, create / assign / track / complete tasks, comment on them, and view productivity analytics. A scheduler aggregates daily metrics and flags inactive users.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Runtime | Node.js 20+ |
| Framework | NestJS 11 (Express adapter) |
| DB | MongoDB Atlas (Mongoose 9) |
| Auth | JWT (Passport) + bcrypt |
| Cache / Revocation | Redis (ioredis) |
| Scheduler | `@nestjs/schedule` |
| Validation | class-validator + class-transformer |

---

## Folder Structure

```
src/
├── auth/               Auth (register/login/logout/me/profile)
│   ├── dto/
│   └── strategies/     JwtStrategy (Passport)
├── users/              User schema + repository
│   ├── entities/       UserEntity (response shape)
│   └── schemas/        Mongoose schema + pre('save') bcrypt hook
├── tasks/              Task CRUD, assignment, completion, search
│   ├── dto/            Create/Update/Query DTOs
│   ├── entities/       TaskEntity (response shape)
│   └── schemas/
├── comments/           Per-task comments
│   ├── dto/
│   ├── entities/       CommentEntity
│   └── schemas/
├── analytics/          Activity log, analytics APIs, cron jobs
│   └── schemas/        task-activity + daily-task-metric
├── redis/              Redis client + token denylist
│   ├── redis.module.ts
│   ├── redis.service.ts
│   └── redis.constants.ts   REDIS_CLIENT token (kept separate to avoid file-level circular import)
├── common/             Cross-cutting concerns
│   ├── decorators/     @Public, @CurrentUser, @Roles, @Token
│   ├── guards/         JwtAuthGuard, RolesGuard
│   ├── interfaces/     AuthenticatedUser
│   └── pipes/          ParseObjectIdPipe
├── app.module.ts
└── main.ts             Boot: /api prefix, global ValidationPipe
```

---

## Environment Setup

### 1. Prerequisites
- Node.js ≥ 20
- npm ≥ 10
- Redis running locally (or remote)
- MongoDB Atlas cluster (or local mongod)

### 2. Install
```bash
git clone <repo-url>
cd assesment
npm install
```

### 3. Configure `.env`
Create a `.env` in the project root:

```env
PORT=3000

MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>/assesment?appName=Cluster0

JWT_SECRET=<128-char hex; generate with `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`>
JWT_EXPIRES_IN=24h

REDIS_HOST=127.0.0.1
REDIS_PORT=6379
```

### 4. Start Redis
```bash
brew install redis
brew services start redis
redis-cli ping        # → PONG
```

### 5. Run
```bash
npm run start:dev     # watch mode
# or
npm run build && npm run start:prod
```

App listens on `http://localhost:3000` with global prefix `/api`.

---

## Authentication

All routes are protected by `JwtAuthGuard` at the class level. Routes marked with `@Public()` bypass auth. Role-restricted routes additionally pass through `RolesGuard` triggered by `@Roles('manager', 'admin')`.

- Password hashing: bcrypt, **12 salt rounds** (≥ 10 as required).
- Token: HS256 signed JWT, **24-hour** expiry.
- Logout: token is added to a Redis denylist with TTL equal to its remaining lifetime.

---

## Response Serialization

Every user-, task-, and comment-shaped response is transformed through a class-transformer **entity** before being sent, with two layers of protection:

1. **Service layer** — services build entities via `plainToInstance(<Entity>, plain, { excludeExtraneousValues: true })`. Only `@Expose`'d fields land on the entity; password / `_id` / `__v` / Mongoose internals never get assigned.
2. **Controller layer** — each controller is annotated `@UseInterceptors(ClassSerializerInterceptor)`, which runs `instanceToPlain` on the response, applying any remaining `@Transform` decorators (e.g. `_id → id`).

Entity classes:
- `users/entities/user.entity.ts`     — `UserEntity`
- `tasks/entities/task.entity.ts`     — `TaskEntity`  (incl. `id`, `assignedTo`, `createdBy` as strings)
- `comments/entities/comment.entity.ts` — `CommentEntity`

Effect: every response uses `id` (not `_id`), never includes `__v`, and cannot leak `password` even if a regression upstream forgets `plainToInstance`.

The interceptor is **not** registered globally — `ClassSerializerInterceptor` would walk Mongoose's internal `$__`/`_doc` properties on raw documents, so it's scoped per-controller.

---

## API Reference

All paths are prefixed with `/api`. Authenticated routes require `Authorization: Bearer <token>`.

### Auth — `/api/auth`

| Method | Path | Auth | Body / Notes |
|---|---|---|---|
| POST | `/register` | public | `{username, email, password, fullName?, designation?, role?}` |
| POST | `/login` | public | `{email, password}` → `{user, token}` |
| POST | `/logout` | bearer | denylists the token |
| GET  | `/me` | bearer | current user profile |
| PUT  | `/profile` | bearer | `{fullName?, designation?, avatar?}` |

### Tasks — `/api/tasks`

| Method | Path | Auth | Roles |
|---|---|---|---|
| POST   | `/` | bearer | manager, admin |
| GET    | `/` | bearer | any (paginated) |
| GET    | `/search?q=keyword` | bearer | any |
| GET    | `/my-tasks` | bearer | any |
| GET    | `/:id` | bearer | any |
| PUT    | `/:id` | bearer | creator or admin |
| DELETE | `/:id` | bearer | admin |
| PATCH  | `/:id/complete` | bearer | assignee, creator, or admin |

Query params on `GET /`:
`page`, `limit`, `status`, `priority`, `assignedTo`, `sortBy=dueDate|priority|createdAt`, `sortOrder=asc|desc`, `q` (text search across title + description).

Response shape (a `TaskEntity`, not a raw Mongoose document):
```json
{
  "items": [
    {
      "id": "6a12fd169ad13112089ef594",
      "title": "Ship v1",
      "description": "",
      "assignedTo": "6a12fd159ad13112089ef593",
      "createdBy": "6a12fd149ad13112089ef592",
      "priority": "high",
      "status": "pending",
      "tags": [],
      "createdAt": "2026-05-24T13:28:54.121Z",
      "updatedAt": "2026-05-24T13:28:54.121Z"
    }
  ],
  "meta": { "page": 1, "limit": 10, "total": 42, "totalPages": 5 }
}
```
No `_id`, no `__v` — see [Response Serialization](#response-serialization).

### Comments

| Method | Path | Auth | Permission |
|---|---|---|---|
| POST   | `/api/tasks/:taskId/comments` | bearer | any |
| GET    | `/api/tasks/:taskId/comments` | bearer | any |
| PUT    | `/api/comments/:id` | bearer | owner |
| DELETE | `/api/comments/:id` | bearer | owner or admin |

### Analytics — `/api/analytics`

All endpoints require `manager` or `admin`.

| Method | Path | Returns |
|---|---|---|
| GET | `/overview` | `{ totalTasks, completedTasks, activeUsers }` |
| GET | `/user/:userId` | `{ totalAssigned, totalCompleted, completionRate, averageCompletionHours }` |
| GET | `/tasks/trending` | most-active tasks in the last 7 days |

---

## Cron Jobs

| Name | Schedule (test) | Spec | Behavior |
|---|---|---|---|
| `daily-productivity-aggregation` | every 2 minutes | daily at midnight | Aggregates the day's `tasksCreated`, `tasksCompleted`, `activeUsers` into `daily_task_metrics` |
| `inactive-user-detection` | every minute | every hour | Marks users `isActive: false` if no task activity and no `lastLogin` in the last 30 days |
| `overdue-task-reminder` *(bonus)* | every 10 minutes | — | Logs a warning for each task past its `dueDate` and not yet completed |

All cron firings emit structured logs at INFO/WARN level.

---

## Data Model

### `users`
`username` (uniq), `email` (uniq), `password` (bcrypt, hidden), `fullName`, `designation`, `role ∈ {user, manager, admin}`, `avatar`, `isActive`, `lastLogin`, `createdAt`, `updatedAt`.

### `tasks`
`title`, `description`, `assignedTo → User`, `createdBy → User`, `priority ∈ {low, medium, high}`, `status ∈ {pending, in_progress, completed}`, `dueDate`, `tags[]`, `completedAt`. Indexes: `status`, `priority`, `assignedTo`, `dueDate`, `createdBy`, and a text index on `(title, description)` for `?q=` search.

### `comments`
`taskId → Task`, `userId → User`, `content`, `isEdited`.

### `task_activity`
`taskId`, `userId`, `action ∈ {created, updated, completed, commented}`, `ipAddress`, `userAgent`, `createdAt`.

### `daily_task_metrics`
`date` (uniq), `totalTasksCreated`, `totalTasksCompleted`, `activeUsers`.

---

## Security

- Passwords are hashed with bcrypt (12 rounds) before persistence; password is `select: false` so it never leaks via normal `.find()`.
- JWTs are signed with a 64-byte (128-hex) secret rotated per deployment.
- Token revocation is enforced inside `JwtStrategy.validate()` via Redis denylist lookup.
- Role-based access control via `RolesGuard` + `@Roles()` metadata.
- Global `ValidationPipe` with `whitelist`, `forbidNonWhitelisted`, `transform: true` strips unknown fields and rejects malformed payloads.
- Object IDs validated through `ParseObjectIdPipe` where appropriate.

---

## Advanced Feature (Part 6)

**Task search API** is implemented at `GET /api/tasks/search?q=keyword` (and also via the `q` query param on `GET /api/tasks`). It uses a MongoDB text index on `title` + `description` with an escape-regex fallback for safe substring matching.

---

## Example cURL

```bash
export BASE=http://localhost:3000/api

# 1. Register
TOKEN=$(curl -s -X POST $BASE/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","email":"alice@x.io","password":"secret123","role":"manager"}' \
  | jq -r .token)

# 2. Create a task (manager role required)
TASK_ID=$(curl -s -X POST $BASE/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Ship v1","priority":"high","dueDate":"2026-06-01T00:00:00Z"}' \
  | jq -r .id)

# 3. Add a comment
curl -s -X POST $BASE/tasks/$TASK_ID/comments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content":"Kicked off"}' | jq

# 4. Complete the task
curl -s -X PATCH $BASE/tasks/$TASK_ID/complete \
  -H "Authorization: Bearer $TOKEN" | jq

# 5. Overview analytics
curl -s $BASE/analytics/overview -H "Authorization: Bearer $TOKEN" | jq
```

---

## Scripts

| Script | Purpose |
|---|---|
| `npm run start:dev` | Hot-reload dev server |
| `npm run build` | Compile to `dist/` |
| `npm run start:prod` | Run compiled output |
| `npm run lint` | ESLint --fix |
| `npm test` | Jest unit tests |

---

## Notes

- Cron schedules are set to the **testing cadence** required by the spec (every 1–2 minutes). Change to the production cadence (`0 0 * * *` for daily, `0 * * * *` for hourly) before going live by editing `src/analytics/analytics.cron.ts`.
- All routes return JSON and use REST-conventional status codes (`201` on resource creation, `200` on read / no-op / login, `404` on missing, `403` on insufficient role, `401` on bad/expired/revoked token, `409` on duplicate username/email, `400` on validation failure).
