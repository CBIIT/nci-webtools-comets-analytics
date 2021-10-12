library(COMETS)
library(jsonlite)

config <- jsonlite::read_json("config.json")
source("utils.R")

# configure AWS services if needed
s3 <- paws::s3(config = getAwsConfig(config))
sqs <- paws::sqs(config = getAwsConfig(config))
logger <- createDailyRotatingLogger(
  file.path(config$logs$folder, "comets-processor")
)

logger$info("Started COMETS Processor")


messageHandler <- function(message) {
  logger$info(message)
  params <- jsonlite::fromJSON(message)

  id <- sanitize(params$id)
  cohort <- sanitize(params$cohort)
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
    filename = file.path(outputFolder, "harmonization"),
    dataf = cometsInput$metab,
    cohort = cohort
  )
  logger$info(sprintf("Saved harmonization results: %s", harmonizationFileName))

  # write input summary to output folder
  summaryFileName <- COMETS::OutputXLSResults(
    filename = file.path(outputFolder, "summary"),
    datal = cometsInputSummary,
    cohort = cohort
  )
  logger$info(sprintf("Saved summary: %s", summaryFileName))

  # run all models and save results to output folder
  modelResults <- Map(function(modelName) {
    modelData <- COMETS::getModelData(
      cometsInput,
      modelspec = "Batch",
      modlabel = modelName
    )

    logger$info(sprintf("Started running model: %s", modelName))
    results <- COMETS::runModel(modelData, cometsInput, cohort)
    logger$info(sprintf("Finished running model: %s", modelName))

    # result <- call_with_handlers(
    #     COMETS::runCorr,
    #     model_data,
    #     comets_input,
    #     cohort
    # )

    resultsFile <- COMETS::OutputXLSResults(
      filename = file.path(outputFolder, modelName),
      datal = results,
      cohort = cohort
    )

    list(
      modelName = modelName,
      fileName = xlsxFile
      # processing_time=attr(result$output, "ptime"),
      # warnings=I(result$warnings),
      # errors=I(result$errors),
      # csv=csv
    )
  }, cometsInput$mods$model)

  unname(modelResults)
}

# set up message handler loop
while (TRUE) {
  receiveMessage(
    sqs = sqs,
    queueName = config$sqs$queueName,
    messageHandler = messageHandler,
    visibilityTimeout = config$sqs$visibilityTimeout
  )
  Sys.sleep(config$sqs$pollInterval)
}
