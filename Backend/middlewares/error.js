// Backend/middlewares/error.js

// ✅ You should NOT import from app.js here — that caused the crash
// Instead, we’ll read NODE_ENV directly from process.env
const envMode = process.env.NODE_ENV || "DEVELOPMENT";

/**
 * ✅ Centralized error handler middleware
 * Handles:
 *  - Mongoose duplicate key errors
 *  - Cast errors (invalid ObjectId)
 *  - General application errors
 */
export const errorMiddleware = (err, req, res, next) => {
  err.message ||= "Internal Server Error";
  err.statusCode ||= 500;

  // Handle MongoDB duplicate key error
  if (err.code === 11000) {
    const error = Object.keys(err.keyPattern || {}).join(", ");
    err.message = `Duplicate field - ${error}`;
    err.statusCode = 400;
  }

  // Handle invalid MongoDB ObjectId (CastError)
  if (err.name === "CastError") {
    const errorPath = err.path;
    err.message = `Invalid format of ${errorPath}`;
    err.statusCode = 400;
  }

  // Build a safe response object
  const response = {
    success: false,
    message: err.message,
  };

  // Show detailed error only in development mode
  if (envMode === "DEVELOPMENT") {
    response.error = err;
  }

  return res.status(err.statusCode).json(response);
};

/**
 * ✅ Utility wrapper to catch async errors in controllers
 */
export const TryCatch = (passedFunc) => async (req, res, next) => {
  try {
    await passedFunc(req, res, next);
  } catch (error) {
    next(error);
  }
};
