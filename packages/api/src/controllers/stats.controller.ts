import { Request, Response } from 'express';
import { Between } from 'typeorm';
import { 
  Block, 
  Transaction,
  getRepository,
  StatsResponse
} from '@blockchain-explorer/common';

export const getOverallStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const blockRepo = getRepository<Block>(Block);
    const transactionRepo = getRepository<Transaction>(Transaction);
    const totalBlocks = await blockRepo.count();
    const totalTransactions = await transactionRepo.count();
    const result = await transactionRepo
      .createQueryBuilder('tx')
      .select('SUM(tx.amount)', 'totalAmount')
      .getRawOne();
    const totalAmount = result?.totalAmount || '0';
    const response: StatsResponse = {
      totalBlocks,
      totalTransactions,
      totalAmount
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error getting overall stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getStatsForRange = async (req: Request, res: Response): Promise<void> => {
  try {
    const range = req.params.range;
    
    // Parse range in format "fromBlock:toBlock"
    const [fromBlock, toBlock] = range.split(':').map(b => parseInt(b, 10));
    
    if (isNaN(fromBlock) || isNaN(toBlock) || fromBlock < 0 || toBlock < fromBlock) {
      res.status(400).json({ error: 'Invalid block range' });
      return;
    }
    
    const blockRepo = getRepository<Block>(Block);
    const transactionRepo = getRepository<Transaction>(Transaction);    
    const totalBlocks = await blockRepo.count({
      where: {
        number: Between(fromBlock, toBlock)
      }
    });
    
    const totalTransactions = await transactionRepo.count({
      where: {
        block_number: Between(fromBlock, toBlock)
      }
    });
    
    const result = await transactionRepo
      .createQueryBuilder('tx')
      .select('SUM(tx.amount)', 'totalAmount')
      .where('tx.block_number BETWEEN :fromBlock AND :toBlock', { fromBlock, toBlock })
      .getRawOne();
    
    const totalAmount = result?.totalAmount || '0';
    const response: StatsResponse = {
      totalBlocks,
      totalTransactions,
      totalAmount,
      startBlock: fromBlock,
      endBlock: toBlock
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error getting stats for range:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};