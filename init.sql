CREATE TABLE Groups (
    user_email_address TEXT,
    group_id INT PRIMARY KEY,
    name TEXT
);

CREATE TABLE GroupEmail (
    user_email_address TEXT,
    group_id INT,
    email_id TEXT
);

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE EmailEmbeddings (
    email_id TEXT PRIMARY KEY,
    user_email_address TEXT,
    embedding VECTOR(1536)
);
