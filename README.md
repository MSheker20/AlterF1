# AlterF1

Replay real Formula 1 seasons (1950–today) under historical points systems and see how the championship standings would have changed.

## Stack

- **Backend:** Java 26 + Spring Boot 4.2
- **Frontend:** React 19 + Vite 8 + TypeScript + Tailwind CSS 4
- **Database:** PostgreSQL 18
- **Local infrastructure:** Docker Compose

## Run locally

1. Create the local environment file and set your database password:

   ```bash
   cp infra/.env.example infra/.env
   ```

   Edit `infra/.env` and replace `POSTGRES_PASSWORD=change-me` with a local password.

2. Start all services:

   ```bash
   docker compose -f infra/docker-compose.yml up --build
   ```

3. Open the app and verify the API:
   - Frontend: http://localhost:5173
   - API health: http://localhost:8080/api/v1/health

## Develop without Docker

### Backend

```bash
cd backend && ./mvnw spring-boot:run
```

Run backend tests and verification:

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
