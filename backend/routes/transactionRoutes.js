const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const auth = require('../middleware/auth');
const { body, param } = require('express-validator');

// All transaction routes are protected
router.use(auth);

// @route   GET api/transactions
// @desc    List user's transactions (paginated, filterable)
// @access  Private
router.get('/', transactionController.listTransactions);

// @route   POST api/transactions
// @desc    Create a new transaction
// @access  Private
router.post(
  '/',
  [
    body('amount', 'Amount is required')
      .isInt({ min: 1 })
      .withMessage('Amount must be a positive whole integer (BDT)'),
    body('type', 'Type is required')
      .isIn(['income', 'expense'])
      .withMessage("Type must be 'income' or 'expense'"),
    body('category', 'Category is required')
      .trim()
      .notEmpty()
      .isLength({ max: 50 })
      .withMessage('Category must be at most 50 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage('Description must be at most 200 characters'),
    body('date')
      .optional()
      .isISO8601()
      .withMessage('Date must be a valid ISO 8601 date'),
  ],
  transactionController.createTransaction
);

// @route   PUT api/transactions/:id
// @desc    Update a transaction owned by the user
// @access  Private
router.put(
  '/:id',
  [
    param('id').isMongoId().withMessage('Invalid transaction ID'),
    body('amount')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Amount must be a positive whole integer (BDT)'),
    body('type')
      .optional()
      .isIn(['income', 'expense'])
      .withMessage("Type must be 'income' or 'expense'"),
    body('category')
      .optional()
      .trim()
      .notEmpty()
      .isLength({ max: 50 })
      .withMessage('Category must be at most 50 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage('Description must be at most 200 characters'),
    body('date')
      .optional()
      .isISO8601()
      .withMessage('Date must be a valid ISO 8601 date'),
  ],
  transactionController.updateTransaction
);

// @route   DELETE api/transactions/:id
// @desc    Delete a transaction owned by the user
// @access  Private
router.delete(
  '/:id',
  [
    param('id').isMongoId().withMessage('Invalid transaction ID'),
  ],
  transactionController.deleteTransaction
);

module.exports = router;
