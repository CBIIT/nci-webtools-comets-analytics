install.packages(
  c(
    "future",
    "jsonlite",
    "jsonlite",
    "magrittr",
    "paws",
    "plumber",
    "remotes",
    "uuid"
  ),
  repos = "https://cloud.r-project.org/"
)

remotes::install_github(
  "CBIIT/R-cometsAnalytics/RPackageSource",
  ref = "wheelerb",
  upgrade = "never"
)
