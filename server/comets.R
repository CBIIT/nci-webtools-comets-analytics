library(COMETS)
library(future)
library(jsonlite)
library(paws)

plan(multisession)
config <- jsonlite::read_json("config.json")
source("utils.R")

# configure AWS services if needed
s3 <- paws::s3(config = getAwsConfig(config))
sqs <- paws::sqs(config = getAwsConfig(config))

logger <- createDailyRotatingLogger("comets-app")

#* Returns COMETS cohorts
#* @get /cohorts
getCohorts <- function() {
  if (!exists("cohorts")) {
    dir <- system.file("extdata", package = "COMETS", mustWork = TRUE)
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
    id <- plumber::random_cookie_key()

    # create temporary session folder
    sessionFolder <- file.path(config$server$sessionFolder, id)
    dir.create(sessionFolder, recursive = T)

    # write input file to session folder
    inputFile <- req$body$inputFile
    inputFilePath <- file.path(sessionFolder, "input.xlsx")
    writeBin(inputFile$value, inputFilePath)

    # capture errors and warnings from readCOMETSinput
    results <- callWithHandlers(COMETS::readCOMETSinput, inputFilePath)

    # return errors if present
    if (length(results$errors)) {
      unlink(sessionFolder, recursive = T)
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
  id <- sanitize(req$body$id)
  cohort <- sanitize(req$body$cohort)
  selectedModelType <- sanitize(req$body$selectedModelType)
  selectedModelName <- sanitize(req$body$selectedModelName)

  inputFilePath <- file.path(config$server$sessionFolder, id, "input.rds")
  metaboliteData <- readRDS(inputFilePath)

  modelData <- COMETS::getModelData(metaboliteData, modlabel = selectedModelName)
  results <- COMETS::runModel(modelData, metaboliteData, cohort)
  results$heatmap <- getHeatmap(results$Effects, modelClass = modelData$options$model)
  results$options <- modelData$options
  results$options$name <- selectedModelName
  results$options$type <- selectedModelType

  results
}

#* Runs a custom model
#*
#* @post /runCustomModel
#*
#* @parser json
#* @serializer unboxedJSON list(force=T, na="null")
#*
runCustomModel <- function(req, res) {
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

  inputFilePath <- file.path(config$server$sessionFolder, id, "input.rds")
  metaboliteData <- readRDS(inputFilePath)

  modelData <- COMETS::getModelData(
    metaboliteData,
    modelspec = "Interactive",
    modlabel = modelName,
    exposures = as.character(exposures),
    outcomes = as.character(outcomes),
    adjvars = as.character(adjustedCovariates),
    strvars = as.character(strata),
    where = filters
  )

  results <- COMETS::runModel(
    modelData,
    metaboliteData,
    cohort,
    op = options
  )

  results$heatmap <- getHeatmap(results$Effects, options$model)
  results$options <- options
  results$options$name <- modelName
  results$options$type <- modelType

  results
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

  sessionFolder <- file.path(config$server$sessionFolder, id)
  inputFilePath <- file.path(sessionFolder, "input.xlsx")

  # determine key for s3 object
  s3FilePath <- paste0(config$s3$inputKeyPrefix, id, "/", "input.xlsx")

  # upload input file to s3 bucket
  s3$put_object(
    Body = inputFilePath,
    Bucket = config$s3$bucket,
    Key = s3FilePath
  )

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
    QueueName = config$sqs$queueName
  )$QueueUrl

  # enqueue parameters
  sqs$send_message(
    QueueUrl = queueUrl,
    MessageBody = jsonlite::toJSON(params, auto_unbox = T),
    MessageDeduplicationId = plumber::random_cookie_key(),
    MessageGroupId = plumber::random_cookie_key()
  )

  TRUE
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
  future({
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
  })
}


getHeatmap <- function(effects, modelClass = "correlation") {
  heatmap <- list()

  # by default, z should be for correlation results
  x <- "term"
  y <- "outcomespec"
  z <- "corr"

  if (modelClass %in% c("lm", "glm")) {
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
