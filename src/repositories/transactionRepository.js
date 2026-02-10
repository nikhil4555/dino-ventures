const db = require('../config/db');

class TransactionRepository {
  /**
   * Create a new transaction record
   * @param {Object} client - Database client
   * @param {Object} transactionData - { idempotencyKey, type, amount, referenceId, status, metadata }
   */
  async createTransaction(client, { idempotencyKey, type, amount, referenceId, status, metadata }) {
    const query = `
      INSERT INTO transactions (idempotency_key, type, amount, reference_id, status, metadata)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;
    const values = [idempotencyKey, type, amount, referenceId, status, metadata || {}];
    const res = await client.query(query, values);
    return res.rows[0];
  }

  /**
   * Create a ledger entry
   * @param {Object} client - Database client
   * @param {Object} entryData - { transactionId, accountId, assetType, amount, direction, balanceAfter }
   */
  async createLedgerEntry(client, { transactionId, accountId, assetType, amount, direction, balanceAfter }) {
    const query = `
      INSERT INTO ledger_entries (transaction_id, account_id, asset_type, amount, direction, balance_after)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;
    const values = [transactionId, accountId, assetType, amount, direction, balanceAfter];
    const res = await client.query(query, values);
    return res.rows[0];
  }

  /**
   * Get account balance for a specific asset (with locking for update)
   * @param {Object} client - Database client
   * @param {string} accountId
   * @param {string} assetType
   */
  async getAccountBalance(client, accountId, assetType) {
    const query = `
      SELECT * FROM wallet_balances 
      WHERE account_id = $1 AND asset_type = $2
      FOR UPDATE; -- Lock row to prevent race conditions
    `;
    const res = await client.query(query, [accountId, assetType]);
    return res.rows[0];
  }

  /**
 * Update or Insert wallet balance
 * @param {Object} client - Database client
 * @param {string} accountId
 * @param {string} assetType
 * @param {number} amount - Amount to add (can be negative)
 */
  async updateWalletBalance(client, accountId, assetType, amount) {
    if (amount < 0) {
      // Debit: Row must exist. We prefer UPDATE to avoid "new row violates check constraint" on INSERT attempt.
      const query = `
        UPDATE wallet_balances 
        SET balance = balance + $3, updated_at = NOW()
        WHERE account_id = $1 AND asset_type = $2
        RETURNING *;
      `;
      const values = [accountId, assetType, amount];
      const res = await client.query(query, values);

      if (res.rowCount === 0) {
        throw new Error(`Wallet balance not found for account ${accountId} (Asset: ${assetType})`);
      }
      return res.rows[0];
    } else {
      // Credit: Upsert (Insert if new, Update if exists)
      const query = `
        INSERT INTO wallet_balances (account_id, asset_type, balance)
        VALUES ($1, $2, $3)
        ON CONFLICT (account_id, asset_type)
        DO UPDATE SET 
          balance = wallet_balances.balance + EXCLUDED.balance,
          updated_at = NOW()
        RETURNING *;
      `;
      const values = [accountId, assetType, amount];
      const res = await client.query(query, values);
      return res.rows[0];
    }
  }

  /**
   * Find transaction by Idempotency Key
   */
  async findByIdempotencyKey(client, idempotencyKey) {
    const query = 'SELECT * FROM transactions WHERE idempotency_key = $1';
    const res = await client.query(query, [idempotencyKey]);
    return res.rows[0];
  }

  /**
 * Find transaction by ID
 */
  async findById(id) {
    const query = 'SELECT * FROM transactions WHERE id = $1';
    const res = await db.query(query, [id]); // Use pool directly for reads
    return res.rows[0];
  }
}

module.exports = new TransactionRepository();
