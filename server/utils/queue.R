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
        output <- callWithHandlers(messageHandler, message$Body)
        if (length(output$errors) > 0) {
          callWithHandlers(errorHandler, message$Body, output)
        }
        sqs$delete_message(
          QueueUrl = queueUrl,
          ReceiptHandle = message$ReceiptHandle
        )
      }
    },
    error = function(x) {
      logger$error(paste("Queue processing error:", x$message))
    }
  )
}
