library(dotenv)
library(future)
library(jsonlite)
library(paws)
library(RcometsAnalytics)
library(whisker)
library(openxlsx)

plan(multisession)
source("utils.R")

# configure AWS services as needed
awsConfig <- getAwsConfig()
logger <- createLogger(
  transports = c(
    createConsoleTransport(),
    createDailyRotatingFileTransport(
      file.path(Sys.getenv("LOG_FOLDER"), "comets-app")
    )
  )
)

# logger$info("Started COMETS Server")

#* Returns COMETS status
#* @get /ping/
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
  inputFile <- req$body$inputFile
  future({
    shouldLog # inject globals (needed since shouldLog is not in the future scope)

    id <- plumber::random_cookie_key()

    # create input session folder
    inputSessionFolder <- file.path(Sys.getenv("SESSION_FOLDER"), "input", id)
    dir.create(inputSessionFolder, recursive = TRUE)

    # write input file to input session folder
    inputFilePath <- file.path(inputSessionFolder, "input.xlsx")
    writeBin(inputFile$value, inputFilePath)

    # capture errors and warnings from readCOMETSinput
    results <- callWithHandlers(RcometsAnalytics::readCOMETSinput, inputFilePath)

    # logger$info(paste("Loaded input file:", inputFile$filename))

    # return errors if present
    if (length(results$errors)) {
      unlink(inputSessionFolder, recursive = TRUE)
      logger$error(results$capturedOutput)
      logger$error(results$errors)
      res$status <- 500
      return(results)
    }

    output <- results$output

    # save results to input session folder
    saveRDS(output, file.path(inputSessionFolder, "input.rds"))

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
  future({
    shouldLog # inject globals (needed since shouldLog is not in the future scope)


    inputFilePath <- file.path(Sys.getenv("SESSION_FOLDER"), "input", id, "input.rds")
    metaboliteData <- readRDS(inputFilePath)

    modelData <- RcometsAnalytics::getModelData(metaboliteData, modlabel = selectedModelName)
    results <- RcometsAnalytics::runModel(modelData, metaboliteData, cohort)
    # logger$info(paste("Ran selected model: ", selectedModelName))

    results$heatmap <- getHeatmap(results$Effects)
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
  id <- sanitize(req$body$id)
  cohort <- sanitize(req$body$cohort)
  modelType <- sanitize(req$body$modelType)
  modelName <- sanitize(req$body$modelName)
  exposures <- req$body$exposures
  outcomes <- req$body$outcomes
  adjustedCovariates <- req$body$adjustedCovariates
  strata <- req$body$strata
  filters <- req$body$filters
  time <- req$body$time
  group <- req$body$group
  options <- req$body$options
  future({
    shouldLog # inject globals (needed since shouldLog is not in the future scope)


    inputFilePath <- file.path(Sys.getenv("SESSION_FOLDER"), "input", id, "input.rds")
    metaboliteData <- readRDS(inputFilePath)

    modelData <- RcometsAnalytics::getModelData(
      metaboliteData,
      modelspec = "Interactive",
      modlabel = modelName,
      exposures = as.character(exposures),
      outcomes = as.character(outcomes),
      adjvars = as.character(adjustedCovariates),
      strvars = as.character(strata),
      timevar = as.character(time),
      groupvar = as.character(group),
      where = filters
    )

    results <- RcometsAnalytics::runModel(
      modelData,
      metaboliteData,
      cohort,
      op = options
    )
    # logger$info(paste("Ran custom model: ", modelName))

    results$heatmap <- getHeatmap(results$Effects)
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
  future({
    shouldLog # inject globals (needed since shouldLog is not in the future scope)


    inputSessionFolder <- file.path(Sys.getenv("SESSION_FOLDER"), "input", id)
    inputFilePath <- file.path(inputSessionFolder, "input.xlsx")
    paramsFilePath <- file.path(inputSessionFolder, "params.json")

    params <- list(
      id = id,
      cohort = cohort,
      originalFileName = originalFileName,
      email = email
    )
    write_json(params, paramsFilePath)

    workerType <- Sys.getenv("WORKER_TYPE")
    # logger$info(paste0("Launched All Models worker: ", workerType))
    if (workerType == "fargate") {
      svc <- ecs()
      svc$run_task(
        cluster = Sys.getenv("ECS_CLUSTER"),
        count = 1,
        launchType = "FARGATE",
        networkConfiguration = list(
          awsvpcConfiguration = list(
            securityGroups = as.list(unlist(strsplit(Sys.getenv("SECURITY_GROUP_IDS"), ","))),
            subnets = as.list(unlist(strsplit(Sys.getenv("SUBNET_IDS"), ",")))
          )
        ),
        taskDefinition = Sys.getenv("WORKER_TASK_NAME"),
        overrides = list(
          containerOverrides = list(
            list(
              name = "worker",
              command = list("Rscript", "worker.R", id)
            )
          )
        )
      )
    } else {
      system(paste0("Rscript worker.R ", id), wait = FALSE)
    }

    list(queue = T)
  })
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

  # meta analysis (queue models)
  else if (method == "metaAnalysis") {
    return(runAllModels(req, res))
  }

  res$status <- 400
  list(
    error = "Invalid method specified"
  )
}


#* Runs meta-analysis across multiple files
#*
#* @post /runMetaAnalysis
#*
#* @parser multi
#* @serializer unboxedJSON list(force=T, na="null")
#*
runMetaAnalysis <- function(req, res) {
  id <- plumber::random_cookie_key()
  
  # Log raw request structure for debugging
  # logger$info("=== Meta-Analysis Submission Received ===")
  # logger$info(sprintf("Session ID: %s", id))
  
  # Get content type and log all headers for debugging
  content_type <- req$headers[['content-type']] %||% "unknown"
  # logger$info(sprintf("Request Content-Type: %s", content_type))
  # logger$info(sprintf("All headers: %s", paste(names(req$headers), "=", req$headers, collapse = "; ")))
  
  # Check if multipart parsing worked
  if (is.null(req$body) || length(req$body) == 0) {
    logger$error("Request body is empty or NULL - multipart parsing failed")
    res$status <- 400
    return(list(error = "No data received - multipart parsing failed", 
                debug = list(content_type = content_type, 
                           headers = req$headers)))
  }
  
  # Log the request body structure
  # logger$info(sprintf("Request body class: %s", class(req$body)))
  # logger$info(sprintf("Request body length: %d", length(req$body)))
  # logger$info(sprintf("Request body names: %s", paste(names(req$body), collapse = ", ")))
  
  # Try to process the body
  tryCatch({
    # logger$info("=== EMAIL EXTRACTION DEBUG START ===")
    
    # For multipart data, the email field contains raw bytes that need conversion
    email <- req$body$email
    # logger$info(sprintf("Raw email field - class: %s", class(email)))
    
    if (is.list(email) && "value" %in% names(email)) {
      email_raw <- email[["value"]]
      # logger$info(sprintf("Email value field - class: %s", class(email_raw)))
      
      # Convert raw bytes to character string
      if (class(email_raw) == "raw") {
        email <- rawToChar(email_raw)
        # logger$info(sprintf("Converted raw bytes to string: '%s'", email))
      } else if (is.character(email_raw)) {
        email <- email_raw
        # logger$info(sprintf("Email was already character: '%s'", email))
      } else {
        email <- as.character(email_raw)
        # logger$info(sprintf("Converted to character: '%s'", email))
      }
    } else {
      email <- as.character(email)
      # logger$info(sprintf("Fallback conversion: '%s'", email))
    }
    
    # Ensure we have a clean email string
    if (is.null(email) || is.na(email) || email == "NULL" || nchar(email) == 0) {
      email <- ""
      logger$warning("Email is empty after extraction")
    }
    
    # logger$info(sprintf("=== FINAL EMAIL: '%s' ===", email))
    
    # logger$info(sprintf("Email: %s", ifelse(nchar(email) == 0, "EMPTY", email)))
    
    # Count potential file fields
    fileFields <- names(req$body)[names(req$body) != "email"]
    # logger$info(sprintf("File field names: %s", paste(fileFields, collapse = ", ")))
    
    # Continue with the meta-analysis processing
    
  }, error = function(e) {
    logger$error(sprintf("Error processing request body: %s", e$message))
    res$status <- 500
    return(list(error = paste("Error processing request:", e$message)))
  })
  
  future({
    shouldLog # inject globals (needed since shouldLog is not in the future scope)
    
    # Use the same email handling as runAllModels - simple and direct
    email_val <- email  # Use the email already extracted above
    # logger$info(sprintf("Processing with email: %s", email_val))
    
    # logger$info(sprintf("Final email_val: '%s'", email_val))

    # Create input and output session folders
    inputSessionFolder <- file.path(Sys.getenv("SESSION_FOLDER"), "input", id)
    outputSessionFolder <- file.path(Sys.getenv("SESSION_FOLDER"), "output", id)
    dir.create(inputSessionFolder, recursive = TRUE)
    dir.create(outputSessionFolder, recursive = TRUE)
    
    # Create input and output subfolders
    inputFolder <- file.path(inputSessionFolder, "files")
    outputFolder <- file.path(outputSessionFolder, "results")
    dir.create(inputFolder, recursive = TRUE)
    dir.create(outputFolder, recursive = TRUE)
    
    # Save uploaded files to input folder
    files <- req$body
    
    # Debug: log the structure of req$body
    # logger$info(sprintf("Request body structure: %s", paste(names(files), collapse = ", ")))
    
    # Enhanced debugging for multipart file parsing
    # logger$info("=== DETAILED MULTIPART PARSING DEBUG ===")
    for (name in names(files)) {
      obj <- files[[name]]
      # logger$info(sprintf("Field '%s': class=%s, length=%s", name, class(obj), length(obj)))
      
      if (is.list(obj)) {
        # logger$info(sprintf("  List elements: %s", paste(names(obj), collapse = ", ")))
        if ("filename" %in% names(obj)) {
          # logger$info(sprintf("  Filename: '%s'", obj$filename))
        }
        if ("value" %in% names(obj) && is.raw(obj$value)) {
          # logger$info(sprintf("  Value size: %d bytes", length(obj$value)))
        }
      } else if (is.character(obj)) {
        # logger$info(sprintf("  Character value: '%s'", obj))
      }
    }
    # logger$info("========================================")
    
    # Find all file objects - look for fields that start with "metaAnalysisFile" (unique field names)
    savedFiles <- c()
    fileCount <- 0
    processedFiles <- character(0)  # Track filenames to avoid duplicates
    
    # Process files with unique field names (metaAnalysisFile_1, metaAnalysisFile_2, etc.)
    for (fieldName in names(files)) {
      # Skip email field and look for file fields
      if (fieldName != "email" && (fieldName == "metaAnalysisFiles" || startsWith(fieldName, "metaAnalysisFile"))) {
        fileObj <- files[[fieldName]]
        # logger$info(sprintf("Processing field: %s, type: %s", fieldName, class(fileObj)))
        
        if (!is.null(fileObj)) {
          # Check if it's a file object with filename and value
          if (!is.null(fileObj$filename) && !is.null(fileObj$value)) {
            # logger$info(sprintf("Found file object - Name: '%s', Size: %d bytes, Modified: %s", 
            #                    fileObj$filename, 
            #                    length(fileObj$value),
            #                    ifelse(is.null(fileObj$lastModified), "unknown", fileObj$lastModified)))
            
            # Check for duplicate filenames and create unique names if needed
            # For meta-analysis, we need to follow the COMETS naming convention:
            # <model name>__<cohort name>__<date>.xlsx
            
            # Extract the base filename without extension
            fileExt <- tools::file_ext(fileObj$filename)
            baseName <- tools::file_path_sans_ext(fileObj$filename)
            
            # Create COMETS-compatible filename
            # Use a generic model name and the base filename as cohort
            currentDate <- format(Sys.Date(), "%Y%m%d")
            cometsFilename <- sprintf("AllModels__%s__%s.%s", baseName, currentDate, fileExt)
            
            # logger$info(sprintf("Processing file: %s -> attempting filename: %s", fileObj$filename, cometsFilename))
            # logger$info(sprintf("Current processedFiles: %s", paste(processedFiles, collapse = ", ")))
            
            # Check for duplicates and create unique names if needed
            uniqueFilename <- cometsFilename
            counter <- 1
            while (uniqueFilename %in% processedFiles) {
              # If there's a conflict, add counter to the base name (cohort name)
              uniqueFilename <- sprintf("AllModels__%s_%d__%s.%s", baseName, counter, currentDate, fileExt)
              counter <- counter + 1
              # logger$info(sprintf("Filename conflict detected for '%s', creating unique name: %s", baseName, uniqueFilename))
            }
            
            fileCount <- fileCount + 1
            processedFiles <- c(processedFiles, uniqueFilename)
            # logger$info(sprintf("Final filename: %s, processedFiles now: %s", uniqueFilename, paste(processedFiles, collapse = ", ")))
            
            # Save file to input folder using the unique filename
            filePath <- file.path(inputFolder, uniqueFilename)
            writeBin(fileObj$value, filePath)
            savedFiles <- c(savedFiles, filePath)
            # logger$info(sprintf("Successfully saved file #%d: %s (original: %s) - %d bytes", 
            #                    fileCount, uniqueFilename, fileObj$filename, length(fileObj$value)))
          } else {
            # logger$info(sprintf("Field %s is not a file object (missing filename or value)", fieldName))
          }
        } else {
          # logger$info(sprintf("Field %s is NULL", fieldName))
        }
      }
    }
    
    if (fileCount < 2) {
      logger$error(sprintf("Found %d files, need at least 2. Saved files: %s", 
                          fileCount, paste(basename(savedFiles), collapse = ", ")))
      stop("Meta-analysis requires at least 2 files")
    }
    
    # logger$info(sprintf("Running meta-analysis with %d files", length(savedFiles)))
    
    # Create options file path (optional parameter for runAllMeta)
    opfile <- NULL  # Can be modified to pass custom options if needed
    
    # Run comprehensive meta-analysis using the improved workflow
    tryCatch({
      # logger$info(sprintf("Starting comprehensive meta-analysis with %d files", length(savedFiles)))
      
      # Step 1: Read COMETS input files
      # logger$info("Step 1: Reading COMETS input files...")
      data_list <- list()
      cohort_names <- c()
      
      for (i in seq_along(savedFiles)) {
        file_path <- savedFiles[i]
        # Extract cohort name from filename (remove AllModels__ prefix and date suffix)
        cohort_name <- sub("^AllModels__", "", basename(file_path))
        cohort_name <- sub("__\\d{8}\\.xlsx$", "", cohort_name)  # Remove date and extension
        # Don't remove _1, _2 suffixes as they're part of cohort names like cohort_1, cohort_2
        
        # logger$info(sprintf("Reading file %d: %s (cohort: %s)", i, basename(file_path), cohort_name))
        data_list[[i]] <- RcometsAnalytics::readCOMETSinput(file_path)
        cohort_names[i] <- cohort_name
      }
      
      # Step 2: Build model specifications (using Interactive model as in your example)
      logger$info("Step 2: Building model specifications...")
      modeldata_list <- list()
      
      for (i in seq_along(data_list)) {
        logger$info(sprintf("Building model for cohort %s", cohort_names[i]))
        modeldata_list[[i]] <- RcometsAnalytics::getModelData(
          data_list[[i]], 
          modelspec = "Interactive", 
          exposures = "age", 
          outcomes = NULL, 
          adjvars = "bmi_grp"
        )
      }
      
      # Step 3: Run individual cohort analyses
      logger$info("Step 3: Running individual cohort analyses...")
      results_list <- list()
      
      for (i in seq_along(data_list)) {
        logger$info(sprintf("Running model for cohort %s", cohort_names[i]))
        results_list[[i]] <- RcometsAnalytics::runModel(
          modeldata_list[[i]], 
          data_list[[i]], 
          cohort_names[i], 
          op = list(model = "lm")
        )
      }
      
      # Step 4: Save intermediate results in COMETS format
      logger$info("Step 4: Saving intermediate results...")
      output_files <- c()
      model_name <- "AgeAdjustedForBMI"  # Following your example
      
      for (i in seq_along(results_list)) {
        logger$info(sprintf("Saving results for cohort %s", cohort_names[i]))
        
        # Get options for this cohort
        op <- RcometsAnalytics:::runAllModels.getOptions(data_list[[i]])
        
        # Write to output session folder with trailing slash
        session_dir_with_slash <- paste0(outputSessionFolder, "/")
        RcometsAnalytics:::writeObjectToFile(
          results_list[[i]], 
          cohort_names[i], 
          model_name, 
          op, 
          dir = session_dir_with_slash
        )
        
        # Find the written file
        pattern <- sprintf("^%s__%s__.*\\.(xlsx|rda)$", model_name, cohort_names[i])
        written_file <- list.files(
          outputSessionFolder, 
          pattern = pattern, 
          full.names = TRUE, 
          ignore.case = TRUE
        )
        
        if (length(written_file) > 0) {
          output_files[i] <- written_file[1]
          logger$info(sprintf("Saved intermediate file: %s", basename(written_file[1])))
        } else {
          stop(sprintf("Failed to find written file for cohort %s with pattern %s", cohort_names[i], pattern))
        }
      }
      
      # Step 5: Run meta-analysis on intermediate results
      logger$info("Step 5: Running meta-analysis...")
      logger$info(sprintf("Meta-analysis input files: %s", paste(basename(output_files), collapse = ", ")))
      
      meta_results <- RcometsAnalytics::runMeta(output_files)
      
      # Step 6: Extract and process meta-analysis results
      logger$info("Step 6: Processing meta-analysis results...")
      
      # Helper function to safely extract tables
      get_ret_tbl <- function(x, choices) {
        nm <- intersect(choices, names(x))
        if (length(nm)) x[[nm[1]]] else NULL
      }
      
      meta_tbl <- get_ret_tbl(meta_results, c("Results", "Metaresults"))
      errors_tbl <- get_ret_tbl(meta_results, c("Errors_Warnings", "Error_Warnings", "ErrorsWarnings"))
      info_tbl <- get_ret_tbl(meta_results, c("Info", "INFO", "info"))
      
      logger$info(sprintf("Meta-analysis completed. Results table has %d rows", 
                         if (!is.null(meta_tbl)) nrow(meta_tbl) else 0))
      
      # Step 7: Add metabolite annotations
      logger$info("Step 7: Adding metabolite annotations...")
      
      # Combine all metabolite data
      allmetab <- do.call(rbind, lapply(data_list, function(d) d$metab))
      uid_col <- intersect(c("uid_01", "uid"), colnames(allmetab))[1]
      
      if (!is.null(uid_col) && !is.null(meta_tbl)) {
        uniquemetab <- allmetab[!duplicated(allmetab[[uid_col]]), 
                               intersect(colnames(allmetab), 
                                       c(uid_col, "metabolite_name", "super_pathway", "sub_pathway", "pubchem"))]
        
        # Add annotations to meta results
        meta_df <- as.data.frame(meta_tbl)
        if ("outcome_uid" %in% colnames(meta_df)) {
          names(uniquemetab)[names(uniquemetab) == uid_col] <- "outcome_uid"
          meta_df <- merge(meta_df, uniquemetab, by = "outcome_uid", all.x = TRUE)
          
          # Add visualization metrics
          meta_df$log10p <- -log10(pmax(meta_df$fixed.pvalue, .Machine$double.xmin))
          meta_df$hetp <- ifelse(meta_df$het.pvalue < 0.05, "hetp<0.05", "hetp ns")
          
          logger$info("Successfully added metabolite annotations")
        }
      }
      
      # Step 8: Save final results
      logger$info("Step 8: Saving final results...")
      
      # Save main meta-analysis results
      meta_output_file <- file.path(outputFolder, sprintf("%s__meta__%s.xlsx", model_name, Sys.Date()))
      
      if (!is.null(meta_tbl)) {
        # Use openxlsx to save the results
        wb <- createWorkbook()
        addWorksheet(wb, "Results")
        
        # Check if we have the enhanced meta_df with annotations
        if (!is.null(uid_col) && "outcome_uid" %in% colnames(as.data.frame(meta_tbl))) {
          writeData(wb, "Results", meta_df)
        } else {
          writeData(wb, "Results", as.data.frame(meta_tbl))
        }
        
        saveWorkbook(wb, meta_output_file, overwrite = TRUE)
        logger$info(sprintf("Saved meta-analysis results to: %s", basename(meta_output_file)))
      }
      
      # Save additional tables if they exist
      if (!is.null(errors_tbl)) {
        errors_file <- file.path(outputFolder, sprintf("%s__meta_errors__%s.csv", model_name, Sys.Date()))
        write.csv(as.data.frame(errors_tbl), errors_file, row.names = FALSE)
        logger$info(sprintf("Saved errors table to: %s", basename(errors_file)))
      }
      
      if (!is.null(info_tbl)) {
        info_file <- file.path(outputFolder, sprintf("%s__meta_info__%s.csv", model_name, Sys.Date()))
        write.csv(as.data.frame(info_tbl), info_file, row.names = FALSE)
        logger$info(sprintf("Saved info table to: %s", basename(info_file)))
      }
      
      logger$info("Comprehensive meta-analysis completed successfully")
      
      # Create zip file with results
      outputFile <- file.path(outputSessionFolder, "output.zip")
      if (length(list.files(outputFolder)) > 0) {
        zip::zip(outputFile, list.files(outputFolder, full.names = TRUE), mode = "cherry-pick")
        logger$info(sprintf("Results archived: %s", outputFile))
        
        # Upload to S3 (following same pattern as processor.R)
        tryCatch({
          awsConfig <- getAwsConfig()
          if (!is.null(awsConfig) && length(awsConfig) > 0 && Sys.getenv("S3_BUCKET") != "") {
            s3 <- paws::s3(config = awsConfig)
            s3FilePath <- paste0(Sys.getenv("S3_OUTPUT_KEY_PREFIX"), id, "/output.zip")
            
            s3$put_object(
              Body = outputFile,
              Bucket = Sys.getenv("S3_BUCKET"),
              Key = s3FilePath
            )
            logger$info(sprintf("Uploaded meta-analysis results to S3: %s", s3FilePath))
          }
        }, error = function(e) {
          logger$warn(sprintf("S3 upload failed (non-critical): %s", e$message))
        })
      }
      
      # Send success email if provided
      if (!is.null(email_val) && nchar(email_val) > 0) {
        tryCatch({
          logger$info(sprintf("Attempting to send success email to: %s", email_val))
          
          # Check if AWS credentials are available
          awsConfig <- getAwsConfig()
          if (is.null(awsConfig) || length(awsConfig) == 0) {
            logger$warn("AWS credentials not configured - skipping email")
          } else {
            # Setup AWS SES for email sending
            ses <- paws::sesv2(config = awsConfig)
            
            # Generate success email using template (same pattern as processor.R)
            template <- readLines(file.path("email-templates", "user-success.html"))
            templateData <- list(
              originalFileName = "Meta-Analysis Files",
              resultsUrl = paste0(Sys.getenv("EMAIL_BASE_URL"), "/api/metaAnalysisResults/", id),
              totalProcessingTime = "N/A",
              modelResults = list(list(
                modelName = "Meta-Analysis",
                processingTime = "N/A",
                hasWarnings = FALSE,
                hasErrors = FALSE,
                warnings = "",
                errors = ""
              ))
            )
            
            emailSubject <- "COMETS Analytics Meta-Analysis Results"
            emailBody <- whisker::whisker.render(template, templateData)
            
            sendEmail(
              sesv2 = ses,
              from = Sys.getenv("EMAIL_SENDER"),
              to = email_val,
              subject = emailSubject,
              body = emailBody
            )
            logger$info(sprintf("Success email sent to: %s", email_val))
          }
        }, error = function(e) {
          logger$warn(sprintf("Email sending failed (non-critical): %s", e$message))
        })
      }
      
    }, error = function(e) {
      logger$error(sprintf("Meta-analysis failed: %s", e$message))
      
      # Send failure email if provided
      if (!is.null(email_val) && nchar(email_val) > 0) {
        tryCatch({
          logger$info(sprintf("Attempting to send failure email to: %s", email_val))
          
          # Check if AWS credentials are available
          awsConfig <- getAwsConfig()
          if (is.null(awsConfig) || length(awsConfig) == 0) {
            logger$warn("AWS credentials not configured - skipping failure email")
          } else {
            # Setup AWS SES for email sending
            ses <- paws::sesv2(config = awsConfig)
            
            # Send user failure email
            sendEmail(
              sesv2 = ses,
              from = Sys.getenv("EMAIL_SENDER"),
              to = email_val,
              subject = "COMETS Analytics Meta-Analysis Results - Error",
              body = whisker::whisker.render(
                readLines(file.path("email-templates", "user-failure.html")),
                list(
                  originalFileName = "Meta-Analysis Files"
                )
              )
            )
            logger$info(sprintf("Failure email sent to: %s", email_val))
            
            # Send admin failure email
            sendEmail(
              sesv2 = ses,
              from = Sys.getenv("EMAIL_SENDER"),
              to = Sys.getenv("EMAIL_ADMIN"),
              subject = "COMETS Analytics Meta-Analysis Results - Error",
              body = whisker::whisker.render(
                readLines(file.path("email-templates", "admin-failure.html")),
                list(
                  originalFileName = "Meta-Analysis Files",
                  email = email_val,
                  cohort = "Meta-Analysis",
                  error = e$message
                )
              )
            )
            logger$info(sprintf("Admin failure email sent to: %s", Sys.getenv("EMAIL_ADMIN")))
          }
        }, error = function(e2) {
          logger$warn(sprintf("Failed to send failure email (non-critical): %s", e2$message))
        })
      }
      
      stop(e$message)
    })
    
    list(
      queue = TRUE,
      id = id,
      message = sprintf("Meta-analysis queued with %d files", length(savedFiles))
    )
  })
}

#* Retrieves an s3 url for batch results
#*
#* @get /batchResults/<id>
#* @serializer contentType list(type="application/zip")
#*
getBatchResults <- function(req, res) {
  id <- sanitize(req$args$id)
  outputFile <- file.path(Sys.getenv("SESSION_FOLDER"), "output", id, "output.zip")
  res$setHeader("Content-Disposition", 'attachment; filename="comets_results.zip"')
  readBin(outputFile, "raw", n = file.info(outputFile)$size)
}

#* Retrieves results for meta-analysis
#*
#* @get /metaAnalysisResults/<id>
#* @serializer contentType list(type="application/zip")
#*
getMetaAnalysisResults <- function(req, res) {
  id <- sanitize(req$args$id)
  outputFile <- file.path(Sys.getenv("SESSION_FOLDER"), "output", id, "output.zip")
  
  # First try local file
  if (file.exists(outputFile)) {
    logger$info(sprintf("Serving local meta-analysis results: %s", outputFile))
    res$setHeader("Content-Disposition", 'attachment; filename="meta_analysis_results.zip"')
    return(readBin(outputFile, "raw", n = file.info(outputFile)$size))
  }
  
  # If not found locally, try S3 download (same pattern as batch results)
  tryCatch({
    logger$info(sprintf("Local file not found, attempting S3 download for session: %s", id))
    
    awsConfig <- getAwsConfig()
    if (is.null(awsConfig) || length(awsConfig) == 0 || Sys.getenv("S3_BUCKET") == "") {
      logger$warn("AWS not configured - cannot download from S3")
      res$status <- 404
      return(list(error = "Meta-analysis results not found"))
    }
    
    s3 <- paws::s3(config = awsConfig)
    s3FilePath <- paste0(Sys.getenv("S3_OUTPUT_KEY_PREFIX"), id, "/output.zip")
    
    s3Object <- s3$get_object(
      Bucket = Sys.getenv("S3_BUCKET"),
      Key = s3FilePath
    )
    
    logger$info(sprintf("Successfully downloaded meta-analysis results from S3: %s", s3FilePath))
    res$setHeader("Content-Disposition", 'attachment; filename="meta_analysis_results.zip"')
    return(s3Object$Body)
    
  }, error = function(e) {
    logger$error(sprintf("Error retrieving meta-analysis results for session %s: %s", id, e$message))
    res$status <- 404
    return(list(error = "Meta-analysis results not found", message = e$message))
  })
}


getHeatmap <- function(effects) {
  heatmap <- list()

  x <- "term"
  y <- "outcomespec"
  z <- "estimate"

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
