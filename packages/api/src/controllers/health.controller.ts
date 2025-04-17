import { Request, Response } from 'express';
import { 
  AppDataSource, 
  getEthersProvider,
  getConfig,
  logger,
  HealthCheckResponse
} from '@blockchain-explorer/common';
import * as amqp from 'amqplib';

const apiLogger = logger.child({ component: 'health-controller' });

/**
 * Health check for the API service and its dependencies
 */
export const healthCheck = async (req: Request, res: Response): Promise<void> => {
  const health: HealthCheckResponse = {
    status: 'UP',
    timestamp: new Date().toISOString(),
    services: {
      api: { status: 'UP' },
      database: { status: 'UNKNOWN' },
      blockchain: { status: 'UNKNOWN' },
      rabbitmq: { status: 'UNKNOWN' }
    },
    version: process.env.npm_package_version || '1.0.0'
  };
  
  // Check database connection
  try {
    if (AppDataSource.isInitialized) {
      await AppDataSource.query('SELECT 1');
      health.services.database = { status: 'UP' };
    } else {
      health.services.database = { 
        status: 'DOWN', 
        message: 'Database connection not initialized' 
      };
      health.status = 'DEGRADED';
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    health.services.database = { status: 'DOWN', message: errorMessage };
    health.status = 'DEGRADED';
  }
  
  // Check blockchain provider connection
  try {
    const provider = await getEthersProvider();
    const blockNumber = await provider.getBlockNumber();
    const network = await provider.getNetwork();
    health.services.blockchain = { 
      status: 'UP',
      blockNumber,
      chainId: network.chainId.toString(),
      networkName: network.name 
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    health.services.blockchain = { status: 'DOWN', message: errorMessage };
    health.status = 'DEGRADED';
  }
  
  // Check RabbitMQ connection
  try {
    const config = getConfig();
    const connection = await amqp.connect(config.rabbitmq.url);
    const channel = await connection.createChannel();
    
    // Check the exchange exists
    await channel.checkExchange(config.rabbitmq.exchangeName);
    
    // Close the connections
    await channel.close();
    await connection.close();
    
    health.services.rabbitmq = { status: 'UP' };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    health.services.rabbitmq = { status: 'DOWN', message: errorMessage };
    health.status = 'DEGRADED';
  }
  
  // If any critical service is down, set status to DOWN
  if (health.services.database.status === 'DOWN' || 
      health.services.blockchain.status === 'DOWN') {
    health.status = 'DOWN';
  }
  
  // Set appropriate status code based on health status
  const statusCode = health.status === 'UP' ? 200 : 
                      health.status === 'DEGRADED' ? 200 : 503;
  
  apiLogger.info(`Health check result: ${health.status}`, { 
    database: health.services.database.status,
    blockchain: health.services.blockchain.status,
    rabbitmq: health.services.rabbitmq.status
  });
  
  res.status(statusCode).json(health);
};