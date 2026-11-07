const formatLog = (level, event, metadata = {}) => {
    const log = {
      timestamp: new Date().toISOString(),
      level,
      event,
      ...metadata,
    };
  
    const output = JSON.stringify(log);
  
    if (level === "error") console.error(output);
    else if (level === "warn") console.warn(output);
    else console.log(output);
  };
  
  const logger = {
    info: (event, metadata) => formatLog("info", event, metadata),
    warn: (event, metadata) => formatLog("warn", event, metadata),
    error: (event, metadata) => formatLog("error", event, metadata),
    debug: (event, metadata) => {
      if (process.env.NODE_ENV !== "production") {
        formatLog("debug", event, metadata);
      }
    },
  };
  
  export default logger;