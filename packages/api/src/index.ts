import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { 
  initializeDatabase, 
  initializeRabbitMQ, 
  logger,
  closeDatabase,
  closeRabbitMQ
} from '@blockchain-explorer/common';
import routes from './routes';
import { notFound, errorHandler } from './middleware/error';

const apiLogger = logger.child({ service: 'api' });
const app = express();
const PORT = process.env.API_PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  apiLogger.debug(`${req.method} ${req.url}`, {
    ip: req.ip,
    userAgent: req.get('user-agent') || 'unknown'
  });
  next();
});

app.use(routes);
app.use(notFound);
app.use(errorHandler);

let server: ReturnType<typeof app.listen>;

const gracefulShutdown = async (signal: string) => {
  apiLogger.info(`${signal} signal received. Shutting down gracefully...`);
  
  if (server) {
    server.close(() => {
      apiLogger.info('HTTP server closed');
    });
  }
  
  try {
    await closeDatabase();
    await closeRabbitMQ();
    apiLogger.info('All connections closed, exiting process');
    process.exit(0);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    apiLogger.error('Error during graceful shutdown:', { error: errorMessage });
    process.exit(1);
  }
};

const startServer = async (): Promise<typeof app> => {
  try {
    await initializeDatabase();
    await initializeRabbitMQ();
    server = app.listen(PORT, () => {
      apiLogger.info(`API server running on port ${PORT}`);
    });

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('unhandledRejection', (reason, promise) => {
      apiLogger.error('Unhandled Rejection at:', {
        promise,
        reason: reason instanceof Error ? reason.message : String(reason)
      });
    });
    
    // uncaught exceptions
    process.on('uncaughtException', (err) => {
      const errorMessage = err instanceof Error ? err.message : String(err);
      apiLogger.error('Uncaught Exception:', { 
        error: errorMessage, 
        stack: err instanceof Error ? err.stack : undefined 
      });
      process.exit(1);
    });
    
    return app;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    apiLogger.error('Error starting API server:', { error: errorMessage });
    process.exit(1);
  }
};
startServer();

export default app;