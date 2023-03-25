
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

sendEmail <- function(sesv2, from, to, subject, body) {
  sesv2$send_email(
    FromEmailAddress = from,
    Destination = list(
      ToAddresses = to
    ),
    Content = list(
      Simple = list(
        Subject = list(
          Data = subject,
          Charset = "UTF-8"
        ),
        Body = list(
          Html = list(
            Data = body,
            Charset = "UTF-8"
          )
        )
      )
    )
  )
}