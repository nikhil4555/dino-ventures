const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');

router.post('/topup', transactionController.topup);
router.post('/bonus', transactionController.bonus);
router.post('/spend', transactionController.spend);
router.get('/:id', transactionController.getTransaction);

module.exports = router;
