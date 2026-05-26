const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const { buildDateFilter } = require('../utils/dateRange');

/**
 * GET /api/summary
 * Return income/expense totals and category breakdowns for the authenticated user.
 *
 * Query params:
 *   from  - start date (ISO 8601)
 *   to    - end date (ISO 8601)
 */
exports.getSummary = async (req, res) => {
  const { from, to } = req.query;

  // Build user-scoped match stage with optional end-of-day-extended date range.
  const matchStage = {
    userId: new mongoose.Types.ObjectId(req.user.id),
    ...buildDateFilter({ from, to }),
  };

  // Run two aggregations in parallel: totals by type, and breakdown by category
  const [typeTotals, categoryBreakdown, recentTransactions] = await Promise.all([
    // 1. Sum by type (income / expense)
    Transaction.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]),

    // 2. Sum by category within each type
    Transaction.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: { type: '$type', category: '$category' },
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
    ]),

    // 3. Most recent 5 transactions in the date range
    Transaction.find(matchStage)
      .sort({ date: -1 })
      .limit(5)
      .lean(),
  ]);

  // Parse type totals
  let totalIncome = 0;
  let totalExpense = 0;
  let incomeCount = 0;
  let expenseCount = 0;

  for (const entry of typeTotals) {
    if (entry._id === 'income') {
      totalIncome = entry.total;
      incomeCount = entry.count;
    } else if (entry._id === 'expense') {
      totalExpense = entry.total;
      expenseCount = entry.count;
    }
  }

  // Parse category breakdown into structured format
  const incomeCategories = [];
  const expenseCategories = [];

  for (const entry of categoryBreakdown) {
    const item = {
      category: entry._id.category,
      total: entry.total,
      count: entry.count,
    };
    if (entry._id.type === 'income') {
      incomeCategories.push(item);
    } else {
      expenseCategories.push(item);
    }
  }

  return res.status(200).json({
    totalIncome,
    totalExpense,
    netBalance: totalIncome - totalExpense,
    incomeCount,
    expenseCount,
    transactionCount: incomeCount + expenseCount,
    incomeCategories,
    expenseCategories,
    recentTransactions,
  });
};
