export const errorHandler = (err, req, res, next) => {
    console.error("Request failed:", {
      method: req.method,
      path: req.path,
      error: err.message
    });
  
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.statusCode
        ? err.message
        : "Internal server error"
    });
  };