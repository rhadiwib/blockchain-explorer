import { ethers } from 'ethers';
import { getConfig } from '../config';
import { logger } from '../utils/logger';

const providerLogger = logger.child({ component: 'blockchain-provider' });
let provider: ethers.JsonRpcProvider | null = null;
const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 2000;

export const getEthersProvider = async (): Promise<ethers.JsonRpcProvider> => {
  if (!provider) {
    const config = getConfig();
    
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        provider = new ethers.JsonRpcProvider(config.blockchain.providerUrl);
        const network = await provider.getNetwork();
        providerLogger.info(`Ethereum provider initialized. Connected to network: ${network.name} (chainId: ${network.chainId})`);
        break;
      } catch (err) {
        provider = null;
        const errorMessage = err instanceof Error ? err.message : String(err);
        
        if (attempt === MAX_RETRIES) {
          providerLogger.error(`Failed to initialize Ethereum provider after ${MAX_RETRIES} attempts:`, { error: errorMessage });
          throw new Error(`Failed to connect to Ethereum provider: ${errorMessage}`);
        }
        
        providerLogger.warn(`Attempt ${attempt}/${MAX_RETRIES} to connect to Ethereum provider failed. Retrying in ${RETRY_DELAY_MS}ms...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
      }
    }
    
    if (!provider) {
      throw new Error('Failed to initialize Ethereum provider');
    }
  }
  
  return provider;
};

/**
 * blockchain retry logic
 */
async function executeWithRetry<T>(operation: () => Promise<T>, operationName: string): Promise<T> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await operation();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      
      if (attempt === MAX_RETRIES) {
        providerLogger.error(`Failed ${operationName} after ${MAX_RETRIES} attempts:`, { error: errorMessage });
        throw err;
      }
      
      providerLogger.warn(`Attempt ${attempt}/${MAX_RETRIES} for ${operationName} failed. Retrying in ${RETRY_DELAY_MS}ms...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
      
      // Reinitialize provider on connection errors
      if (provider && err instanceof Error && err.toString().includes('connection')) {
        provider = null;
        await getEthersProvider();
      }
    }
  }
  
  throw new Error(`Failed ${operationName} after ${MAX_RETRIES} attempts`);
}

export const getLatestBlockNumber = async (): Promise<number> => {
  const provider = await getEthersProvider();
  return executeWithRetry(
    async () => await provider.getBlockNumber(),
    'getLatestBlockNumber'
  );
};

export const getBlockByNumber = async (blockNumber: number): Promise<ethers.Block | null> => {
  const provider = await getEthersProvider();
  return executeWithRetry(
    async () => await provider.getBlock(blockNumber, true),
    `getBlockByNumber(${blockNumber})`
  );
};

export const getTransactionByHash = async (txHash: string): Promise<ethers.TransactionResponse | null> => {
  const provider = await getEthersProvider();
  return executeWithRetry(
    async () => await provider.getTransaction(txHash),
    `getTransactionByHash(${txHash})`
  );
};

export const getTransactionReceipt = async (txHash: string): Promise<ethers.TransactionReceipt | null> => {
  const provider = await getEthersProvider();
  return executeWithRetry(
    async () => await provider.getTransactionReceipt(txHash),
    `getTransactionReceipt(${txHash})`
  );
};