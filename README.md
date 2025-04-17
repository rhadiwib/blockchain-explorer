# Mini-Blockchain-Explorer

![Version](https://img.shields.io/badge/version-1.0.0-green.svg)
![Node](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)

A lightweight, high-performance blockchain explorer that indexes and displays Ethereum blockchain data through a clean REST API.

## Overview

This Blockchain Explorer is a microservices-based application that connects to the Ethereum blockchain, indexes blocks and transactions, and provides an API for querying this data. It's designed with performance, reliability, and scalability in mind, making it suitable for both development and production environments.

## Features

- **Real-time Block Indexing**: Automatically indexes new blocks as they're added to the blockchain
- **Flexible Block Range Scanning**: Scan specific block ranges or the entire blockchain
- **REST API**: Comprehensive API endpoints for querying blocks, transactions, and statistics
- **Transaction Details**: View sender, recipient, amount, and other transaction information
- **Statistics**: Get aggregate statistics across the entire blockchain or specific block ranges
- **Asynchronous Processing**: Uses message queues for reliable processing of blockchain data
- **Docker Integration**: Easy setup with Docker and Docker Compose
- **TypeScript**: Fully typed codebase for better development experience

## Architecture

Please refer to `Architecture.md` file.

### Components

1. **API Service**: Handles HTTP requests and provides REST endpoints
2. **Indexer Service**: Connects to the Ethereum blockchain, processes blocks and transactions
3. **PostgreSQL Database**: Stores indexed blockchain data
4. **RabbitMQ**: Manages message queues for async processing
5. **Common Package**: Shared utilities, models, and configurations

## Technologies Used

- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL
- **Message Queue**: RabbitMQ
- **Blockchain Connectivity**: ethers.js
- **Containerization**: Docker, Docker Compose
- **Authentication**: JWT

## Prerequisites

- Docker and Docker Compose
- Node.js (>=20.0.0)
- Ethereum Provider URL (Infura, Alchemy, or your own node)

## Installation

1. **Clone the repository**:
   ```bash
   git clone https://gitlab.com/yourusername/blockchain-explorer.git
   cd blockchain-explorer
   ```

2. **Setup environment variables**:
   Create a `.env` file in the project root:
   ```
   BLOCKCHAIN_PROVIDER_URL=https://ethereum-rpc.publicnode.com/
   JWT_SECRET=your-secret-key-here
   DB_HOST=postgres
   DB_PORT=5432
   DB_USERNAME=postgres
   DB_PASSWORD=postgres
   DB_NAME=blockchain_explorer
   DB_SYNCHRONIZE=true
   RABBITMQ_USER=guest
   RABBITMQ_PASSWORD=guest
   ```

3. **Build and start services**:
   ```bash
   docker-compose up -d --build
   ```

## Usage

### Starting the Services

The application consists of two main services:

1. **API Service**:
   ```bash
   # Already started with docker-compose
   # To start manually:
   npm run start:api
   ```

2. **Indexer Service**:
   ```bash
   # Several options for starting the indexer:
   
   # Index all blocks and subscribe to new ones
   npm run start:indexer
   
   # Start from block 100 and index to latest
   npm run start:indexer -- 100
   
   # Index a specific block range (blocks 100-200)
   npm run start:indexer -- 100 200
   ```

### Generating JWT Token for Protected Endpoints

For endpoints that require authentication:

```javascript
const jwt = require('jsonwebtoken');
const token = jwt.sign({ id: '1', role: 'admin' }, 'your-secret-key-here', { expiresIn: '1h' });
console.log(token);
```

## API Endpoints

### Block Endpoints

- **Get the latest block**:
  ```
  GET /block
  ```
  Returns the latest indexed block with all its transactions.

- **Get a specific block**:
  ```
  GET /block/12345
  ```
  Returns block #12345 with all its transactions.

### Transaction Endpoints

- **Get the latest transaction**:
  ```
  GET /tx
  ```
  Returns the most recently indexed transaction.

- **Get a specific transaction**:
  ```
  GET /tx/0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
  ```
  Returns details of the transaction with the specified hash.

### Statistics Endpoints

- **Get overall statistics**:
  ```
  GET /stats
  ```
  Returns aggregate statistics: total blocks, total transactions, and sum of all transaction amounts.

- **Get statistics for a block range**:
  ```
  GET /stats/100:200
  ```
  Returns statistics for blocks between 100 and 200 (inclusive).

### Indexing Endpoint (Protected)

- **Trigger indexing of blocks**:
  ```
  POST /index?auth_token=YOUR_JWT_TOKEN&scan=100:200
  ```
  Instructs the indexer to scan blocks from 100 to 200. Requires authentication.

## Database Schema

The application uses two main tables:

1. **`blocks`**: Stores block information
   - `number` (int, primary key): Block number
   - `hash` (varchar): Block hash
   - `tx_count` (int): Number of transactions in the block
   - `indexed_at` (timestamp): When the block was indexed

2. **`transactions`**: Stores transaction details
   - `hash` (varchar, primary key): Transaction hash
   - `block_number` (int): Block containing this transaction
   - `from` (varchar): Sender address
   - `to` (varchar): Recipient address
   - `amount` (numeric): Transaction amount in wei
   - `nonce` (int): Transaction nonce
   - `indexed_at` (timestamp): When the transaction was indexed

## Development Guide

### Project Structure

```
blockchain-explorer/
├── packages/
│   ├── api/                 # API service
│   ├── indexer/             # Indexer service
│   └── common/              # Shared code and utilities
├── ini.sql                  # PostgreSQL Schema
├── docker-compose.yml       # Docker Compose configuration
├── .env                     # Environment variables
└── package.json             # Project configuration
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific service tests
npm run test:api
npm run test:indexer
```

## Acknowledgements
- [Energi](https://explorer.energi.network) - Energi Blockchain Explorer
- [Ethereum](https://ethereum.org/) - The blockchain platform
- [ethers.js](https://docs.ethers.org/) - Ethereum library
- [Node.js](https://nodejs.org/) - JavaScript runtime
- [RabbitMQ](https://www.rabbitmq.com/) - Message broker
- [PostgreSQL](https://www.postgresql.org/) - Database