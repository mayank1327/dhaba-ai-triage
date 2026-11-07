import logger from "../utils/logger.js";

const requestLogger = (req, res, next) => {
  const startTime = Date.now();

  const requestId = crypto.randomUUID();

  req.requestId = requestId;

  logger.info("request_received", {
    requestId,
    method: req.method,
    path: req.path,
  });

  res.on("finish", () => {
    logger.info("request_completed", {
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs: Date.now() - startTime,
    });
  });

  next();
};

export default requestLogger;