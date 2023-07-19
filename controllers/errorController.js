const AppError = require('../utels/appError');

const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path} : ${err.value}`;
  return new AppError(message, 400);
};
const handleDuplicateFieldsDB = (err) => {
  const value = err.keyValue.name;
  const message = `Duplicate Field Value: ${value}, please use another value`;
  return new AppError(message, 400);
};
const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `Invalid input Data. ${errors.join('. ')}`;
  return new AppError(message, 400);
};
const handleJWTError = () => {
  const message = 'Invalid token. please login again';
  return new AppError(message, 401);
};
const handleJWTExpiredError = () => {
  const message = 'Your token has expired. please login again';
  return new AppError(message, 401);
};

const sendErrorDev = (err,req, res) => {
  // API
  if(req.originalUrl.startsWith('/api')){
    return res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack,
    });
  }
  // Rendered Website
    console.error('ERROR', err);
    return res.status(err.statusCode).render('error',{
      title: 'something went wrong',
      msg: err.message
    })
  
  
};
const sendErrorProd = (err,req, res) => {
  // A) for API calls
  if(req.originalUrl.startsWith('/api')){
    // Operational ,trusted error : send message to client
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
      });
    }
    //Programming or other unknown error: don't leak error detail
      // 1) LOG THE ERRORR
      console.error('ERROR', err);

      //2) SEND ERROR MESSAGE
      return res.status(500).json({
        status: 'error',
        message: 'Something went very wrong',
      });
  }


  // B)for rendered website
    // Operational ,trusted error : send message to client
    if (err.isOperational) {
      return res.status(err.statusCode).render('error',{
        title: 'something went wrong',
        msg: err.message
      })
    }
    //Programming or other unknown error: don't leak error detail
      // 1) LOG THE ERRORR
      console.error('ERROR', err);

      //2) SEND ERROR MESSAGE
      return res.status(500).render('error',{
        title: 'something went wrong',
        msg: 'please try again later'
      })
    
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err,req, res);
  } else if (process.env.NODE_ENV === 'production') {
    let error = { ...err };
    error.message = err.message;

    if (err.name === 'CastError') error = handleCastErrorDB(error);
    if (err.code === 11000) error = handleDuplicateFieldsDB(error);
    if (err.name === 'ValidationError') error = handleValidationErrorDB(error);
    if (err.name === 'JsonWebTokenError') error = handleJWTError();
    if (err.name === 'TokenExpiredError') error = handleJWTExpiredError();

    sendErrorProd(error,req, res);
  }

  next();
};
