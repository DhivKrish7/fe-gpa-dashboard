const errorMiddleware = (error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  const statusCode = error.statusCode || 500;
  const payload = {
    error: statusCode >= 500 ? 'Unable to complete request.' : error.publicMessage || error.message,
  };

  if (error.code) payload.code = error.code;
  if (error.details) payload.details = error.details;
  if (error.issueCount) payload.issueCount = error.issueCount;

  return res.status(statusCode).json(payload);
};

module.exports = errorMiddleware;
