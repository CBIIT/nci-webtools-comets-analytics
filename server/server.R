library(plumber)
library(jsonlite)

options_plumber(trailingSlash = T)
config <- read_json("config.json")

pr() |>
  pr_mount("/api", pr("comets.R")) |>
  pr_set_docs(FALSE) |>
  pr_set_debug(TRUE) |>
  pr_run(host = "0.0.0.0", port = config$server$port)
