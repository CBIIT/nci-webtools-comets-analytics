library(dotenv)
library(plumber)
library(jsonlite)

options_plumber(trailingSlash = T)
port <- as.numeric(Sys.getenv("SERVER_PORT"))

pr() |>
  pr_mount("/api", pr("comets.R")) |>
  pr_set_docs(FALSE) |>
  pr_set_debug(TRUE) |>
  pr_run(host = "0.0.0.0", port = port)
