library(dotenv)
library(future)
library(jsonlite)
library(paws)
library(RcometsAnalytics)

plan(multisession)
source("utils.R")

# configure AWS services as needed
awsConfig <- getAwsConfig()
s3 <- paws::s3(config = awsConfig)
sqs <- paws::sqs(config = awsConfig)
logger <- createLogger(
  transports = c(
    createConsoleTransport(),
    createDailyRotatingFileTransport(
      file.path(Sys.getenv("LOG_FOLDER"), "comets-app")
    )
  )
)

logger$info("Started COMETS Server")

#* Returns COMETS status
#* @get /ping
#* @serializer unboxedJSON
ping <- function() {
  TRUE
}

#* Returns COMETS cohorts
#* @get /cohorts
getCohorts <- function() {
  if (!exists("cohorts")) {
    dir <- system.file("extdata", package = "RcometsAnalytics", mustWork = TRUE)
    load(file.path(dir, "compileduids.RData"))
  }
  cohorts
}


#* Runs an integrity check on the specified COMETS input file and saves
#* the results to a file associated with the current user's session.
#* Returns a subset of the results for visualization, as well as a
#* unique identifier for the specified file's intermediate results
#* for calling runModel
#*
#* @post /loadFile
#*
#* @parser multi
#* @serializer unboxedJSON
#*
loadFile <- function(req, res) {
  # future-scoped blocks only have access to copies of the
  # request and response objects
  future({
    shouldLog # inject globals (needed since shouldLog is not in the future scope)

    id <- plumber::random_cookie_key()

    # create temporary session folder
    sessionFolder <- file.path(Sys.getenv("SESSION_FOLDER"), id)
    dir.create(sessionFolder, recursive = T)

    # write input file to session folder
    inputFile <- req$body$inputFile
    inputFilePath <- file.path(sessionFolder, "input.xlsx")
    writeBin(inputFile$value, inputFilePath)

    # capture errors and warnings from readCOMETSinput
    results <- callWithHandlers(RcometsAnalytics::readCOMETSinput, inputFilePath)

    logger$info(paste("Loaded input file:", inputFile$filename))

    # return errors if present
    if (length(results$errors)) {
      unlink(sessionFolder, recursive = T)
      logger$error(results$capturedOutput)
      logger$error(results$errors)
      res$status <- 500
      return(results)
    }

    output <- results$output

    # save results to session folder
    saveRDS(output, file.path(sessionFolder, "input.rds"))

    # Return metabolites, models, variables, and summary statistics
    # I() inhibits conversion of single-value vectors to scalars
    # when auto_unbox is used. Typecast potentially NULL values
    # to lists since I(NULL) is deprecated
    list(
      id = id,
      messages = I(output$integritymessage),
      warnings = I(as.list(results$warnings)),
      metabolites = I(output$metab),
      models = I(output$mods),
      options = I(as.data.frame(output$options)),
      variables = I(output$allSubjectMetaData),
      summary = list(
        input = list(
          metabolites = nrow(output$metab),
          subjects = length(output$allSubjects),
          subjectCovariates = length(output$allSubjectMetaData),
          subjectMetabolites = length(output$subjdata) - nrow(output$vmap)
        ),
        metabolites = list(
          metabolites = nrow(output$metab),
          harmonized = sum(!is.na(output$metab$uid_01)),
          nonHarmonized = sum(is.na(output$metab$uid_01)),
          zeroVariance = sum(output$metab$var == 0, na.rm = T),
          min25PercentSubjects = sum(
            output$metab$num.min > 0.25 * length(output$allSubjects),
            na.rm = T
          )
        )
      )
    )
  })
}

#* Runs a prespecified model
#*
#* @post /runSelectedModel
#*
#* @parser json
#* @serializer unboxedJSON list(force=T, na="null")
#*
runSelectedModel <- function(req, res) {
  future({
    shouldLog # inject globals (needed since shouldLog is not in the future scope)

    id <- sanitize(req$body$id)
    cohort <- sanitize(req$body$cohort)
    selectedModelType <- sanitize(req$body$selectedModelType)
    selectedModelName <- sanitize(req$body$selectedModelName)

    inputFilePath <- file.path(Sys.getenv("SESSION_FOLDER"), id, "input.rds")
    metaboliteData <- readRDS(inputFilePath)

    modelData <- RcometsAnalytics::getModelData(metaboliteData, modlabel = selectedModelName)
    results <- RcometsAnalytics::runModel(modelData, metaboliteData, cohort)
    logger$info(paste("Ran selected model: ", selectedModelName))

    results$heatmap <- getHeatmap(results$Effects, modelClass = modelData$options$model)
    results$options <- modelData$options
    results$options$name <- selectedModelName
    results$options$type <- selectedModelType

    results
  })
}

#* Runs a custom model
#*
#* @post /runCustomModel
#*
#* @parser json
#* @serializer unboxedJSON list(force=T, na="null")
#*
runCustomModel <- function(req, res) {
  future({
    shouldLog # inject globals (needed since shouldLog is not in the future scope)

    id <- sanitize(req$body$id)
    cohort <- sanitize(req$body$cohort)
    modelType <- sanitize(req$body$modelType)
    modelName <- sanitize(req$body$modelName)
    exposures <- req$body$exposures
    outcomes <- req$body$outcomes
    adjustedCovariates <- req$body$adjustedCovariates
    strata <- req$body$strata
    filters <- req$body$filters
    options <- req$body$options

    inputFilePath <- file.path(Sys.getenv("SESSION_FOLDER"), id, "input.rds")
    metaboliteData <- readRDS(inputFilePath)

    modelData <- RcometsAnalytics::getModelData(
      metaboliteData,
      modelspec = "Interactive",
      modlabel = modelName,
      exposures = as.character(exposures),
      outcomes = as.character(outcomes),
      adjvars = as.character(adjustedCovariates),
      strvars = as.character(strata),
      where = filters
    )

    results <- RcometsAnalytics::runModel(
      modelData,
      metaboliteData,
      cohort,
      op = options
    )
    logger$info(paste("Ran custom model: ", modelName))

    results$heatmap <- getHeatmap(results$Effects, options$model)
    results$options <- options
    results$options$name <- modelName
    results$options$type <- modelType

    results
  })
}

#* Runs all models by sending them to a queue
#*
#* @post /runAllModels
#*
#* @parser json
#* @serializer unboxedJSON list(force=T, na="null")
#*
runAllModels <- function(req, res) {
  id <- sanitize(req$body$id)
  cohort <- sanitize(req$body$cohort)
  originalFileName <- sanitize(req$body$inputFile)
  email <- req$body$email

  sessionFolder <- file.path(Sys.getenv("SESSION_FOLDER"), id)
  inputFilePath <- file.path(sessionFolder, "input.xlsx")

  # determine key for s3 object
  s3FilePath <- paste0(Sys.getenv("S3_INPUT_KEY_PREFIX"), id, "/input.xlsx")

  # upload input file to s3 bucket
  s3$put_object(
    Body = inputFilePath,
    Bucket = Sys.getenv("S3_BUCKET"),
    Key = s3FilePath
  )

  logger$info(paste("Uploaded input file to s3: ", s3FilePath))

  # create parameters for queue
  params <- list(
    id = id,
    cohort = cohort,
    s3FilePath = s3FilePath,
    originalFileName = originalFileName,
    email = email
  )

  # determine queue url from queue name
  queueUrl <- sqs$get_queue_url(
    QueueName = Sys.getenv("SQS_QUEUE_NAME")
  )$QueueUrl

  # enqueue parameters
  messageStatus <- sqs$send_message(
    QueueUrl = queueUrl,
    MessageBody = jsonlite::toJSON(params, auto_unbox = T),
    MessageDeduplicationId = plumber::random_cookie_key(),
    MessageGroupId = plumber::random_cookie_key()
  )

  logger$info(c("Sent parameters to queue: ", params))
  logger$info(c("Queue response: ", messageStatus))

  list(queue = T)
}

#* Runs a model
#*
#* @post /runModel
#*
#* @parser json
#* @serializer unboxedJSON list(force=T, na="null")
#*
runModel <- function(req, res) {
  # future-scoped blocks only have access to copies of the
  # request and response objects
  method <- req$body$method

  # run selected model
  if (method == "selectedModel") {
    return(runSelectedModel(req, res))
  }

  # run custom model
  else if (method == "customModel") {
    return(runCustomModel(req, res))
  }

  # queue models
  else if (method == "allModels") {
    return(runAllModels(req, res))
  }

  res$status <- 500
  list(
    error = "Invalid method specified"
  )
}


#* Retrieves an s3 url for batch results
#*
#* @get /batchResults/<id>
#* @serializer contentType list(type="application/octet-stream")
#*
getBatchResults <- function(req, res) {
  id <- sanitize(req$args$id)

  s3FilePath <- paste0(Sys.getenv("S3_OUTPUT_KEY_PREFIX"), id, "/output.zip")

  s3Object <- s3$get_object(
    Bucket = Sys.getenv("S3_BUCKET"),
    Key = s3FilePath
  )

  res$setHeader("Content-Disposition", 'attachment; filename="comets_results.zip"')
  s3Object$Body
}


getHeatmap <- function(effects, modelClass = "correlation") {
  heatmap <- list()

  # by default, z should be for correlation results
  x <- "term"
  y <- "outcomespec"
  z <- "corr"

  if (length(modelClass) && modelClass %in% c("lm", "glm")) {
    z <- "estimate"
  }

  heatmap$data <- effects |>
    dplyr::select(all_of(x), all_of(y), all_of(z)) |>
    tidyr::pivot_wider(names_from = x, values_from = z) |>
    tibble::column_to_rownames(y)

  # get hierarchical clusters if there are at least two rows/columns in the heatmap
  if (nrow(heatmap$data) >= 2 && ncol(heatmap$data) >= 2) {
    heatmap$dendrogram <- I(plotly::plotly_build(heatmaply::heatmaply(heatmap$data))$x)
  }

  heatmap$data <- I(heatmap$data)
  heatmap
}
