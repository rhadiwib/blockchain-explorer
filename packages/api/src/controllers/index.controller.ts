import { Request, Response } from 'express';
import { publishMessage, logger } from '@blockchain-explorer/common';
import { AuthRequest } from '../middleware/auth';

const indexLogger = logger.child({ component: 'index-controller' });

export const triggerIndexing = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { scan } = req.query;
    
    if (!scan || typeof scan !== 'string') {
      res.status(400).json({ error: 'Missing or invalid scan parameter' });
      return;
    }
    
    indexLogger.info(`Triggering indexing for range: ${scan}`);
    
    // parsing scan parameter
    const [fromBlock, toBlock] = scan.split(':').map(b => parseInt(b, 10));
    
    if (isNaN(fromBlock) || fromBlock < 0) {
      res.status(400).json({ error: 'Invalid fromBlock parameter' });
      return;
    }
    
    if (toBlock !== undefined && (isNaN(toBlock) || toBlock < fromBlock)) {
      res.status(400).json({ error: 'Invalid toBlock parameter' });
      return;
    }
    
    // trigger indexing
    if (toBlock === undefined) {
      indexLogger.info(`Publishing scan command from block ${fromBlock} to latest`);
      await publishMessage('block.scan', { blockNumber: fromBlock, action: 'scan' });
    } else {
      indexLogger.info(`Publishing index commands for blocks ${fromBlock} to ${toBlock}`);
      if (toBlock - fromBlock > 100) {
        // For large ranges, publish a batch message
        await publishMessage('block.scan', { 
          blockNumber: fromBlock, 
          toBlock: toBlock,
          action: 'scan' 
        });
      } else {
        for (let i = fromBlock; i <= toBlock; i++) {
          await publishMessage('block.index', { blockNumber: i, action: 'index' });
        }
      }
    }
    
    res.json({
      success: true,
      message: `Indexing triggered for blocks ${fromBlock}${toBlock ? ` to ${toBlock}` : ' to latest'}`
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    indexLogger.error(`Error triggering indexing: ${errorMessage}`);
    res.status(500).json({ error: 'Internal server error' });
  }
};