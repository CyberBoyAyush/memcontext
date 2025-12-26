import pino from "pino";
import { Logtail } from "@logtail/node";

const isDev = process.env.NODE_ENV === "dev";
const logLevel = process.env.LOG_LEVEL || "info";

const logtailToken = process.env.LOGTAIL_SOURCE_TOKEN;
const logtailEndpoint = process.env.LOGTAIL_INGEST_ENDPOINT;

// Initialize Logtail client only in production (not dev)
let logtail: Logtail | null = null;
if (!isDev && logtailToken && logtailEndpoint) {
  logtail = new Logtail(logtailToken, {
    endpoint: logtailEndpoint,
  });
}

// Create base pino logger with console output
const transport = isDev
  ? pino.transport({
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "SYS:standard",
        ignore: "pid,hostname",
      },
    })
  : pino.transport({
      target: "pino/file",
      options: { destination: 1 },
    });

const pinoLogger = pino(
  {
    level: logLevel,
    base: {
      service: "memcontext-api",
      env: process.env.NODE_ENV || "development",
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level: (label) => ({ level: label }),
    },
  },
  transport,
);

// Send to Logtail helper
function sendToLogtail(
  level: "debug" | "info" | "warn" | "error",
  msg: string,
  data?: Record<string, unknown>,
) {
  if (!logtail) return;

  const logData = {
    ...data,
    service: "memcontext-api",
    env: process.env.NODE_ENV || "development",
  };

  switch (level) {
    case "debug":
      logtail.debug(msg, logData);
      break;
    case "info":
      logtail.info(msg, logData);
      break;
    case "warn":
      logtail.warn(msg, logData);
      break;
    case "error":
      logtail.error(msg, logData);
      break;
  }
}

// Log level mapping
type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";

const logtailLevelMap: Record<LogLevel, "debug" | "info" | "warn" | "error"> = {
  trace: "debug",
  debug: "debug",
  info: "info",
  warn: "warn",
  error: "error",
  fatal: "error",
};

// Wrapper that sends to both pino and Logtail
function createLogger() {
  const logWithLogtail = (
    level: LogLevel,
    obj: Record<string, unknown> | string,
    msg?: string,
  ) => {
    if (typeof obj === "string") {
      pinoLogger[level](obj);
      sendToLogtail(logtailLevelMap[level], obj);
    } else {
      pinoLogger[level](obj, msg);
      sendToLogtail(logtailLevelMap[level], msg || "log", obj);
    }
  };

  return {
    trace: (obj: Record<string, unknown> | string, msg?: string) =>
      logWithLogtail("trace", obj, msg),
    debug: (obj: Record<string, unknown> | string, msg?: string) =>
      logWithLogtail("debug", obj, msg),
    info: (obj: Record<string, unknown> | string, msg?: string) =>
      logWithLogtail("info", obj, msg),
    warn: (obj: Record<string, unknown> | string, msg?: string) =>
      logWithLogtail("warn", obj, msg),
    error: (obj: Record<string, unknown> | string, msg?: string) =>
      logWithLogtail("error", obj, msg),
    fatal: (obj: Record<string, unknown> | string, msg?: string) =>
      logWithLogtail("fatal", obj, msg),
    child: (bindings: Record<string, unknown>) => {
      const childPino = pinoLogger.child(bindings);

      const childLog = (
        level: LogLevel,
        obj: Record<string, unknown> | string,
        msg?: string,
      ) => {
        if (typeof obj === "string") {
          childPino[level](obj);
          sendToLogtail(logtailLevelMap[level], obj, bindings);
        } else {
          childPino[level](obj, msg);
          sendToLogtail(logtailLevelMap[level], msg || "log", {
            ...bindings,
            ...obj,
          });
        }
      };

      return {
        trace: (obj: Record<string, unknown> | string, msg?: string) =>
          childLog("trace", obj, msg),
        debug: (obj: Record<string, unknown> | string, msg?: string) =>
          childLog("debug", obj, msg),
        info: (obj: Record<string, unknown> | string, msg?: string) =>
          childLog("info", obj, msg),
        warn: (obj: Record<string, unknown> | string, msg?: string) =>
          childLog("warn", obj, msg),
        error: (obj: Record<string, unknown> | string, msg?: string) =>
          childLog("error", obj, msg),
        fatal: (obj: Record<string, unknown> | string, msg?: string) =>
          childLog("fatal", obj, msg),
      };
    },
    flush: async () => {
      if (logtail) {
        await logtail.flush();
      }
    },
  };
}

export const logger = createLogger();

export type Logger = typeof logger;

export function createChildLogger(bindings: Record<string, unknown>) {
  return logger.child(bindings);
}

// Flush logs on process exit
process.on("beforeExit", async () => {
  if (logtail) {
    await logtail.flush();
  }
});
