const transactionService = require('../services/transactionService');
const { v4: uuidv4 } = require('uuid');

class TransactionController {

    async topup(req, res, next) {
        try {
            const { accountId, amount, referenceId } = req.body;
            const idempotencyKey = req.headers['idempotency-key'] || uuidv4(); // Basic idempotency

            const result = await transactionService.processTransaction({
                accountId,
                amount,
                type: 'TOPUP',
                idempotencyKey,
                referenceId
            });

            res.status(201).json(result);
        } catch (err) {
            next(err);
        }
    }

    async bonus(req, res, next) {
        try {
            const { accountId, amount, referenceId } = req.body;
            const idempotencyKey = req.headers['idempotency-key'] || uuidv4();

            const result = await transactionService.processTransaction({
                accountId,
                amount,
                type: 'BONUS',
                idempotencyKey,
                referenceId
            });

            res.status(201).json(result);
        } catch (err) {
            next(err);
        }
    }

    async spend(req, res, next) {
        try {
            const { accountId, amount, referenceId } = req.body;
            const idempotencyKey = req.headers['idempotency-key'] || uuidv4();

            const result = await transactionService.processTransaction({
                accountId,
                amount,
                type: 'SPEND',
                idempotencyKey,
                referenceId
            });

            res.status(201).json(result);
        } catch (err) {
            next(err);
        }
    }

    async getTransaction(req, res, next) {
        try {
            const { id } = req.params;
            const transaction = await transactionService.getTransactionById(id);

            // transactionService now throws 404 if not found

            res.json(transaction);
        } catch (err) {
            next(err);
        }
    }
}

module.exports = new TransactionController();
