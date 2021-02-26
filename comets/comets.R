call_with_handlers <- function(func, ...) {
  errors <- c()
  warnings <- c()
  list(
    output = tryCatch(
      withCallingHandlers(
        func(...),
        warning = function(x) warnings <<- c(warnings, x$message)
      ),
      error = function(x) errors <<- c(errors, x$message)
    ),
    errors = errors, 
    warnings = warnings
  )
}

run_batch_models <- function(filepath, output_folder="tmp", cohort="") {
    # verify input file
    integrity_check_results <- call_with_handlers(COMETS::readCOMETSinput, filepath)

    if (length(integrity_check_results$errors > 0))
        return(integrity_check_results)

    comets_input <- integrity_check_results$output
    input_summary <- COMETS::runDescrip(comets_input)

    # write original input file (minus unused sheets) to output folder
    workbook = openxlsx::loadWorkbook(filepath)
    for (sheet in names(workbook)) {
        if (!sheet %in% c("Metabolites","VarMap","Models"))
          openxlsx::removeWorksheet(workbook, sheet=sheet)
    }
    openxlsx::saveWorkbook(
        workbook, 
        file.path(output_folder, paste0("input", ".xlsx")),
        overwrite=TRUE
    )

    # write harmonization results to output folder
    COMETS::OutputCSVResults(
        filename=file.path(output_folder, "harmonization"),
        dataf=comets_input$metab,
        cohort=cohort
    )

    # write input summary to output folder
    COMETS::OutputXLSResults(
        filename=file.path(output_folder, "summary"), 
        datal=input_summary, 
        cohort=cohort
    )

    # run all models and save results to output folder
    model_results <- Map(function(model_name) {
        model_data <- COMETS::getModelData(
            comets_input,
            modelspec="Batch",
            modlabel=model_name
        )

        result <- call_with_handlers(
            COMETS::runCorr, 
            model_data,
            comets_input,
            cohort
        )

        csv <- COMETS::OutputCSVResults(
            file.path(output_folder, model_name),
            result$output,
            cohort
        )

        list(
            model_name=model_name,
            processing_time=attr(result$output, "ptime"),
            warnings=I(result$warnings),
            errors=I(result$errors),
            csv=csv
        )
    }, comets_input$mods$model)

    unname(model_results)
}