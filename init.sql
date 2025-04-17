CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS blocks (
    number INT PRIMARY KEY,
    hash VARCHAR(66) NOT NULL,
    tx_count INT NOT NULL,
    indexed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transactions (
    hash VARCHAR(66) PRIMARY KEY,
    block_number INT NOT NULL,
    "from" VARCHAR(42) NOT NULL,
    "to" VARCHAR(42) NOT NULL,
    amount NUMERIC(78, 0) NOT NULL,
    nonce INT NOT NULL,
    indexed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_transactions_block_number ON transactions (block_number);
CREATE INDEX IF NOT EXISTS idx_transactions_from ON transactions ("from");
CREATE INDEX IF NOT EXISTS idx_transactions_to ON transactions ("to");