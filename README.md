# Room Booking API

[![CI](https://github.com/bwalczyk1/room-booking-api/actions/workflows/ci.yml/badge.svg)](https://github.com/bwalczyk1/room-booking-api/actions/workflows/ci.yml)

REST API do rezerwacji sal: budynki, sale, rezerwacje i konta użytkowników z rolami `USER` i `ADMIN` (JWT). Node.js 22, Express 5, PostgreSQL 17, Knex, Zod, Jest.

## Uruchomienie od zera

Wymagany jest tylko Docker z Docker Compose v2.

```bash
git clone https://github.com/bwalczyk1/room-booking-api.git
cd room-booking-api
cp .env.example .env
docker compose up --build
```

Po starcie:

- API: <http://localhost:3000/api>
- Swagger UI: <http://localhost:3000/api/docs>

Kontener `api` przy starcie sam wykonuje migracje. Konto `ADMIN` i dane przykładowe dodaje seed, uruchamiany w działającym kontenerze:

```bash
docker compose exec api npx knex seed:run
```

Seed tworzy konto `admin@example.com` (hasło `admin-password-123`) i pięć kont `USER` (hasło `user-password-123`), np. `anna.nowak@example.com`.

Zatrzymanie: `docker compose down` (dane zostają w volume `pgdata`), a `docker compose down -v` usuwa też dane.

## Testy

Testy integracyjne korzystają z osobnej bazy `roombooking_test`, którą kontener `db` tworzy przy pierwszym starcie (`docker/initdb`). Do uruchomienia testów lokalnie potrzebny jest Node.js 22+:

```bash
npm ci
docker compose up -d db
npm test                  # unit + integration
npm run test:unit         # bez bazy danych
npm run test:integration  # Supertest + PostgreSQL
```

## Endpointy

| Metoda | Ścieżka | Dostęp |
|---|---|---|
| `POST` | `/api/auth/register`, `/api/auth/login` | publiczne |
| `GET` | `/api/auth/me` | zalogowany |
| `GET` | `/api/buildings`, `/api/rooms`, `/api/rooms/:id` | zalogowany |
| `POST`, `PATCH`, `DELETE` | `/api/buildings`, `/api/rooms` | `ADMIN` |
| `GET`, `POST` | `/api/reservations` | zalogowany (`USER` widzi tylko swoje) |
| `GET` | `/api/reservations/:id` | właściciel albo `ADMIN` |
| `PATCH` | `/api/reservations/:id/cancel` | właściciel albo `ADMIN` |
| `GET` | `/api/admin/audit-log` | `ADMIN` (filtr `?eventType=`, paginacja) |

Pełny opis z przykładami jest w Swagger UI.
