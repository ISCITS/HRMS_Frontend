# HRMS Backend

Enterprise-ready FastAPI backend scaffold for a web application using Clean Architecture, feature toggles, PostgreSQL, Redis, Microsoft Entra ID SSO, Alembic, Docker, and pytest.

Data flow summary: web client request -> middleware -> versioned router -> service layer -> repository layer -> PostgreSQL, with optional Redis reads/writes around service operations and centralized exception/response handling on the way back out.

## Highlights

- Versioned REST APIs under `/api/v1`
- Centralized configuration in `app/core/Config.py`
- Conditional middleware and integrations via `.env`
- SQLAlchemy ORM with PostgreSQL and Alembic migration support
- Microsoft Entra ID JWT validation with JWKS verification
- Redis caching that gracefully no-ops when disabled
- Structured logging, exception handling, health checks, and example tests

## Local Setup

1. Create and activate a Python 3.11+ virtual environment.
2. Install dependencies with `pip install -r requirements.txt`.
3. Copy `.env.example` to `.env` and update the values.
4. Start PostgreSQL and Redis, or use Docker Compose.
5. Run the API with `uvicorn app.main:app --host 0.0.0.0 --port 8000`.

## Feature Toggles

- `ENABLE_SSO=true` enables Microsoft Entra ID JWT validation.
- `ENABLE_AUTH_MIDDLEWARE=true` loads auth middleware when SSO is also enabled.
- `ENABLE_REDIS=true` enables Redis caching support.
- `ENABLE_REQUEST_LOGGING=true` enables request logging middleware.
- `ENABLE_CORS=true` enables CORS middleware.
- `ENABLE_SWAGGER=true` enables `/docs`, `/redoc`, and `/openapi.json`.

If a feature is disabled, the related middleware or integration is skipped without code changes.

## Migrations

- `alembic revision --autogenerate -m "init"`
- `alembic upgrade head`

## Docker

- `docker-compose up --build`

## Testing

- `pytest`

## Sample Endpoints

- `GET /health`
- `GET /api/v1/users`
- `GET /api/v1/users/{intUserId}`
- `POST /api/v1/users`
