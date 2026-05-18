const express = require('express');
const router = express.Router();
const summaryController = require('../controllers/summaryController');
const auth = require('../middleware/auth');

// All summary routes are protected
router.use(auth);

// @route   GET api/summary
// @desc    Get income/expense summary with optional date range
// @access  Private
router.get('/', summaryController.getSummary);

module.exports = router;
