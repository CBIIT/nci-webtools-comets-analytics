source("utils.R")

# configure AWS services if needed
awsConfig <- getAwsConfig()
s3 <- paws::s3(config = awsConfig)
ses <- paws::ses(config = awsConfig)
sqs <- paws::sqs(config = awsConfig)
logger <- createLogger(
  transports = c(
    createConsoleTransport(),
    createDailyRotatingFileTransport(
    file.path(Sys.getenv("LOG_FOLDER"), "comets-processor")
    )
  )
)
logger$info("Started COMETS Processor")

runPredefinedModel <- function(cometsInput, modelName, cohort) {
  modelData <- RcometsAnalytics::getModelData(
    cometsInput,
    modelspec = "Batch",
    modlabel = modelName
  )

  RcometsAnalytics::runModel(
    modelData,
    cometsInput,
    cohort
  )
}

listItems <- function(values) {
  if (length(values)) {
    paste("<li>", values, "</li>", collapse = "", sep = "")
  } else {
    ""
  }
}

messageHandler <- function(message) {
  logger$info(paste("Received parameters: ", message))
  params <- jsonlite::fromJSON(message)

  id <- sanitize(params$id)
  cohort <- sanitize(params$cohort)
  originalFileName <- params$originalFileName
  s3FilePath <- params$s3FilePath
  email <- params$email

  outputFolder <- file.path(Sys.getenv("SESSION_FOLDER"), id, "output")
  inputFilePath <- file.path(outputFolder, "input.xlsx")

  # clear and recreate output folder
  unlink(outputFolder, recursive = T)
  dir.create(outputFolder, recursive = T)

  s3Object <- s3$get_object(
    Bucket = Sys.getenv("S3_BUCKET"),
    Key = params$s3FilePath
  )
  writeBin(s3Object$Body, inputFilePath)
  logger$info(sprintf("Downloaded input file: %s", inputFilePath))

  s3$delete_object(
    Bucket = Sys.getenv("S3_BUCKET"),
    Key = params$s3FilePath
  )
  logger$info(sprintf("Deleted original input file from s3: %s", params$s3FilePath))


  cometsInput <- RcometsAnalytics::readCOMETSinput(inputFilePath)
  cometsInputSummary <- RcometsAnalytics::runDescrip(cometsInput)

  # write original input file (minus unused sheets) to output folder
  workbook <- openxlsx::loadWorkbook(inputFilePath)
  for (sheet in names(workbook)) {
    if (!sheet %in% c("Metabolites", "VarMap", "Models", "ModelOptions")) {
      openxlsx::removeWorksheet(workbook, sheet = sheet)
    }
  }
  openxlsx::saveWorkbook(
    workbook,
    file.path(outputFolder, paste0("input", ".xlsx")),
    overwrite = TRUE
  )

  # write harmonization results to output folder
  harmonizationFileName <- RcometsAnalytics::OutputCSVResults(
    filename = file.path(outputFolder, "harmonization_"),
    dataf = cometsInput$metab,
    cohort = paste0(cohort, "_")
  )
  logger$info(sprintf("Saved harmonization results: %s", harmonizationFileName))

  # write input summary to output folder
  summaryFileName <- RcometsAnalytics::OutputXLSResults(
    filename = file.path(outputFolder, "summary_"),
    datal = cometsInputSummary,
    cohort = paste0(cohort, "_")
  )
  logger$info(sprintf("Saved summary: %s", summaryFileName))

  # run all models and save results to output folder

  modelResults <- data.frame(matrix(ncol = 6, nrow = 0))
  colnames(modelResults) <- c("modelName", "processingTime", "hasWarnings", "hasErrors", "warnings", "errors")

  for (modelName in cometsInput$mods$model) {
    startTime <- Sys.time()

    results <- callWithHandlers(
      runPredefinedModel,
      cometsInput,
      modelName,
      cohort
    )

    endTime <- Sys.time()
    processingTime <- as.numeric(endTime - startTime)

    logger$info(sprintf("Ran model: %s", modelName))

    if (length(results$errors) == 0) {
      resultsFile <- RcometsAnalytics::OutputXLSResults(
        filename = file.path(outputFolder, paste0(modelName, "_")),
        datal = results$output,
        cohort = paste0(cohort, "_")
      )
      logger$info(sprintf("Saved model results: %s", resultsFile))
    }

    modelResults <- rbind(modelResults, data.frame(
      modelName = modelName,
      processingTime = round(as.numeric(processingTime), 2),
      warnings = listItems(results$warnings),
      errors = listItems(results$errors),
      hasWarnings = length(results$warnings) > 0,
      hasErrors = length(results$errors) > 0
    ))
  }

  outputFile <- file.path(outputFolder, "output.zip")
  zip::zip(outputFile, list.files(outputFolder, full.names = T), mode = "cherry-pick")

  logger$info(paste("Created output file: ", outputFile))

  s3FilePath <- paste0(Sys.getenv("S3_OUTPUT_KEY_PREFIX"), id, "/output.zip")

  # upload output file to s3 bucket
  s3$put_object(
    Body = outputFile,
    Bucket = Sys.getenv("S3_BUCKET"),
    Key = s3FilePath
  )

  logger$info(paste("Uploaded output file to s3: ", s3FilePath))

  unlink(outputFolder, recursive = T)
  logger$info(paste("Deleted local results: ", outputFolder))

  # generate success email
  template <- readLines(file.path("email-templates", "user-success.html"))
  templateData <- list(
    originalFileName = params$originalFileName,
    resultsUrl = paste0(Sys.getenv("EMAIL_BASE_URL"), "/api/batchResults/", id),
    totalProcessingTime = round(sum(unlist(modelResults$processingTime)), 2),
    modelResults = whisker::rowSplit(modelResults)
  )

  emailSubject <- "COMETS Analytics Batch Results"
  emailBody <- whisker::whisker.render(template, templateData)
  logger$info(emailBody)

  ses$send_email(
    Source = Sys.getenv("EMAIL_SENDER"),
    Destination = list(ToAddresses = email),
    Message = list(
      Body = list(
        Html = list(
          Charset = "UTF-8",
          Data = emailBody
        )
      ),
      Subject = list(
        Charset = "UTF-8",
        Data = emailSubject
      )
    ),
  )

  logger$info(paste("Sent user success email to: ", email))

  unname(modelResults)
}

errorHandler <- function(message, output) {
  params <- jsonlite::fromJSON(message)

  id <- sanitize(params$id)
  cohort <- sanitize(params$cohort)
  originalFileName <- params$originalFileName
  s3FilePath <- params$s3FilePath
  email <- params$email

  errors <- output$errors
  warnings <- output$warnings
  capturedOutput <- output$capturedOutput

  # send user failure email
  ses$send_email(
    Source = Sys.getenv("EMAIL_SENDER"),
    Destination = list(ToAddresses = email),
    Message = list(
      Body = list(
        Html = list(
          Charset = "UTF-8",
          Data = whisker::whisker.render(
            readLines(file.path("email-templates", "user-failure.html")),
            list(
              originalFileName = originalFileName
            )
          )
        )
      ),
      Subject = list(
        Charset = "UTF-8",
        Data = "COMETS Analytics Batch Results - Error"
      )
    )
  )

  logger$info(paste("Sent user failure email to: ", email))


  # send admin failure email
  ses$send_email(
    Source = Sys.getenv("EMAIL_SENDER"),
    Destination = list(ToAddresses = Sys.getenv("EMAIL_ADMIN")),
    Message = list(
      Body = list(
        Html = list(
          Charset = "UTF-8",
          Data = whisker::whisker.render(
            readLines(file.path("email-templates", "admin-failure.html")),
            list(
              originalFileName = originalFileName,
              email = email,
              cohort = cohort,
              error = paste0(errors, collapse = "", sep = "")
            )
          )
        )
      ),
      Subject = list(
        Charset = "UTF-8",
        Data = "COMETS Analytics Batch Results - Error"
      )
    )
  )

  logger$info(paste("Sent admin failure email to: ", Sys.getenv("EMAIL_ADMIN")))

  callWithHandlers(
    s3$delete_object,
    Bucket = Sys.getenv("S3_BUCKET"),
    Key = s3FilePath
  )

  logger$info(sprintf("Deleted original input file from s3: %s", s3FilePath))
}

# set up message handler loop
while (TRUE) {
  receiveMessage(
    sqs = sqs,
    queueName = Sys.getenv("SQS_QUEUE_NAME"),
    messageHandler = messageHandler,
    errorHandler = errorHandler,
    logger = logger,
    visibilityTimeout = as.numeric(Sys.getenv("SQS_VISIBILITY_TIMEOUT"))
  )
  Sys.sleep(as.numeric(Sys.getenv("SQS_POLL_INTERVAL")))
}
