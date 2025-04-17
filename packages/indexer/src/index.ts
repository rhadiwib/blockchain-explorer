import { initializeDatabase, getConfig, initializeRabbitMQ, publishMessage } from '@blockchain-explorer/common';
import { startBlockProcessor } from './workers/block-processor';
import { startTransactionProcessor } from './workers/transaction-processor';
import { scanBlockRange, subscribeToNewBlocks } from './services/indexer';

const startIndexer = async (): Promise<void> => {
  try {
    console.log('Starting indexer service...');
    await initializeDatabase();
    await initializeRabbitMQ();
    await startBlockProcessor();
    await startTransactionProcessor();
    const args = process.argv.slice(2);
    const fromBlock = args[0] ? parseInt(args[0], 10) : 0;
    const toBlock = args[1] ? parseInt(args[1], 10) : 'latest';
    
    if (args.length > 0) {
      if (args.length === 1) {
        await publishMessage('block.scan', { blockNumber: fromBlock, action: 'scan' });
      } else {
        await scanBlockRange({ fromBlock, toBlock });
      }
    } else {
      // scan all blocks and subscribe to new blocks
      await publishMessage('block.scan', { blockNumber: 0, action: 'scan' });
    }
    
    console.log('Indexer service started successfully');
  } catch (error) {
    console.error('Error starting indexer service:', error);
    process.exit(1);
  }
};
startIndexer();