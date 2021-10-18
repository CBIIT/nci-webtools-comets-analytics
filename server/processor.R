source("utils.R")

# configure AWS services if needed
config <- jsonlite::read_json("config.json")
s3 <- paws::s3(config = getAwsConfig(config))
ses <- paws::ses(config = getAwsConfig(config))
sqs <- paws::sqs(config = getAwsConfig(config))
logger <- createDailyRotatingLogger(
  file.path(config$logs$folder, "comets-processor")
)

logger$info("Started COMETS Processor")

runPredefinedModel <- function(cometsInput, modelName, cohort) {
  modelData <- COMETS::getModelData(
    cometsInput,
    modelspec = "Batch",
    modlabel = modelName
  )

  COMETS::runModel(
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

  outputFolder <- file.path(config$server$sessionFolder, id, "output")
  inputFilePath <- file.path(outputFolder, "input.xlsx")

  # clear and recreate output folder
  unlink(outputFolder, recursive = T)
  dir.create(outputFolder, recursive = T)

  s3Object <- s3$get_object(
    Bucket = config$s3$bucket,
    Key = params$s3FilePath
  )
  writeBin(s3Object$Body, inputFilePath)
  logger$info(sprintf("Downloaded input file: %s", inputFilePath))

  s3$delete_object(
    Bucket = config$s3$bucket,
    Key = params$s3FilePath
  )
  logger$info(sprintf("Deleted original input file from s3: %s", params$s3FilePath))


  cometsInput <- COMETS::readCOMETSinput(inputFilePath)
  cometsInputSummary <- COMETS::runDescrip(cometsInput)

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
  harmonizationFileName <- COMETS::OutputCSVResults(
    filename = file.path(outputFolder, "harmonization_"),
    dataf = cometsInput$metab,
    cohort = paste0(cohort, "_")
  )
  logger$info(sprintf("Saved harmonization results: %s", harmonizationFileName))

  # write input summary to output folder
  summaryFileName <- COMETS::OutputXLSResults(
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
      resultsFile <- COMETS::OutputXLSResults(
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

  s3FilePath <- paste0(config$s3$outputKeyPrefix, id, "/output.zip")

  # upload output file to s3 bucket
  s3$put_object(
    Body = outputFile,
    Bucket = config$s3$bucket,
    Key = s3FilePath
  )

  logger$info(paste("Uploaded output file to s3: ", s3FilePath))

  unlink(outputFolder, recursive = T)
  logger$info(paste("Deleted local results: ", outputFolder))

  # generate success email
  template <- readLines(file.path("email-templates", "user-success.html"))
  templateData <- list(
    originalFileName = params$originalFileName,
    resultsUrl = paste0(config$email$baseUrl, "/api/batchResults/", id),
    totalProcessingTime = round(sum(unlist(modelResults$processingTime)), 2),
    modelResults = whisker::rowSplit(modelResults)
  )

  emailSubject <- "COMETS Analytics Batch Results"
  emailBody <- whisker::whisker.render(template, templateData)
  logger$info(emailBody)

  ses$send_email(
    Source = config$email$sender,
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
    Source = config$email$sender,
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
    Source = config$email$sender,
    Destination = list(ToAddresses = config$email$admin),
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

  logger$info(paste("Sent admin failure email to: ", config$email$admin))

  callWithHandlers(
    s3$delete_object,
    Bucket = config$s3$bucket,
    Key = s3FilePath
  )

  logger$info(sprintf("Deleted original input file from s3: %s", s3FilePath))
}

# set up message handler loop
while (TRUE) {
  receiveMessage(
    sqs = sqs,
    queueName = config$sqs$queueName,
    messageHandler = messageHandler,
    errorHandler = errorHandler,
    logger = logger,
    visibilityTimeout = config$sqs$visibilityTimeout
  )
  Sys.sleep(config$sqs$pollInterval)
}
