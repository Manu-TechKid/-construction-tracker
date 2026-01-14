module.exports = fn => {
  return (req, res, next) => {
    fn(req, res, next).catch(err => {
      console.error('--- ASYNC ERROR ---');
      console.error('Error:', err);
      console.error('Error Message:', err.message);
      console.error('Stack Trace:', err.stack);
      next(err);
    });
  };
};
