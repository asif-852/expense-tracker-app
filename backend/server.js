const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const connectDB = require('./config/database');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { globalLimiter } = require('./middleware/rateLimit');

// Load environment variables
dotenv.config();

// Validate required environment variables before doing anything else
const REQUIRED_ENV_VARS = ['MONGODB_URI', 'JWT_SECRET', 'ALLOWED_ORIGIN'];
const missingVars = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
if (missingVars.length > 0) {
  console.error(`Missing required environment variables: ${missingVars.join(', ')}`);
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;

// Trust the first proxy hop so req.ip / X-Forwarded-For work correctly when
// the app sits behind a reverse proxy (nginx, Heroku, Render, etc.). Required
// for accurate per-IP rate limiting in production.
app.set('trust proxy', 1);

// Security headers
app.use(helmet());

// Restrict CORS to the explicit frontend origin
const corsOptions = {
  origin: process.env.ALLOWED_ORIGIN,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};
app.use(cors(corsOptions));

// JSON body parser with an explicit size cap. 10kb is plenty for any payload
// this API accepts (auth credentials, transaction records) and rejects oversized
// bodies cheaply at the parser layer as a basic DoS defense.
app.use(express.json({ limit: '10kb' }));

// Apply the general limiter to every request. Stricter limits live on the
// auth router itself.
app.use(globalLimiter);

// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'Expense Tracker API is running!' });
});

// Auth routes
app.use('/api/auth', require('./routes/authRoutes'));

// Transaction routes
app.use('/api/transactions', require('./routes/transactionRoutes'));

// Summary routes
app.use('/api/summary', require('./routes/summaryRoutes'));

// 404 handler — must come after all valid routes
app.use(notFound);

// Global error handler — must be the very last middleware (4 args)
app.use(errorHandler);

// Connect to MongoDB, then start the server only after a confirmed connection
const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
};

startServer();
