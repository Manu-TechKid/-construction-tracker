class AppError extends Error {
    constructor(message, statusCode, details = {}) {
        super(message);
        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.isOperational = true;
        
        // Add field validation errors if provided
        if (details.fieldErrors) {
            this.fieldErrors = details.fieldErrors;
        }
        
        // Add any additional error details
        if (details.details) {
            this.details = details.details;
        }

        Error.captureStackTrace(this, this.constructor);
    }
}

module.exports = AppError;
