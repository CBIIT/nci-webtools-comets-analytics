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
  ref = "master",
  upgrade = "never"
)
