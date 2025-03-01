## Postgres

### Build the pgvector dockerfile:

`docker build -t postgres-pgvector .`

### Run Docker Compose

`docker compose up -d`

Postgres should now be running on http://localhost:6543/

If you want to connect directly, you can use the following command:

`psql -h localhost -p 6543 -U postgres`
`password: postgres`

`\c clustermail`

## Install dependencies

`pnpm i`

## Run

`pnpm dev`