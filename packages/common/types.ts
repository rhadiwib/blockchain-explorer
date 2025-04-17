// message types for RabbitMQ
export interface BlockMessage {
    blockNumber: number;
    action: 'scan' | 'index' | 'subscribe';
  }
  
  export interface TransactionMessage {
    transactionHash: string;
    blockNumber: number;
  }
  
  // Service response types
  export interface BlockResponse {
    number: number;
    hash: string;
    txCount: number;
    transactions: TransactionResponse[];
  }
  
  export interface TransactionResponse {
    hash: string;
    blockNumber: number;
    from: string;
    to: string;
    amount: string;
    nonce: number;
  }
  
  export interface StatsResponse {
    totalBlocks: number;
    totalTransactions: number;
    totalAmount: string;
    startBlock?: number;
    endBlock?: number;
  }
  
  // Range types
  export interface BlockRange {
    fromBlock: number;
    toBlock: number | 'latest';
  }