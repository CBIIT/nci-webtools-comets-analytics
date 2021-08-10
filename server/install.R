install.packages(
  c(
    "future",
    "jsonlite",
    "paws",
    "plumber",
    "remotes",
    "uuid"
  ),
  repos = "https://cloud.r-project.org/"
)

remotes::install_bioc("Biobase")

remotes::install_github(
  "CBIIT/R-cometsAnalytics/RPackageSource",
  ref = "v2.0",
  upgrade = "never"
)
