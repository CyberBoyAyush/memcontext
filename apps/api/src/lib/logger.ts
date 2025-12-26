import pino from "pino";

const isDev = process.env.NODE_ENV === "dev";
const logLevel = process.env.LOG_LEVEL || "info";

function createTransport() {
  if (isDev) {
    return pino.transport({
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "SYS:standard",
        ignore: "pid,hostname",
      },
    });
  }

  const logtailToken = process.env.LOGTAIL_SOURCE_TOKEN;
  const logtailEndpoint = process.env.LOGTAIL_INGEST_ENDPOINT;

  if (!logtailToken || !logtailEndpoint) {
    console.warn(
      "LOGTAIL_SOURCE_TOKEN or LOGTAIL_INGEST_HOST not set, logging to stdout only",
    );
    return pino.transport({
      target: "pino/file",
      options: { destination: 1 },
    });
  }

  return pino.transport({
    targets: [
      {
        target: "@logtail/pino",
        options: {
          sourceToken: logtailToken,
          options: {
            endpoint: logtailEndpoint,
          },
        },
      },
      {
        target: "pino/file",
        options: { destination: 1 },
      },
    ],
  });
}

export const logger = pino(
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
  createTransport(),
);

export type Logger = typeof logger;

export function createChildLogger(bindings: Record<string, unknown>) {
  return logger.child(bindings);
}
