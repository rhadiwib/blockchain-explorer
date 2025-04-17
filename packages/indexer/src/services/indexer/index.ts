import { ethers } from 'ethers';
import {
  getEthersProvider,
  getLatestBlockNumber,
  getBlockByNumber,
  initializeDatabase,
  Block,
  Transaction,
  getRepository,
  publishMessage,
  BlockRange,
  logger
} from '@blockchain-explorer/common';

const indexerLogger = logger.child({ service: 'indexer', component: 'indexer-service' });
const MAX_PARALLEL_BLOCKS = 10;
const BLOCK_BATCH_SIZE = 20;

export const indexBlock = async (blockNumber: number): Promise<Block | null> => {
  const MAX_RETRIES = 3;
  const RETRY_DELAY_MS = 2000;
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      indexerLogger.info(`Indexing block ${blockNumber}...`);
      
      const blockData = await getBlockByNumber(blockNumber);
      if (!blockData) {
        indexerLogger.error(`Block ${blockNumber} not found`);
        return null;
      }
      
      await initializeDatabase();
      
      const blockRepo = getRepository<Block>(Block);
      const transactionRepo = getRepository<Transaction>(Transaction);
      
      const existingBlock = await blockRepo.findOne({ where: { number: blockNumber } });
      if (existingBlock) {
        indexerLogger.info(`Block ${blockNumber} already indexed`);
        return existingBlock;
      }
      
      const block = new Block();
      block.number = blockNumber;
      block.hash = blockData.hash || '';  // handle null
      block.txCount = blockData.transactions.length;
      
      await blockRepo.save(block);
      
      for (const tx of blockData.transactions) {
        // skip if not a valid might be just a hash
        if (typeof tx === 'string') {
          indexerLogger.debug(`Transaction ${tx} is a string, publishing message to process it`);
          await publishMessage('transaction.index', { 
            transactionHash: tx, 
            blockNumber 
          });
          continue;
        }
        
        try {
          const transaction = new Transaction();          
          const txData = tx as unknown as ethers.TransactionResponse;
          transaction.hash = txData.hash;
          transaction.block_number = blockNumber;
          transaction.from = txData.from;
          transaction.to = txData.to || '0x0000000000000000000000000000000000000000'; // Handle contract creation
          transaction.amount = txData.value.toString();
          transaction.nonce = txData.nonce;
          
          // save to db
          await transactionRepo.save(transaction);
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          indexerLogger.error(`Error processing transaction in block ${blockNumber}:`, { 
            error: errorMessage 
          });
          
          if (typeof tx !== 'string') {
            const txData = tx as unknown as ethers.TransactionResponse;
            // Publish message to process this transaction separately
            await publishMessage('transaction.index', { 
              transactionHash: txData.hash, 
              blockNumber 
            });
          }
        }
      }
      
      indexerLogger.info(`Successfully indexed block ${blockNumber} with ${blockData.transactions.length} transactions`);
      return block;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      indexerLogger.error(`Error indexing block ${blockNumber} (attempt ${attempt}/${MAX_RETRIES}):`, { 
        error: errorMessage 
      });
      
      if (attempt === MAX_RETRIES) {
        throw err;
      }
    
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }
  
  return null;
};

async function processBatch(fromBlock: number, toBlock: number): Promise<void> {
  // MAX_PARALLEL_BLOCKS
  const promises: Promise<any>[] = [];
  
  for (let i = fromBlock; i <= toBlock; i++) {
    // Publish message to index block
    promises.push(
      publishMessage('block.index', { blockNumber: i, action: 'index' })
    );
    if (promises.length === MAX_PARALLEL_BLOCKS || i === toBlock) {
      await Promise.all(promises);
      promises.length = 0;
    }
  }
}

export const scanBlockRange = async (range: BlockRange): Promise<number> => {
  try {
    const { fromBlock, toBlock } = range;
    
    // block number if latest
    const latestBlockNumber = await getLatestBlockNumber();
    const endBlock = toBlock === 'latest' ? latestBlockNumber : toBlock;
    
    indexerLogger.info(`Scanning blocks from ${fromBlock} to ${endBlock}...`);
    
    // validate range
    if (fromBlock > endBlock) {
      throw new Error(`Invalid block range: fromBlock (${fromBlock}) is greater than toBlock (${endBlock})`);
    }

    const totalBlocks = endBlock - fromBlock + 1;
    
    for (let batchStart = fromBlock; batchStart <= endBlock; batchStart += BLOCK_BATCH_SIZE) {
      const batchEnd = Math.min(batchStart + BLOCK_BATCH_SIZE - 1, endBlock);
      
      indexerLogger.info(`Processing batch from ${batchStart} to ${batchEnd} (${batchEnd - batchStart + 1} blocks)`);
      await processBatch(batchStart, batchEnd);
      
      // log
      const processedBlocks = Math.min(batchEnd - fromBlock + 1, totalBlocks);
      const progressPercent = ((processedBlocks / totalBlocks) * 100).toFixed(2);
      indexerLogger.info(`Indexing progress: ${processedBlocks}/${totalBlocks} blocks (${progressPercent}%)`);
    }
    
    indexerLogger.info(`Successfully published ${totalBlocks} block indexing messages`);
    return totalBlocks;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    indexerLogger.error('Error scanning block range:', { error: errorMessage });
    throw err;
  }
};

export const subscribeToNewBlocks = async (): Promise<void> => {
  try {
    indexerLogger.info('Subscribing to new blocks...');
    
    const provider = await getEthersProvider();
    let isProcessing = false;
    
    provider.on('block', async (blockNumber: number) => {
      if (isProcessing) {
        indexerLogger.debug(`Already processing a block, queueing block ${blockNumber}`);
        return;
      }
      
      try {
        isProcessing = true;
        indexerLogger.info(`New block detected: ${blockNumber}`);

        await publishMessage('block.index', { blockNumber, action: 'subscribe' });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        indexerLogger.error(`Error processing new block ${blockNumber}:`, { error: errorMessage });
      } finally {
        isProcessing = false;
      }
    });
    
    // handle provider errors
    provider.on('error', async (err: Error) => {
      indexerLogger.error('Blockchain provider error, attempting to reconnect:', { 
        error: err.message 
      });
      
      // reconnect
      try {
        await getEthersProvider();
        
        // resubscribe to blocks
        await subscribeToNewBlocks();
      } catch (reconnectErr) {
        const errorMessage = reconnectErr instanceof Error ? reconnectErr.message : String(reconnectErr);
        indexerLogger.error('Failed to reconnect to blockchain provider:', { 
          error: errorMessage 
        });
      }
    });
    
    indexerLogger.info('Successfully subscribed to new blocks');
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    indexerLogger.error('Error subscribing to new blocks:', { error: errorMessage });
    throw err;
  }
};