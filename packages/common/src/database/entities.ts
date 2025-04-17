import { Entity, Column, PrimaryColumn, Index, CreateDateColumn } from 'typeorm';

@Entity('blocks')
export class Block {
  @PrimaryColumn({ type: 'int' })
  number!: number;

  @Column({ type: 'varchar', length: 66 })
  hash!: string;

  @Column({ name: 'tx_count', type: 'int' })
  txCount!: number;

  @CreateDateColumn({ name: 'indexed_at' })
  indexedAt!: Date;
}

@Entity('transactions')
export class Transaction {
  @PrimaryColumn({ type: 'varchar', length: 66 })
  hash!: string;

  @Column({ type: 'int' })
  @Index()
  block_number!: number;

  @Column({ type: 'varchar', length: 42 })
  from!: string;

  @Column({ type: 'varchar', length: 42 })
  to!: string;

  @Column({ type: 'numeric', precision: 78, scale: 0 })
  amount!: string;

  @Column({ type: 'int' })
  nonce!: number;

  @CreateDateColumn({ name: 'indexed_at' })
  indexedAt!: Date;
}