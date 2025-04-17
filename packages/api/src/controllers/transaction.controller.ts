import { Request, Response } from 'express';
import { 
  Transaction,
  getRepository,
  TransactionResponse,
  logger
} from '@blockchain-explorer/common';

const txLogger = logger.child({ component: 'transaction-controller' });
export const getLatestTransaction = async (req: Request, res: Response): Promise<void> => {
  try {
    const transactionRepo = getRepository<Transaction>(Transaction);
  
    const transactions = await transactionRepo.find({
      order: { indexedAt: 'DESC' },
      take: 1
    });
    
    if (!transactions || transactions.length === 0) {
      res.status(404).json({ error: 'No transactions found' });
      return;
    }
    
    const transaction = transactions[0];
    const response: TransactionResponse = {
      hash: transaction.hash,
      blockNumber: transaction.block_number,
      from: transaction.from,
      to: transaction.to,
      amount: transaction.amount,
      nonce: transaction.nonce
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error getting latest transaction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// export const getLatestTransaction = async (req: Request, res: Response): Promise<void> => {
//   try {
//     const transactionRepo = getRepository<Transaction>(Transaction);
    
//     // get latest trx
//     const transactions = await transactionRepo.find({
//       order: { indexedAt: 'DESC' },
//       take: 1
//     });
    
//     if (!transactions || transactions.length === 0) {
//       res.status(404).json({ error: 'No transactions found' });
//       return;
//     }
    
//     const transaction = transactions[0];
    
//     // map response format
//     const response: TransactionResponse = {
//       hash: transaction.hash,
//       blockNumber: transaction.block_number,
//       from: transaction.from,
//       to: transaction.to,
//       amount: transaction.amount,
//       nonce: transaction.nonce
//     };
    
//     res.json(response);
//   } catch (err) {
//     const errorMessage = err instanceof Error ? err.message : String(err);
//     txLogger.error(`Error getting latest transaction: ${errorMessage}`);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// };

export const getTransactionByHash = async (req: Request, res: Response): Promise<void> => {
  try {
    const txHash = req.params.hash;
    
    if (!txHash || !txHash.startsWith('0x') || txHash.length !== 66) {
      res.status(400).json({ error: 'Invalid transaction hash' });
      return;
    }
    
    // trx from db
    const transactionRepo = getRepository<Transaction>(Transaction);
    const transaction = await transactionRepo.findOne({ where: { hash: txHash } });
    
    if (!transaction) {
      res.status(404).json({ error: `Transaction ${txHash} not found` });
      return;
    }
    
    // map response format
    const response: TransactionResponse = {
      hash: transaction.hash,
      blockNumber: transaction.block_number,
      from: transaction.from,
      to: transaction.to,
      amount: transaction.amount,
      nonce: transaction.nonce
    };
    
    res.json(response);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    txLogger.error(`Error getting transaction by hash: ${errorMessage}`);
    res.status(500).json({ error: 'Internal server error' });
  }
};