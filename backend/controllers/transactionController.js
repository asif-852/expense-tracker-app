const { validationResult } = require('express-validator');
const Transaction = require('../models/Transaction');
const { AppError } = require('../middleware/errorHandler');

/**
 * GET /api/transactions
 * List the authenticated user's transactions with pagination and filters.
 *
 * Query params:
 *   page     - page number (default 1)
 *   limit    - results per page (default 20, max 100)
 *   sort     - 'date' | 'amount' | 'category' (default 'date')
 *   order    - 'asc' | 'desc' (default 'desc' → most recent first)
 *   type     - 'income' | 'expense'
 *   category - exact category match
 *   from     - start date (ISO 8601)
 *   to       - end date (ISO 8601)
 *   search   - partial match on description or category
 */
exports.listTransactions = async (req, res) => {
  const {
    page = 1,
    limit = 20,
    sort = 'date',
    order = 'desc',
    type,
    category,
    from,
    to,
    search,
  } = req.query;

  // Build user-scoped filter
  const filter = { userId: req.user.id };

  if (type) {
    if (!['income', 'expense'].includes(type)) {
      throw new AppError("Query param 'type' must be 'income' or 'expense'", 400);
    }
    filter.type = type;
  }

  if (category) {
    filter.category = category;
  }

  // Date range filtering
  if (from || to) {
    filter.date = {};
    if (from) {
      const fromDate = new Date(from);
      if (isNaN(fromDate.getTime())) {
        throw new AppError("Invalid 'from' date format", 400);
      }
      filter.date.$gte = fromDate;
    }
    if (to) {
      const toDate = new Date(to);
      if (isNaN(toDate.getTime())) {
        throw new AppError("Invalid 'to' date format", 400);
      }
      filter.date.$lte = toDate;
    }
  }

  // Text search on description and category
  if (search) {
    const searchRegex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [
      { description: searchRegex },
      { category: searchRegex },
    ];
  }

  // Pagination
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  // Sorting — allowlist of sortable fields
  const sortableFields = { date: 'date', amount: 'amount', category: 'category' };
  const sortField = sortableFields[sort] || 'date';
  const sortOrder = order === 'asc' ? 1 : -1;

  const [transactions, total] = await Promise.all([
    Transaction.find(filter)
      .sort({ [sortField]: sortOrder })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Transaction.countDocuments(filter),
  ]);

  return res.status(200).json({
    transactions,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
    },
  });
};

/**
 * POST /api/transactions
 * Create a new transaction for the authenticated user.
 */
exports.createTransaction = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { amount, type, category, description, date } = req.body;

  const transaction = await Transaction.create({
    userId: req.user.id,
    amount,
    type,
    category,
    description: description || '',
    date: date || Date.now(),
  });

  return res.status(201).json(transaction);
};

/**
 * PUT /api/transactions/:id
 * Update a transaction owned by the authenticated user.
 */
exports.updateTransaction = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const transaction = await Transaction.findOne({
    _id: req.params.id,
    userId: req.user.id,
  });

  if (!transaction) {
    throw new AppError('Transaction not found', 404);
  }

  // Only update fields that are provided in the request body
  const allowedUpdates = ['amount', 'type', 'category', 'description', 'date'];
  for (const field of allowedUpdates) {
    if (req.body[field] !== undefined) {
      transaction[field] = req.body[field];
    }
  }

  await transaction.save();

  return res.status(200).json(transaction);
};

/**
 * DELETE /api/transactions/:id
 * Delete a transaction owned by the authenticated user.
 */
exports.deleteTransaction = async (req, res) => {
  const transaction = await Transaction.findOneAndDelete({
    _id: req.params.id,
    userId: req.user.id,
  });

  if (!transaction) {
    throw new AppError('Transaction not found', 404);
  }

  return res.status(200).json({ message: 'Transaction deleted successfully' });
};
