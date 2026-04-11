type LogValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | LogValue[]
  | { [key: string]: LogValue };

type LogFields = Record<string, LogValue>;

function serializeError(error: unknown): LogFields {
  if (error instanceof Error) {
    return {
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack
    };
  }

  return {
    errorMessage:
      typeof error === 'string' ? error : 'Unknown non-Error exception'
  };
}

function writeLog(
  level: 'info' | 'warn' | 'error',
  event: string,
  fields: LogFields = {},
  error?: unknown
) {
  const payload: LogFields = {
    level,
    event,
    timestamp: new Date().toISOString(),
    ...fields,
    ...(error === undefined ? {} : serializeError(error))
  };

  const message = JSON.stringify(payload);

  console[level](message);
}

export function logInfo(event: string, fields?: LogFields) {
  writeLog('info', event, fields);
}

export function logWarn(event: string, fields?: LogFields) {
  writeLog('warn', event, fields);
}

export function logError(event: string, fields?: LogFields, error?: unknown) {
  writeLog('error', event, fields, error);
}
