import { DataSource, ObjectLiteral, Repository } from 'typeorm';
import { Block, Transaction } from './entities';
import { getConfig } from '../config';
import { logger } from '../utils/logger';

const dbLogger = logger.child({ component: 'database' });
const config = getConfig();
const MAX_CONNECTION_ATTEMPTS = 10;
const CONNECTION_RETRY_DELAY = 3000;

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: config.database.host,
  port: config.database.port,
  username: config.database.username,
  password: config.database.password,
  database: config.database.name,
  synchronize: config.database.synchronize,
  logging: config.database.logging,
  entities: [Block, Transaction],
  migrations: [],
  subscribers: [],
  ...(config.environment === 'production' && {
    ssl: {
      rejectUnauthorized: false // For self-signed certificates; adjust for your environment
    }
  }),

  extra: {
    max: 20,
    min: 5,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000
  }
});

export const initializeDatabase = async (): Promise<DataSource> => {
  for (let attempt = 1; attempt <= MAX_CONNECTION_ATTEMPTS; attempt++) {
    try {
      if (!AppDataSource.isInitialized) {
        await AppDataSource.initialize();
        dbLogger.info('Database connection initialized successfully');
      }
      return AppDataSource;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      dbLogger.error(`Database initialization attempt ${attempt}/${MAX_CONNECTION_ATTEMPTS} failed:`, { error: errorMessage });
      
      if (attempt === MAX_CONNECTION_ATTEMPTS) {
        dbLogger.error('Maximum database connection attempts reached');
        throw new Error(`Failed to initialize database after ${MAX_CONNECTION_ATTEMPTS} attempts: ${errorMessage}`);
      }
      
      dbLogger.info(`Retrying database connection in ${CONNECTION_RETRY_DELAY}ms...`);
      await new Promise(resolve => setTimeout(resolve, CONNECTION_RETRY_DELAY));
    }
  }
  
  throw new Error('Failed to initialize database connection');
};

export const getRepository = <T extends ObjectLiteral>(entity: any): Repository<T> => {
  if (!AppDataSource.isInitialized) {
    throw new Error('Database connection is not initialized. Call initializeDatabase() first.');
  }
  return AppDataSource.getRepository<T>(entity);
};

export const closeDatabase = async (): Promise<void> => {
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
    dbLogger.info('Database connection closed');
  }
};