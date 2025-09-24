library(dotenv)
library(plumber)
library(jsonlite)

options_plumber(trailingSlash = T)
port <- as.numeric(Sys.getenv("SERVER_PORT"))

# Configure multipart parser for large files
options(plumber.maxRequestSize = 100 * 1024^2)  # 100MB limit

# Create the plumber API with custom multipart parser
api <- pr("comets.R")

# Register a custom multipart parser if needed
api$registerHook("preroute", function(data, req, res) {
  # Log Content-Type for debugging
  cat("Content-Type:", req$headers[['content-type']] %||% "missing", "\n")
})

pr() |>
  pr_mount("/api", api) |>
  pr_set_docs(FALSE) |>
  pr_set_debug(TRUE) |>
  pr_run(host = "0.0.0.0", port = port)
