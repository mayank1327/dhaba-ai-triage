
import logger from "../utils/logger.js";

export const errorHandler = (error, req, res, next) => {
  logger.error("unhandled_application_error", {
    requestId: req.requestId,
    errorType: error.name,
    statusCode: error.statusCode || 500,
  });

  const statusCode = error.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    message:
      statusCode === 500
        ? "Internal server error"
        : error.message,
  });
};
