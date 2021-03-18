from configparser import ConfigParser
from os import path, makedirs
from tempfile import TemporaryDirectory
from time import time
from datetime import datetime
from traceback import format_exc
import boto3
import json
import logging
from logging.handlers import TimedRotatingFileHandler
import r_functions
from utils import (
    render_template,
    receive_message,
    send_email,
    zip_directory,
)

config = ConfigParser()
config.read("settings.ini")

s3_client = boto3.client("s3", **config["aws"])
sqs_client = boto3.client("sqs", **config["aws"])
ses_client = boto3.client("sesv2", **config["aws"])

logger = logging.getLogger("comets_queue_processor")

def message_handler(message):
    run_batch_models = r_functions.create("comets.R", "run_batch_models")
    params = json.loads(message)
    logger.info(params)

    with TemporaryDirectory() as temp_dir:
        input_filepath = path.join(temp_dir, path.basename(params["key"]))
        output_dir = path.join(temp_dir, "output")
        makedirs(output_dir)

        s3_client.download_file(
            Bucket=params["bucket"], Key=params["key"], Filename=input_filepath
        )

        s3_client.delete_object(
            Bucket=params["bucket"], Key=params["key"]
        )

        try:
            processing_time = time()

            # retrieve results for all models
            model_results = run_batch_models(
                input_filepath, output_dir, cohort=params["cohort"]
            )

            # record elapsed time
            processing_time = time() - processing_time

            # check if any models have valid results
            has_results = True in (result["errors"] == [] for result in model_results)

            logger.info(model_results)

            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = path.splitext(params["filename"])[0]
            output_filename = f"{filename}.{timestamp}.zip"
            output_filepath = path.join(temp_dir, output_filename)
            output_key = (
                f"{config['s3']['output_key_prefix']}{params['message_id']}/{output_filename}"
            )

            # create archive from output folder
            zip_directory(output_dir, output_filepath)

            logger.info(f"Uploading results to {output_key}")

            s3_client.upload_file(
                Filename=output_filepath, Bucket=config["s3"]["bucket"], Key=output_key
            )

            results_url = f"{params['url_root']}/api/download-batch-results/{params['message_id']}"

            logger.info(f"Sending success email")

            email_body = render_template(
                "email-templates/user-success.html",
                {
                    "filename": params["filename"],
                    "results_url": results_url,
                    "model_results": model_results,
                    "processing_time": processing_time,
                    "has_results": has_results,
                },
            )

            # print(email_body)

            send_email(
                ses_client,
                sender=config["ses"]["sender"],
                recipients=[params["email"]],
                subject=f"COMETS: Batch model results for {params['filename']}",
                body=email_body,
            )

        except Exception as e:
            logger.error(format_exc())
            logger.info(f"Sending failure email")

            # send user failure email
            send_email(
                ses_client,
                sender=config["ses"]["sender"],
                recipients=[params["email"]],
                subject=f"COMETS: Could not generate batch model results for {params['filename']}",
                body=render_template(
                    "email-templates/user-failure.html",
                    {
                        "filename": params["filename"],
                    },
                ),
            )

            # send admin failure email
            send_email(
                ses_client,
                sender=config["ses"]["sender"],
                recipients=[config["ses"]["admin"]],
                subject=f"COMETS: Could not generate batch model results for {params['filename']}",
                body=render_template(
                    "email-templates/admin-failure.html",
                    {
                        "filename": params["filename"],
                        "exception": format_exc(),
                    },
                ),
            )


if __name__ == "__main__":
    makedirs(config['logs']['log_folder'], exist_ok=True)

    log_filepath = path.join(
        config['logs']['log_folder'], 
        "comets_processor.log"
    )

    logging.basicConfig(
        format="%(asctime)s %(message)s", datefmt="%Y-%m-%d %T", level=logging.INFO
    )

    logger.addHandler(
        TimedRotatingFileHandler(log_filepath, "midnight")
    )

    logger.info("Started COMETS processor")

    receive_message(
        client=sqs_client,
        queue_url=config["sqs"]["url"],
        message_handler=message_handler,
        visibility_timeout=int(config["sqs"]["visibility_timeout"]),
        poll_interval=int(config["sqs"]["poll_interval"]),
    )
