library(COMETS)
library(future)
library(jsonlite)
library(paws)

plan(multisession)
config <- jsonlite::read_json("config.json")
source("utils.R")

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
      warnings = I(results$warnings),
      metabolites = I(output$metab),
      models = I(output$mods),
      options = I(output$options),
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

#* Runs a specified model
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
    id <- req$body$id
    method <- req$body$method
    cohort <- req$body$cohort
    selectedModel <- req$body$selectedModel
    modelName <- req$body$modelName
    exposures <- req$body$exposures
    outcomes <- req$body$outcomes
    adjustedCovariates <- req$body$adjustedCovariates
    strata <- req$body$strata
    filters <- req$body$filters
    options <- req$body$options

    inputFilePath <- file.path(config$server$sessionFolder, id, "input.rds")
    metaboliteData <- readRDS(inputFilePath)
    results <- FALSE

    # run selected model
    if (method == "selectedModel") {
      modelData <- COMETS::getModelData(metaboliteData, modlabel = selectedModel)
      results <- COMETS::runModel(modelData, metaboliteData, cohort)
      results$heatmap <- getHeatmap(results$Effects, modelClass = modelData$options$model)
      results$options <- modelData$options
    }

    # run custom model
    else if (method == "customModel") {
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
    }

    # queue models
    else if (method == "allModels") {

    }

    results
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
