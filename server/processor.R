library(COMETS)
library(jsonlite)

config <- jsonlite::read_json("config.json")
source("utils.R")


messageHandler <- function(message) {
  s3 <- paws::s3()
  
  params <- jsonlite::fromJSON(message)
  print(params)
  
}

# set up loop
while(TRUE) {
  receiveMessage(
    queueName = config$sqs$queueName, 
    messageHandler = messageHandler, 
    visibilityTimeout = config$sqs$visibilityTimeout
  )
  Sys.sleep(config$sqs$pollInterval)
}