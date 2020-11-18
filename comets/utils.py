from configparser import ConfigParser
from jinja2 import Template
from os import path, walk
from threading import Thread
from time import sleep
from traceback import print_exc
from uuid import uuid4
from zipfile import ZipFile
import json


class IntervalThread(Thread):
    def __init__(self, target=None, args=(), kwargs={}, interval=1):
        super().__init__(target=target, args=args, kwargs=kwargs)
        self._is_stopped = False
        self._interval = interval

    def run(self):
        while not self._is_stopped:
            self._target(*self._args, **self._kwargs)
            sleep(self._interval)

    def stop(self):
        self._is_stopped = True


def receive_message(
    client, queue_url, message_handler, visibility_timeout=30, poll_interval=60
):
    # receive only one message at a time to simplify running parallel workers
    response = client.receive_message(
        QueueUrl=queue_url,
        MaxNumberOfMessages=1,
        VisibilityTimeout=visibility_timeout,
        WaitTimeSeconds=20,
    )

    for message in response.get("Messages", []):
        refresh_visibility = IntervalThread(
            interval=visibility_timeout - 1,
            target=client.change_message_visibility,
            kwargs={
                "ReceiptHandle": message["ReceiptHandle"],
                "QueueUrl": queue_url,
                "VisibilityTimeout": visibility_timeout,
            },
        )
        try:
            refresh_visibility.start()
            message_handler(message["Body"])
        except Exception as exception:
            print_exc()
        finally:
            refresh_visibility.stop()
            client.delete_message(
                QueueUrl=queue_url, ReceiptHandle=message["ReceiptHandle"]
            )

    sleep(poll_interval)
    receive_message(
        client, queue_url, message_handler, visibility_timeout, poll_interval
    )


def queue_file(
    s3_client, sqs_client, bucket, key_prefix, filepath, queue_url, queue_params={}
):
    message_id = str(uuid4())
    key = key_prefix + message_id

    s3_client.upload_file(Filename=filepath, Bucket=bucket, Key=key)

    queue_params.update(
        {
            "message_id": message_id,
            "bucket": bucket,
            "key": key,
            "filename": queue_params.get("filename", path.basename(filepath)),
        }
    )

    sqs_client.send_message(
        QueueUrl=queue_url,
        MessageBody=json.dumps(queue_params),
        MessageDeduplicationId=message_id,
        MessageGroupId=message_id,
    )


def render_template(filepath, data):
    """ Renders a template given a filepath and template variables """
    with open(filepath) as template_file:
        template = Template(template_file.read())
        return template.render(data)


def send_email(client, sender, recipients, subject, body):
    if not type(recipients) is list:
        recipients = recipients.split(",")

    return client.send_email(
        FromEmailAddress=sender,
        Destination={"ToAddresses": recipients},
        Content={
            "Simple": {
                "Subject": {
                    "Charset": "UTF-8",
                    "Data": subject,
                },
                "Body": {
                    "Html": {
                        "Charset": "UTF-8",
                        "Data": body,
                    },
                },
            }
        },
    )


def zip_directory(directory, zip_filepath):
    with ZipFile(zip_filepath, "w") as output_zip:
        for root, directories, files in walk(directory):
            for filename in files:
                output_zip.write(path.join(root, filename), filename)
