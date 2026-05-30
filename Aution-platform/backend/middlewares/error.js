const errorMiddleware = (err, req, res, next) => {
    err.message = err.message || 'Internal Server Error';
    err.statusCode = err.statusCode || 500;
    if (err.name === "CastError") {
        err.message = "Invalid resource ID";
        err.statusCode = 400;
    }
    if (err.name === "JsonWebTokenError") {
        err.message = "Invalid token";
        err.statusCode = 401;
    }
    if (err.name === "TokenExpiredError") {
        err.message = "Session expired. Please login again";
        err.statusCode = 401;
    }
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue || {})[0] || "field";
        err.message = `Duplicate value for ${field}`;
        err.statusCode = 400;
    }
    if (err.name === "ValidationError") {
        err.message = Object.values(err.errors)
            .map((error) => error.message)
            .join(", ");
        err.statusCode = 400;
    }
    res.status(err.statusCode).json({
        success: false,
        message: err.message,
    });
};

export default errorMiddleware;
