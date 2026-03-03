library(dotenv)
library(jsonlite)
library(paws)
library(RcometsAnalytics)

source("utils.R")

# configure AWS services if needed
awsConfig <- getAwsConfig()
# Note: ses is initialized in each handler to ensure fresh connections
# logger <- createLogger(
#     transports = c(createConsoleTransport())
# )

# Create a simple mock logger to avoid errors
logger <- list(
  info = function(message, jobId = NULL) { 
    if (!is.null(jobId)) {
      cat(paste("[INFO] [Job:", jobId, "]", message, "\n"))
    } else {
      cat(paste("[INFO]", message, "\n"))
    }
  },
  warn = function(message, jobId = NULL) { 
    if (!is.null(jobId)) {
      cat(paste("[WARN] [Job:", jobId, "]", message, "\n"))
    } else {
      cat(paste("[WARN]", message, "\n"))
    }
  },
  error = function(message, jobId = NULL) { 
    if (!is.null(jobId)) {
      cat(paste("[ERROR] [Job:", jobId, "]", message, "\n"))
    } else {
      cat(paste("[ERROR]", message, "\n"))
    }
  },
  debug = function(message, jobId = NULL) { 
    if (!is.null(jobId)) {
      cat(paste("[DEBUG] [Job:", jobId, "]", message, "\n"))
    } else {
      cat(paste("[DEBUG]", message, "\n"))
    }
  }
)


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

messageHandler <- function(id) {
    paramsFile <- file.path(Sys.getenv("SESSION_FOLDER"), "input", id, "params.json")
    params <- jsonlite::read_json(paramsFile)

    id <- sanitize(params$id)
    cohort <- sanitize(params$cohort)
    originalFileName <- params$originalFileName
    email <- params$email
    runMeta <- params$runMeta


    outputFolder <- file.path(Sys.getenv("SESSION_FOLDER"), "output", id)
    inputFilePath <- file.path(Sys.getenv("SESSION_FOLDER"), "input", id, "input.xlsx")


    # clear and recreate output folder
    unlink(outputFolder, recursive = TRUE)
    dir.create(outputFolder, recursive = TRUE)


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
            logger$info(sprintf("Processing time: %s", processingTime))
            datal <- list(
                ModelSummary = results$output$ModelSummary,
                Effects = results$output$Effects,
                Errors_Warnings = results$output$Errors_Warnings,
                Info = results$output$Info
            )
            if (!is.null(results$output$Table1)) {
                datal$Table1 <- results$output$Table1
            }
            resultsFile <- RcometsAnalytics::OutputXLSResults(
                filename = file.path(outputFolder, paste0(modelName, "_")),
                datal = datal,
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

        # if (runMeta)
        # RcometsAnalytics::runMeta(...)
        if (isTRUE(runMeta)) {
            logger$info("Running meta-analysis across selected models...")
            metaResults <- RcometsAnalytics::runMeta(
                cometsInput,
                cohort = cohort
            )

            metaResultsFile <- RcometsAnalytics::OutputXLSResults(
                filename = file.path(outputFolder, "meta_analysis_"),
                datal = metaResults,
                cohort = paste0(cohort, "_")
            )

            logger$info(sprintf("Saved meta-analysis results: %s", metaResultsFile))
        }

    }

    outputFile <- file.path(Sys.getenv("SESSION_FOLDER"), "output", id, "output.zip")
    zip::zip(outputFile, list.files(outputFolder, full.names = T), mode = "cherry-pick")

    logger$info(paste("Created output file: ", outputFile))

    # generate success email
    template <- readLines(file.path("email-templates", "user-success.html"))
    templateData <- list(
        originalFileName = params$originalFileName,
        resultsUrl = paste0(Sys.getenv("EMAIL_BASE_URL"), "api/batchResults/", id),
        totalProcessingTime = round(sum(unlist(modelResults$processingTime)), 2),
        modelResults = whisker::rowSplit(modelResults)
    )

    emailSubject <- "COMETS Analytics Batch Results"
    emailBody <- whisker::whisker.render(template, templateData)
    logger$info(emailBody)

    # Send email with proper error handling
    if (!is.null(email) && nchar(email) > 0) {
        tryCatch({
            # Validate AWS configuration
            if (!is.null(awsConfig) && length(awsConfig) > 0 && Sys.getenv("EMAIL_SENDER") != "") {
                # Re-initialize SES to ensure fresh connection
                ses <- paws::sesv2(config = awsConfig)
                
                sendEmail(
                    sesv2 = ses,
                    from = Sys.getenv("EMAIL_SENDER"),
                    to = email,
                    subject = emailSubject,
                    body = emailBody
                )
                logger$info(paste("Sent user success email to: ", email))
            } else {
                logger$warn("AWS SES not configured - skipping email notification")
            }
        }, error = function(e) {
            logger$error(sprintf("Failed to send success email: %s", e$message))
        })
    } else {
        logger$info("No email address provided - skipping email notification")
    }
    
    unname(modelResults)

    TRUE
}

errorHandler <- function(message, output) {
    logger$error(output$errors)
    params <- jsonlite::fromJSON(message)
    id <- sanitize(params$id)
    cohort <- sanitize(params$cohort)
    originalFileName <- params$originalFileName
    email <- params$email

    errors <- output$errors
    warnings <- output$warnings
    capturedOutput <- output$capturedOutput

    # Send failure emails with proper error handling
    if (!is.null(email) && nchar(email) > 0) {
        tryCatch({
            # Validate AWS configuration
            if (!is.null(awsConfig) && length(awsConfig) > 0 && Sys.getenv("EMAIL_SENDER") != "") {
                # Re-initialize SES to ensure fresh connection
                ses <- paws::sesv2(config = awsConfig)
                
                # send user failure email
                sendEmail(
                    sesv2 = ses,
                    from = Sys.getenv("EMAIL_SENDER"),
                    to = email,
                    subject = "COMETS Analytics Batch Results - Error",
                    body = whisker::whisker.render(
                        readLines(file.path("email-templates", "user-failure.html")),
                        list(
                            originalFileName = originalFileName
                        )
                    )
                )
                logger$info(paste("Sent user failure email to: ", email))

                # send admin failure email
                if (Sys.getenv("EMAIL_ADMIN") != "") {
                    sendEmail(
                        sesv2 = ses,
                        from = Sys.getenv("EMAIL_SENDER"),
                        to = Sys.getenv("EMAIL_ADMIN"),
                        subject = "COMETS Analytics Batch Results - Error",
                        body = whisker::whisker.render(
                            readLines(file.path("email-templates", "admin-failure.html")),
                            list(
                                originalFileName = originalFileName,
                                email = email,
                                cohort = cohort,
                                error = paste0(errors, collapse = "", sep = "")
                            )
                        )
                    )
                    logger$info(paste("Sent admin failure email to: ", Sys.getenv("EMAIL_ADMIN")))
                }
            } else {
                logger$warn("AWS SES not configured - skipping failure email notifications")
            }
        }, error = function(e) {
            logger$error(sprintf("Failed to send failure emails: %s", e$message))
        })
    } else {
        logger$info("No email address provided - skipping failure email notifications")
    }
}

logger$info("Started COMETS worker")

# parse arguments
args <- commandArgs(trailingOnly = TRUE)
id <- args[1]
logger$info(sprintf("Processing: %s", args))
messageHandler(id)
