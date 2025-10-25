const errorMiddleware = (store) => (next) => (action) => {
  if (action.error) {
    console.error('Redux Error:', action.error);
    // Handle global error reporting here
  }
  return next(action);
};

export default errorMiddleware;