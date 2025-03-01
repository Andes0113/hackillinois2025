import pg from 'pg';
const { Client } = pg;

// https://node-postgres.com/apis/client
export const client = new Client({
  user: 'postgres',
  password: 'postgres',
  host: 'localhost',
  port: 6543,
  database: 'clustermail'
});

async function connectClient() {
  await client.connect();
}

connectClient();
