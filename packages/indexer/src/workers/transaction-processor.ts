import { ConsumeMessage } from 'amqplib';
import { 
  consumeMessages, 
  TransactionMessage, 
  getConfig,
  getTransactionByHash,
  Transaction,
  getRepository,
  initializeDatabase,
  logger
} from '@blockchain-explorer/common';

const txProcessorLogger = logger.child({ service: 'indexer', component: 'transaction-processor' });

export const processTransactionMessage = async (message: ConsumeMessage | null): Promise<void> => {
  if (!message) {
    txProcessorLogger.warn('Received null message');
    return;
  }
  
  try {
    const content = JSON.parse(message.content.toString()) as TransactionMessage;
    const { transactionHash, blockNumber } = content;
    
    txProcessorLogger.info(`Processing transaction: ${transactionHash} from block ${blockNumber}`);
    await initializeDatabase();

    const transactionRepo = getRepository<Transaction>(Transaction);

    const existingTransaction = await transactionRepo.findOne({ where: { hash: transactionHash } });
    if (existingTransaction) {
      txProcessorLogger.info(`Transaction ${transactionHash} already indexed`);
      return;
    }
    
    const txData = await getTransactionByHash(transactionHash);
    if (!txData) {
      txProcessorLogger.error(`Transaction ${transactionHash} not found`);
      return;
    }
    
    const transaction = new Transaction();
    transaction.hash = txData.hash;
    transaction.block_number = blockNumber;
    transaction.from = txData.from;
    transaction.to = txData.to || '0x0000000000000000000000000000000000000000'; // Handle contract creation
    transaction.amount = txData.value.toString();
    transaction.nonce = txData.nonce;
    
    await transactionRepo.save(transaction);
    
    txProcessorLogger.info(`Successfully indexed transaction ${transactionHash}`);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    txProcessorLogger.error('Error processing transaction message:', { error: errorMessage });
    throw err;
  }
};

/**
 * trx worker
 */
export const startTransactionProcessor = async (): Promise<void> => {
  try {
    const config = getConfig();
    txProcessorLogger.info('Starting transaction processor worker...');
    
    // Sprocessing queue
    await consumeMessages(
      config.rabbitmq.queueNames.transactionProcessing,
      processTransactionMessage
    );
    
    txProcessorLogger.info('Transaction processor worker started successfully');
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    txProcessorLogger.error('Error starting transaction processor worker:', { error: errorMessage });
    throw err;
  }
};