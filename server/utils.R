library(future)

plan(multisession)

sanitize <- function(str) {
  gsub("[^[:alnum:][:space:]_,-.]+", "_", str)
}

getAwsConfig <- function(config, ...) {
  serviceConfig <- list(
    region = config$aws$region
  )

  if (all(c("accessKeyId", "secretAccessKey") %in% names(config$aws))) {
    serviceConfig$credentials <- list(
      creds = list(
        access_key_id = config$aws$accessKeyId,
        secret_access_key = config$aws$secretAccessKey
      )
    )
  }

  serviceConfig
}


callWithHandlers <- function(func, ...) {
  output <- NULL
  errors <- c()
  warnings <- c()

  capturedOutput <- capture.output(invisible(
    output <- tryCatch(
      withCallingHandlers(
        func(...),
        warning = function(x) {
          print(x$message)
          warnings <<- c(warnings, x$message)
        }
      ),
      error = function(x) {
        errors <<- c(errors, x$message)
        NULL
      }
    )
  ))

  list(
    output = output,
    capturedOutput = capturedOutput,
    warnings = warnings,
    errors = errors
  )
}

receiveMessage <- function(sqs, queueName, messageHandler, errorHandler, logger, visibilityTimeout = 60) {
  queueUrl <- sqs$get_queue_url(QueueName = queueName)$QueueUrl

  tryCatch(
    {
      response <- sqs$receive_message(
        QueueUrl = queueUrl,
        MaxNumberOfMessages = 1,
        VisibilityTimeout = visibilityTimeout,
        WaitTimeSeconds = 20
      )

      if (length(response$Messages) > 0) {
        message <- response$Messages[[1]]

        messageHandlerTask <- future({
          output <- callWithHandlers(messageHandler, message$Body)

          if (length(output$errors) > 0) {
            errorOutput <- callWithHandlers(errorHandler, message$Body, output)
            logger$error(errorOutput)
          }
        })

        while (!resolved(messageHandlerTask)) {
          sqs$change_message_visibility(
            QueueUrl = queueUrl,
            ReceiptHandle = message$ReceiptHandle,
            VisibilityTimeout = visibilityTimeout
          )
          Sys.sleep(1)
        }

        sqs$delete_message(
          QueueUrl = queueUrl,
          ReceiptHandle = message$ReceiptHandle
        )
      }
    },
    error = function(x) {
      print(x)
    }
  )
}


defaultLogFormatter <- function(object) {
  sprintf(
    "[%s] [%s] %s",
    object$logLevel,
    object$timestamp,
    jsonlite::toJSON(object$message, auto_unbox = T)
  )
}

httpLogFormatter <- function(object) {
  sprintf(
    "[%s] [%s] %s",
    object$logLevel,
    object$timestamp,
    jsonlite::toJSON(object$message, auto_unbox = T)
  )
}

createDailyRotatingLogger <- function(fileNamePrefix = "app", formatter = defaultLogFormatter) {
  logMessage <- function(logLevel = "INFO", message) {
    logFileName <- paste(fileNamePrefix, Sys.Date(), "log", sep = ".")

    formattedMessage <- formatter(list(
      logLevel = logLevel,
      timestamp = Sys.time(),
      message = message
    ))

    cat(formattedMessage, "\n")
    write(formattedMessage, file = logFileName, append = T)
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
