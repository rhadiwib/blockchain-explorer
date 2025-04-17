import { ConsumeMessage } from 'amqplib';
import { 
  consumeMessages, 
  BlockMessage, 
  getConfig,
  getLatestBlockNumber,
  logger
} from '@blockchain-explorer/common';
import { indexBlock, scanBlockRange, subscribeToNewBlocks } from '../services/indexer';

const blockProcessorLogger = logger.child({ service: 'indexer', component: 'block-processor' });

export const processBlockMessage = async (message: ConsumeMessage | null): Promise<void> => {
  if (!message) {
    blockProcessorLogger.warn('Received null message');
    return;
  }
  
  try {
    const content = JSON.parse(message.content.toString()) as BlockMessage;
    const { blockNumber, action } = content;
    
    blockProcessorLogger.info(`Processing block message: ${action} for block ${blockNumber}`);
    
    switch (action) {
      case 'index':
        await indexBlock(blockNumber);
        break;
        
      case 'scan':
        const latestBlockNumber = await getLatestBlockNumber();
        await scanBlockRange({ 
          fromBlock: blockNumber, 
          toBlock: latestBlockNumber 
        });
        await subscribeToNewBlocks();
        break;
        
      case 'subscribe':
        await indexBlock(blockNumber);
        break;
        
      default:
        blockProcessorLogger.warn(`Unknown action: ${action}`);
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    blockProcessorLogger.error('Error processing block message:', { error: errorMessage });
    throw err;
  }
};

export const startBlockProcessor = async (): Promise<void> => {
  try {
    const config = getConfig();
    blockProcessorLogger.info('Starting block processor worker...');
    
    await consumeMessages(
      config.rabbitmq.queueNames.blockProcessing,
      processBlockMessage
    );
    
    blockProcessorLogger.info('Block processor worker started successfully');
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    blockProcessorLogger.error('Error starting block processor worker:', { error: errorMessage });
    throw err;
  }
};