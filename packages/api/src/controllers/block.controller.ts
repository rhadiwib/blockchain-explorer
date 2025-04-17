import { Request, Response } from 'express';
import { 
  Block, 
  Transaction,
  getRepository,
  BlockResponse,
  TransactionResponse,
  getLatestBlockNumber,
  logger
} from '@blockchain-explorer/common';

const blockLogger = logger.child({ component: 'block-controller' });

export const getLatestBlock = async (req: Request, res: Response): Promise<void> => {
  try {
    // Get the latest block number from the blockchain
    const latestBlockNumber = await getLatestBlockNumber();
    blockLogger.debug(`Latest block number from blockchain: ${latestBlockNumber}`);
    
    // Get block from database
    const blockRepo = getRepository<Block>(Block);
    const block = await blockRepo.findOne({ where: { number: latestBlockNumber } });
    
    if (!block) {
      blockLogger.warn(`Latest block (${latestBlockNumber}) not found in database`);
      res.status(404).json({ error: `Latest block (${latestBlockNumber}) not found in database` });
      return;
    }
    
    const transactionRepo = getRepository<Transaction>(Transaction);
    const transactions = await transactionRepo.find({ where: { block_number: block.number } });
    const transactionResponses: TransactionResponse[] = transactions.map((tx: Transaction) => ({
      hash: tx.hash,
      blockNumber: tx.block_number,
      from: tx.from,
      to: tx.to,
      amount: tx.amount,
      nonce: tx.nonce
    }));
    
    const response: BlockResponse = {
      number: block.number,
      hash: block.hash,
      txCount: block.txCount,
      transactions: transactionResponses
    };
    
    blockLogger.debug(`Returning latest block: ${block.number} with ${transactions.length} transactions`);
    res.json(response);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    blockLogger.error(`Error getting latest block: ${errorMessage}`);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getBlockByNumber = async (req: Request, res: Response): Promise<void> => {
  try {
    const blockNumber = parseInt(req.params.number, 10);
    
    if (isNaN(blockNumber) || blockNumber < 0) {
      res.status(400).json({ error: 'Invalid block number' });
      return;
    }
    
    blockLogger.debug(`Getting block by number: ${blockNumber}`);
    
    // Get block from database
    const blockRepo = getRepository<Block>(Block);
    const block = await blockRepo.findOne({ where: { number: blockNumber } });
    
    if (!block) {
      blockLogger.warn(`Block ${blockNumber} not found in database`);
      res.status(404).json({ error: `Block ${blockNumber} not found` });
      return;
    }
    
    const transactionRepo = getRepository<Transaction>(Transaction);
    const transactions = await transactionRepo.find({ where: { block_number: blockNumber } });
    
    const transactionResponses: TransactionResponse[] = transactions.map((tx: Transaction) => ({
      hash: tx.hash,
      blockNumber: tx.block_number,
      from: tx.from,
      to: tx.to,
      amount: tx.amount,
      nonce: tx.nonce
    }));
    
    const response: BlockResponse = {
      number: block.number,
      hash: block.hash,
      txCount: block.txCount,
      transactions: transactionResponses
    };
    
    blockLogger.debug(`Returning block ${blockNumber} with ${transactions.length} transactions`);
    res.json(response);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    blockLogger.error(`Error getting block by number: ${errorMessage}`);
    res.status(500).json({ error: 'Internal server error' });
  }
};