CREATE TABLE Groups (
    user_email_address TEXT,
    group_id INT PRIMARY KEY,
    name TEXT
);

DROP TABLE IF EXISTS Emails;
CREATE TABLE Emails (
    user_email_address TEXT,
    email_id TEXT PRIMARY KEY,
    sender_email TEXT,
    receiver_emails TEXT,
    subj TEXT,
    body TEXT
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
