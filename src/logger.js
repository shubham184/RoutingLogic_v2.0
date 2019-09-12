/* eslint linebreak-style: ["error", "windows"] */
import { createLogger, format as _format, transports as _transports } from "winston";

import config from "../config";

const logger = createLogger({
  level: "info",
  format: _format.json(),
  defaultMeta: { service: "user-service" },
  transports: [
    //
    // - Write to all logs with level `info` and below to `combined.log`
    // - Write all logs error (and below) to `error.log`.
    //
    new _transports.File({ filename: config.logfileLocation, level: "info" }),
  ],
});

//
// If we're not in production then log to the `console` with the format:
// `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
//
logger.add(new _transports.Console({
  format: _format.simple(),
}));

export default logger;
