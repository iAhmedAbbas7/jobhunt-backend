import { logEvents } from "./logger.js";

export const errorHandler = (err, req, res, _next) => {
  logEvents(
    `${err.name} : ${err.message}\t${req.method}\t${req.url}\t${req.headers.origin}`,
    "errorLog.log"
  );
  console.log(err.stack);
  const status = res.statusCode ? res.statusCode : 500;
  res.status(status);
  res.json({ message: err.message, isError: true });
};
