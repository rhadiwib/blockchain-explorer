export interface BlockMessage {
  blockNumber: number;
  action: 'scan' | 'index' | 'subscribe';
}

export interface TransactionMessage {
  transactionHash: string;
  blockNumber: number;
}

// response types
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

export interface BlockRange {
  fromBlock: number;
  toBlock: number | 'latest';
}

export interface HealthStatus {
  status: 'UP' | 'DOWN' | 'UNKNOWN';
  message?: string;
  blockNumber?: number;
  networkName?: string;
  chainId?: string;
}

export interface HealthCheckResponse {
  status: string;
  timestamp: string;
  services: {
    api: HealthStatus;
    database: HealthStatus;
    blockchain: HealthStatus;
    rabbitmq: HealthStatus;
  };
  version: string;
}