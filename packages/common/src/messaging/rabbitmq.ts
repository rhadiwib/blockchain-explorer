import { connect, Connection, Channel, Options, Replies, ConsumeMessage } from 'amqplib';
import { getConfig } from '../config';
import { logger } from '../utils/logger';

const mqLogger = logger.child({ component: 'rabbitmq' });
let connection: Connection | null = null;
let channel: Channel | null = null;
let reconnecting = false;
let reconnectTimer: NodeJS.Timeout | null = null;

const MAX_RECONNECT_ATTEMPTS = 20;
const RECONNECT_DELAY_MS = 5000;
let reconnectAttempts = 0;

/**
 * rabbitMQ reconnection
 */
export const initializeRabbitMQ = async (): Promise<Channel> => {
  if (channel && connection) {
    try {
      const testChannel = await connection.createChannel();
      await testChannel.close();
      return channel;
    } catch (err) {
      mqLogger.warn('Existing connection is not usable, reconnecting...');
    }
  }

  if (reconnecting) {
    return new Promise((resolve, reject) => {
      const checkChannel = setInterval(() => {
        if (channel && !reconnecting) {
          clearInterval(checkChannel);
          resolve(channel);
        } else if (reconnectAttempts > MAX_RECONNECT_ATTEMPTS) {
          clearInterval(checkChannel);
          reject(new Error('Max reconnection attempts exceeded'));
        }
      }, 500);
    });
  }

  reconnecting = true;
  reconnectAttempts++;

  try {
    const config = getConfig();
    await closeRabbitMQ();

    connection = await connect(config.rabbitmq.url);
    mqLogger.info('Connected to RabbitMQ');
    reconnectAttempts = 0;

    connection.on('close', () => {
      mqLogger.warn('RabbitMQ connection closed');
      connection = null;
      channel = null;
      scheduleReconnect();
    });

    connection.on('error', (err) => {
      mqLogger.error('RabbitMQ connection error:', {
        error: err instanceof Error ? err.message : String(err)
      });
    });

    channel = await connection.createChannel();
    const { exchangeName, queueNames } = config.rabbitmq;

    await channel.assertExchange(exchangeName, 'topic', { durable: true });
    await setupQueue(channel, queueNames.blockProcessing, exchangeName, 'block.*');
    await setupQueue(channel, queueNames.transactionProcessing, exchangeName, 'transaction.*');
    const dlxExchange = `${exchangeName}.dlx`;
    await channel.assertExchange(dlxExchange, 'topic', { durable: true });
    await setupDLQ(channel, dlxExchange, `${queueNames.blockProcessing}.failed`, 'block.failed');
    await setupDLQ(channel, dlxExchange, `${queueNames.transactionProcessing}.failed`, 'transaction.failed');

    mqLogger.info('RabbitMQ channel created and configured');
    reconnecting = false;
    return channel;

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    mqLogger.error(`Connection failed (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}): ${errorMessage}`);
    
    reconnecting = false;
    scheduleReconnect();
    throw err;
  }
};

const scheduleReconnect = () => {
  if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
    mqLogger.info(`Scheduling reconnect in ${RECONNECT_DELAY_MS}ms...`);
    reconnectTimer = setTimeout(() => {
      initializeRabbitMQ().catch(() => {});
    }, RECONNECT_DELAY_MS);
  } else {
    mqLogger.error('Maximum reconnection attempts reached');
    reconnectAttempts = 0;
  }
};

const setupQueue = async (
  ch: Channel,
  queueName: string,
  exchangeName: string,
  bindingPattern: string
) => {
  await ch.assertQueue(queueName, {
    durable: true,
    arguments: {
      'x-dead-letter-exchange': `${exchangeName}.dlx`,
      'x-dead-letter-routing-key': bindingPattern.replace('*', 'failed')
    }
  });
  await ch.bindQueue(queueName, exchangeName, bindingPattern);
};

const setupDLQ = async (
  ch: Channel,
  dlxExchange: string,
  queueName: string,
  routingKey: string
) => {
  await ch.assertQueue(queueName, { durable: true });
  await ch.bindQueue(queueName, dlxExchange, routingKey);
};

export const closeRabbitMQ = async (): Promise<void> => {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  try {
    if (channel) {
      await channel.close();
      mqLogger.info('RabbitMQ channel closed');
    }
    if (connection) {
      await connection.close();
      mqLogger.info('RabbitMQ connection closed');
    }
  } catch (err) {
    mqLogger.warn('Error closing RabbitMQ connection:', {
      error: err instanceof Error ? err.message : String(err)
    });
  } finally {
    channel = null;
    connection = null;
  }
};

export const publishMessage = async (
  routingKey: string,
  message: any,
  options?: Options.Publish
): Promise<boolean> => {
  const MAX_RETRIES = 3;
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const config = getConfig();
      const ch = await initializeRabbitMQ();
      
      return ch.publish(
        config.rabbitmq.exchangeName,
        routingKey,
        Buffer.from(JSON.stringify(message)),
        { persistent: true, ...options }
      );
    } catch (err) {
      mqLogger.error(`Publish failed (attempt ${attempt}/${MAX_RETRIES}):`, {
        error: err instanceof Error ? err.message : String(err)
      });
      if (attempt === MAX_RETRIES) throw err;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  return false;
};

export const consumeMessages = async (
  queueName: string,
  handler: (msg: ConsumeMessage) => Promise<void>,
  options?: Options.Consume
): Promise<Replies.Consume> => {
  const ch = await initializeRabbitMQ();
  await ch.prefetch(1);

  return ch.consume(queueName, async (msg) => {
    if (!msg) return;

    try {
      await handler(msg);
      ch.ack(msg);
    } catch (err) {
      mqLogger.error('Message processing failed:', {
        error: err instanceof Error ? err.message : String(err),
        content: msg.content.toString()
      });
      ch.nack(msg, false, false);
    }
  }, options);
};