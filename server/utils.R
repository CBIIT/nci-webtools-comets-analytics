library(future)

plan(multisession)

getAwsServiceConfig <- function(config, ...) {
  serviceConfig <- list(
    region = config$aws$region
  )

  if (all(c("accessKeyId", "secretAccessKey") %in% config$aws)) {
    serviceConfig$credentials <- list(
      creds = list(
        access_key_id = config$aws$accessKeyId,
        secret_access_key = config$aws$secretAccessKey,
      )
    )
  }

  serviceConfig
}


callWithHandlers <- function(func, ...) {
  errors <- c()
  warnings <- c()

  capturedOutput <- capture.output(invisible(
    results <- list(
      output = tryCatch(
        withCallingHandlers(
          func(...),
          warning = function(x) warnings <<- c(warnings, x$message)
        ),
        error = function(x) {
          errors <<- c(errors, x$message)
          NULL
        }
      ),
      errors = errors,
      warnings = warnings
    )
  ))

  results$capturedOutput <- capturedOutput
  results
}

receiveMessage <- function(queueName, messageHandler, visibilityTimeout = 60) {
  sqs <- paws::sqs(getAwsServiceConfig("config.json"))
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
        message <- response$Messages[0]

        messageHandlerTask <- future({
          messageHandler(message$Body)
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
