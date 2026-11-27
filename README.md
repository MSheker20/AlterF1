# AlterF1

Replay real Formula 1 seasons (1950–today) under five historical points systems (`1950`, `1961`, `1991`, `2003`, `2010`) and see how each championship would have changed.

- **Discovery home page:** lists every season where another points system crowns a different champion, plus a year picker to jump straight into any season.
- **Scenarios:** remove drivers or races, toggle sprint and fastest-lap points, switch real-life multiplier presets (`historical`, `pure`, `all`), or build a custom points system—all encoded in the URL.
- **Compare & progression:** view a side-by-side matrix across all systems and a cumulative points progression chart marking the round the title was mathematically decided.
- **Bilingual & shareable:** available in English at `/` and Turkish at `/tr`, with per-season Open Graph preview images for shared links.

## Stack

- **Backend:** Java 26 + Spring Boot 4.2
- **Frontend:** React 19 + Vite 8 + TypeScript + Tailwind CSS 4
- **Database:** PostgreSQL 18
- **Local infrastructure:** Docker Compose

## Run locally

1. Create the local environment file and set your database passwords:

   ```bash
   cp infra/.env.example infra/.env
   ```

   Edit `infra/.env` and replace both `POSTGRES_PASSWORD=change-me` (owner role) and `ALTERF1_RO_PASSWORD=change-me-too` (read-only role used by the backend) with local passwords.

2. Start all services:

   ```bash
   docker compose -f infra/docker-compose.yml up --build
   ```

3. Open the app and verify the API:
   - Frontend: http://localhost:5173 (EN) and http://localhost:5173/tr (TR)
   - API health: http://localhost:8080/api/v1/health

## End-to-end tests

Start the full stack with Docker Compose (for example `docker compose -f infra/docker-compose.yml up -d --build --wait`), then install Chromium and run the Playwright smoke suite:

```bash
cd frontend && npx playwright install chromium && npm run e2e
```

Set `E2E_BASE_URL` to run the suite against a different URL (defaults to `http://localhost:5173`).

## API

| Endpoint | Description |
| --- | --- |
| `GET /api/v1/seasons` | Available seasons and their real-life champions |
| `GET /api/v1/systems` | The five historical points systems and their full rules |
| `GET /api/v1/seasons/{year}/standings` | Recalculated driver standings, race results, headline summary, and scoring notes |
| `GET /api/v1/seasons/{year}/compare` | Side-by-side ranking matrix across all five systems (plus an active custom system) |
| `GET /api/v1/seasons/{year}/progression` | Cumulative points by round and the race where the championship was decided |
| `GET /api/v1/highlights` | Seasons where another points system crowns a different champion |
| `GET /og/season/{year}.png` | Open Graph preview image for sharing a season |

Standings (and progression / OG) query parameters: `system`, `preset` (`historical` \| `pure` \| `all`), `exclude`, `skip`, `sprint`, `fl`, and custom-system parameters `custom`, `customFl`, `customSprint`, `customBest`.

API errors are returned as RFC 9457 Problem Details (`application/problem+json`).

## F1DB data

The pinned F1DB release and its SHA-256 checksum live in `infra/f1db/f1db.env`. On `docker compose up`, the one-shot `f1db-loader` service downloads the PostgreSQL dump (verified against the pinned SHA-256 and cached in the `f1db-cache` volume) and loads it into the `f1db` schema. If that version is already loaded, the download and import are skipped. To upgrade F1DB, update `F1DB_VERSION` and `F1DB_SHA256` in `infra/f1db/f1db.env`.

The backend reads data using the read-only `alterf1_ro` role, while Flyway connects with the owner role (`POSTGRES_USER`) to manage the `alterf1` schema.

Backend integration tests require Docker and run via Testcontainers using the same `infra/f1db/load.sh` script. The downloaded F1DB archive is cached locally in `infra/f1db/.cache`.

## Develop without Docker

### Backend

```bash
cd backend && ./mvnw spring-boot:run
```

Run backend unit tests (fast, no Docker):

```bash
cd backend && ./mvnw test
```

Run everything, including the `*IT` database tests (needs Docker; loads the real F1DB release into a Testcontainers Postgres):

```bash
cd backend && ./mvnw verify
```

### Frontend

```bash
cd frontend && npm ci && npm run dev
```

Run frontend tests:

```bash
cd frontend && npm test
```

## Repo layout

```text
.
├── backend/              # Spring Boot API
├── frontend/             # React + Vite web application
├── infra/                # Docker Compose and local environment template
└── .github/workflows/    # CI workflows
```

## Data & attribution

Race and championship data is provided by [F1DB](https://github.com/f1db/f1db), licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

AlterF1 is an unofficial fan project and is not associated in any way with the Formula 1 group of companies. F1, FORMULA ONE, FORMULA 1, FIA FORMULA ONE WORLD CHAMPIONSHIP, GRAND PRIX, and related marks are trademarks of their respective owners.
