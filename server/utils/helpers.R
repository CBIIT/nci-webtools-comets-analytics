
sanitize <- function(str) {
  gsub("[^[:alnum:][:space:]_,-.]+", "", str)
}

callWithHandlers <- function(func, ...) {
  output <- NULL
  errors <- c()
  warnings <- c()

  capturedOutput <- capture.output(invisible(
    output <- tryCatch(
      withCallingHandlers(
        func(...),
        warning = function(x) {
          warnings <<- c(warnings, x$message)
        }
      ),
      error = function(x) {
        errors <<- c(errors, x$message)
        NULL
      }
    )
  ))

  list(
    output = output,
    capturedOutput = capturedOutput,
    warnings = warnings,
    errors = errors
  )
}
