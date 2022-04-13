
getAwsConfig <- function() {
  region <- Sys.getenv("AWS_REGION")
  accessKeyId <- Sys.getenv("AWS_ACCESS_KEY_ID")
  secretAccessKey <- Sys.getenv("AWS_SECRET_ACCESS_KEY")

  serviceConfig <- list(region = region)

  if (accessKeyId != "" && secretAccessKey != "") {
    serviceConfig$credentials <- list(
      creds = list(
        access_key_id = accessKeyId,
        secret_access_key = secretAccessKey
      )
    )
  }

  serviceConfig
}
