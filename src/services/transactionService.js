const db = require('../config/db');
const transactionRepository = require('../repositories/transactionRepository');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

class TransactionService {

    /*
     * Process a transaction (Atomic Operation)
     * @param {Object} params
     * @param {string} params.accountId - User Account ID
     * @param {string} params.amount - Amount
     * @param {string} params.type - TOPUP, BONUS, SPEND
     * @param {string} params.idempotencyKey
     * @param {string} params.referenceId
     */
    async processTransaction({ accountId, amount, type, idempotencyKey, referenceId }) {
        logger.info(`Processing transaction: ${type}`, { accountId, amount, idempotencyKey });
        const client = await db.getClient();

        try {
            await client.query('BEGIN');

            // 1. Idempotency Check
            const existingTx = await transactionRepository.findByIdempotencyKey(client, idempotencyKey);
            if (existingTx) {
                await client.query('ROLLBACK');
                logger.warn('Transaction already processed', { idempotencyKey });
                return createResult(existingTx, 'ALREADY_PROCESSED');
            }

            // 2. Identify Treasury Account (For Double Entry) - Simplified for this context
            // In a real system, we'd look up the specific treasury account for the asset context.
            // We'll assume a global Treasury account exists or just use a placeholder ID if not strict.
            // For this demo, let's fetch the actual Treasury account ID we seeded.
            const treasuryRes = await client.query("SELECT id FROM accounts WHERE type = 'TREASURY' LIMIT 1");
            const treasuryId = treasuryRes.rows[0]?.id;

            if (!treasuryId) throw new AppError('System Treasury account not found', 500);

            // 3. Determine Source and Destination based on Type
            let debitAccountId, creditAccountId;
            const ASSET_TYPE = 'GoldCoins'; // Default for now

            if (type === 'TOPUP' || type === 'BONUS') {
                debitAccountId = treasuryId;
                creditAccountId = accountId;
            } else if (type === 'SPEND') {
                debitAccountId = accountId;
                creditAccountId = treasuryId;
            } else {
                throw new AppError('Invalid transaction type', 400);
            }

            const amountNum = parseFloat(amount);
            if (isNaN(amountNum) || amountNum <= 0) {
                throw new AppError('Invalid amount', 400);
            }

            // 4. Create Transaction Record (PENDING)
            const transaction = await transactionRepository.createTransaction(client, {
                idempotencyKey,
                type,
                amount: amountNum,
                referenceId,
                status: 'PENDING'
            });

            // 5. Execute Moves (Balance Updates)

            // DEBIT Side (Check balance if it's a User)
            if (debitAccountId !== treasuryId) { // If User is spending
                const balanceRow = await transactionRepository.getAccountBalance(client, debitAccountId, ASSET_TYPE);
                const currentBalance = balanceRow ? parseFloat(balanceRow.balance) : 0;

                if (currentBalance < amountNum) {
                    throw new AppError('Insufficient funds', 400);
                }
            }

            // Update Balances
            const debitBalanceRes = await transactionRepository.updateWalletBalance(client, debitAccountId, ASSET_TYPE, -amountNum);
            const creditBalanceRes = await transactionRepository.updateWalletBalance(client, creditAccountId, ASSET_TYPE, amountNum);

            // 6. Create Ledger Entries
            await transactionRepository.createLedgerEntry(client, {
                transactionId: transaction.id,
                accountId: debitAccountId,
                assetType: ASSET_TYPE,
                amount: amountNum,
                direction: 'DEBIT',
                balanceAfter: debitBalanceRes.balance
            });

            await transactionRepository.createLedgerEntry(client, {
                transactionId: transaction.id,
                accountId: creditAccountId,
                assetType: ASSET_TYPE,
                amount: amountNum,
                direction: 'CREDIT',
                balanceAfter: creditBalanceRes.balance
            });

            // 7. Update Transaction Status
            await client.query('UPDATE transactions SET status = $1 WHERE id = $2', ['COMPLETED', transaction.id]);

            await client.query('COMMIT');

            logger.info('Transaction processed successfully', { transactionId: transaction.id });
            // Return updated transaction with latest status
            return { ...transaction, status: 'COMPLETED' };

        } catch (err) {
            await client.query('ROLLBACK');
            logger.error('Transaction Failed', { error: err.message, stack: err.stack });
            // Re-throw if it's already an AppError, otherwise wrap it
            if (err instanceof AppError) throw err;
            throw new AppError('Transaction processing failed', 500);
        } finally {
            client.release();
        }
    }

    async getTransactionById(id) {
        const tx = await transactionRepository.findById(id);
        if (!tx) throw new AppError('Transaction not found', 404);
        return tx;
    }
}

function createResult(data, status) {
    return { data, status };
}

module.exports = new TransactionService();
