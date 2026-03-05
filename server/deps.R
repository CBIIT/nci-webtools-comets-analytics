library(dotenv)
library(future)
library(jsonlite)
library(openxlsx)
library(paws)
library(plumber)

# Load reshape2 BEFORE RcometsAnalytics
library(reshape2)
library(RcometsAnalytics)

# Patch data.table's melt.default to always use reshape2::melt for data.frames
# This fixes the deprecation error in data.table 1.16+
if (requireNamespace("data.table", quietly = TRUE)) {
  # Replace data.table's melt.default with reshape2's version
  assignInNamespace(
    "melt.default",
    function(data, ...) {
      if (is.data.frame(data)) {
        reshape2::melt(data, ...)
      } else {
        reshape2::melt(data, ...)
      }
    },
    ns = "data.table"
  )
}

library(whisker)
library(zip)
library(Hmisc)
library(RaMP) # ncats/RaMP-DB@sqlite