library(future)

plan(multisession)

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

