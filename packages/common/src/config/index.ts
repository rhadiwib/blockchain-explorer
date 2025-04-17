import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  name: string;
  synchronize: boolean;
  logging: boolean;
}

interface BlockchainConfig {
  providerUrl: string;
  networkId: number;
}

interface RabbitMQConfig {
  url: string;
  exchangeName: string;
  queueNames: {
    blockProcessing: string;
    transactionProcessing: string;
  };
}

interface JwtConfig {
  secret: string;
  expiresIn: string;
}

export interface Config {
  environment: string;
  database: DatabaseConfig;
  blockchain: BlockchainConfig;
  rabbitmq: RabbitMQConfig;
  jwt: JwtConfig;
}

export const getConfig = (): Config => {
  // rabbitMQ host based on environment
  const rabbitMQHost = process.env.NODE_ENV === 'development' ? 'localhost' : 'rabbitmq';
  const rabbitMQUrl = process.env.RABBITMQ_URL || 
    `amqp://${process.env.RABBITMQ_USER || 'guest'}:${process.env.RABBITMQ_PASSWORD || 'guest'}@${rabbitMQHost}:5672`;

  return {
    environment: process.env.NODE_ENV || 'development',
    database: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      name: process.env.DB_NAME || 'blockchain_explorer',
      synchronize: process.env.DB_SYNCHRONIZE === 'true',
      logging: process.env.DB_LOGGING === 'true',
    },
    blockchain: {
      providerUrl: process.env.BLOCKCHAIN_PROVIDER_URL || 'http://localhost:8545',
      networkId: parseInt(process.env.BLOCKCHAIN_NETWORK_ID || '1', 10),
    },
    rabbitmq: {
      url: rabbitMQUrl,
      exchangeName: process.env.RABBITMQ_EXCHANGE_NAME || 'blockchain-events',
      queueNames: {
        blockProcessing: process.env.RABBITMQ_QUEUE_BLOCK_PROCESSING || 'block-processing',
        transactionProcessing: process.env.RABBITMQ_QUEUE_TX_PROCESSING || 'transaction-processing',
      },
    },
    jwt: {
      secret: process.env.JWT_SECRET || 'your-secret-key',
      expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    },
  };
};