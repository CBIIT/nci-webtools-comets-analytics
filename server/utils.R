

callWithHandlers <- function(func, ...) {
  errors <- c()
  warnings <- c()
  list(
    output = tryCatch(
      withCallingHandlers(
        func(...),
        warning = function(x) warnings <<- c(warnings, x$message)
      ),
      error = function(x) {
        errors <<- c(errors, x$message)
        NULL
      }
    ),
    errors = errors,
    warnings = warnings
  )
}
