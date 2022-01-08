Sys.setenv("R_REMOTES_NO_ERRORS_FROM_WARNINGS", "true")

install.packages(
  c(
    "dotenv",
    "future",
    "jsonlite",
    "openxlsx",
    "paws",
    "plumber",
    "remotes",
    "styler",
    "whisker",
    "zip"
  ),
  repos = "https://cloud.r-project.org/"
)

remotes::install_bioc("Biobase")

remotes::install_github(
  "CBIIT/R-cometsAnalytics/RPackageSource",
  ref = "v2.0.0-dev",
  upgrade = "never"
)
