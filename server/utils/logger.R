library(jsonlite)

defaultLogFormatter <- function(object) {
  jsonlite::toJSON(object, auto_unbox = T, force = T)
}

shouldLog <- function(minLogLevel = "INFO", messageLogLevel, logLevels = c("", "DEBUG", "INFO", "WARNING", "ERROR", "FATAL")) {
  which(toupper(messageLogLevel) == logLevels) >= which(toupper(minLogLevel) == logLevels)
}

createConsoleTransport <- function(formatter = defaultLogFormatter, logLevel = Sys.getenv("LOG_LEVEL")) {
  function(logObject) {
    if (shouldLog(logLevel, logObject$logLevel)) {
      formattedMessage <- formatter(logObject)
      cat(formattedMessage, "\n")
    }
  }
}

createDailyRotatingFileTransport <- function(fileNamePrefix, fileNamePostfix = "log", formatter = defaultLogFormatter, logLevel = Sys.getenv("LOG_LEVEL")) {
  function(logObject) {
    if (shouldLog(logLevel, logObject$logLevel)) {
      formattedMessage <- formatter(logObject)
      logFolder <- dirname(fileNamePrefix)
      logFileName <- paste(fileNamePrefix, Sys.Date(), fileNamePostfix, sep = ".")
      dir.create(logFolder, recursive = T, showWarnings = F)
      write(formattedMessage, file = logFileName, append = T)
    }
  }
}

createLogger <- function(transports = c(createConsoleTransport())) {
  logMessage <- function(logLevel = "INFO", message) {
    logObject <- list(
      logLevel = logLevel,
      timestamp = Sys.time(),
      message = message
    )
    for (transport in transports) {
      transport(logObject)
    }
  }

  list(
    debug = function(message) {
      logMessage("DEBUG", message)
    },
    info = function(message) {
      logMessage("INFO", message)
    },
    warning = function(message) {
      logMessage("WARNING", message)
    },
    error = function(message) {
      logMessage("ERROR", message)
    }
  )
}
