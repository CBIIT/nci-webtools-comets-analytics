import json, linecache, os, requests, sys, time, logging
import traceback
from datetime import datetime, timedelta, timezone
from uuid import UUID
from configparser import ConfigParser
import pyper as pr
from pyper import R
import boto3
from flask import Flask, json, jsonify, request, redirect, send_from_directory, Response
from werkzeug.utils import secure_filename

from utils import queue_file, send_email, render_template

app = Flask(__name__, static_url_path="")
app.logger.setLevel(logging.INFO)
app.tmp = "tmp"
os.makedirs(app.tmp, exist_ok=True)

# app.logger.addHandler(logging.handlers.TimedRotatingFileHandler('comets.log','midnight'))

config = ConfigParser()
config.read("settings.ini")
app.config.update(config)

s3_client = boto3.client("s3", **config["aws"])
sqs_client = boto3.client("sqs", **config["aws"])
ses_client = boto3.client("sesv2", **config["aws"])


def loadHtmlTemplates():
    templates = {}
    if os.path.exists("static/templates"):
        for templateFile in os.listdir("static/templates"):
            if templateFile.endswith(".html"):
                with open(os.path.join("static/templates", templateFile), "r") as content_file:
                    content = content_file.read()
                    filename = os.path.splitext(templateFile)[0]
                    templates[filename] = content
    return templates


def loadExcelTemplates():
    r = pr.R()
    r('source("./comets_wrapper.R")')
    r("templates = getTemplates()")
    return {"templates": json.loads(r["templates"])}


def loadCohortList():
    r = pr.R()
    r('source("./comets_wrapper.R")')
    r("cohorts = getCohorts()")
    return {"cohorts": json.loads(r["cohorts"])}

def is_valid_uuid(id):
    try:
        UUID(str(id))
        return True
    except ValueError:
        return False    

app.config["htmlTemplates"] = loadHtmlTemplates()
app.config["excelTemplates"] = loadExcelTemplates()
app.config["cohortList"] = loadCohortList()


def buildFailure(message, statusCode=500):
    response = jsonify(message)
    response.status_code = statusCode
    return response


def buildSuccess(message):
    def generate():
        forOutput = ""
        for chunk in json.JSONEncoder().iterencode(message):
            forOutput += chunk
            if len(forOutput) > 10000:
                yield forOutput
                forOutput = ""
        yield forOutput

    return Response(generate(), status=200)


def timestamp():
    return time.strftime("%Y_%m_%d_%I_%M")


def save_input_file(input_file):
    tmp = app.tmp
    if not os.path.exists(tmp):
        os.makedirs(tmp)

    name, ext = os.path.splitext(input_file.filename)
    filename = "{}_{}{}".format(name, timestamp(), ext.lower())
    filepath = os.path.join(tmp, filename)
    input_file.save(filepath)
    return filename


# heartbeat monitor
@app.route("/cometsRest/public/ping", methods=["GET"])
def ping():
    return buildSuccess({"pong": 1})


@app.route("/tmp/<path:path>", methods=["GET"])
def serve_tmp(path):
    return send_from_directory("tmp", path)


# takes excel workbook as input
@app.route("/cometsRest/integrityCheck", methods=["POST"])
def read_comets_input():
    try:
        input_file = request.files["inputFile"]
        original_filename = input_file.filename
        filename = save_input_file(input_file)
        filepath = os.path.join("tmp", filename)

        app.logger.info("Successfully Uploaded: %s", filename)

        r = R()
        r.filename = filepath
        r.cohort = request.form["cohortSelection"]
        r(
            """   source("./comets_wrapper.R")
                output_file = checkIntegrity(filename, cohort)  """
        )

        with open(r.output_file) as f:
            result = json.load(f)
        os.remove(r.output_file)
        os.remove(filepath)
        del r

        app.logger.info("Finished integrity check for: %s", filename)

        if "error" in result:
            return buildFailure(result["error"])

        else:
            result = result["saveValue"]
            result["filename"] = filename
            result["originalFilename"] = original_filename
            return buildSuccess(result)

    except Exception as e:
        app.logger.error(traceback.format_exc())
        return buildFailure(
            {"status": False, "integritymessage": "An unknown error occurred"}
        )


# takes previously uploaded file and
@app.route("/cometsRest/correlate", methods=["POST"])
def correlate():
    try:
        if not os.path.exists(app.tmp):
            os.makedirs(app.tmp)

        parameters = dict(request.form)
        print(parameters)
        #for field in parameters:
        #    parameters[field] = parameters[field]#[0]#.decode()

        if "outcome" in parameters:
            parameters["outcome"] = json.loads(parameters["outcome"])
            if len(parameters["outcome"]) == 0:
                parameters["outcome"] = None
        if "exposure" in parameters:
            parameters["exposure"] = json.loads(parameters["exposure"])
            if len(parameters["exposure"]) == 0:
                parameters["exposure"] = None
        if "covariates" in parameters:
            parameters["covariates"] = json.loads(parameters["covariates"])
            if len(parameters["covariates"]) == 0:
                parameters["covariates"] = None
        if "strata" in parameters:
            if len(parameters["strata"]) == 0:
                parameters["strata"] = None
            else:
                parameters["strata"] = [parameters["strata"]]
        if "whereQuery" in parameters:
            parameters["whereQuery"] = json.loads(parameters["whereQuery"])
            if len(parameters["whereQuery"]) == 0:
                parameters["whereQuery"] = None
        if parameters["methodSelection"] == "All":
            filename = save_input_file(request.files["inputFile"])
            filepath = os.path.join("tmp", filename)


            queue_file(
                s3_client=s3_client,
                sqs_client=sqs_client,
                bucket=config["s3"]["bucket"],
                key_prefix=config["s3"]["input_key_prefix"],
                filepath=filepath,
                queue_url=config["sqs"]["url"],
                queue_params={
                    "filename": request.files["inputFile"].filename,
                    "cohort": parameters["cohortSelection"],
                    "email": parameters["email"],
                    "url_root": parameters["urlRoot"]
                },
            )

            os.remove(filepath)
            app.logger.info("Queued file %s", filepath)

            return buildFailure(
                {
                    "status": "info",
                    "statusMessage": "The results will be emailed to you.",
                }
            )
        else:
            r = R()
            r('source("./comets_wrapper.R")')
            r.parameters = json.dumps(parameters)
            r("output_file = runModel(parameters)")

            with open(r.output_file) as f:
                result = json.load(f)

            os.remove(r.output_file)
            del r

            if "error" in result:
                return buildFailure(result["error"])

            else:
                if "warnings" in result:
                    result["saveValue"]["warnings"] = result["warnings"]
                return buildSuccess(result["saveValue"])

            app.logger.info("Finished running model")
    except Exception:
        app.logger.error(traceback.format_exc())
        return buildFailure(
            {"status": False, "statusMessage": "An unknown error has occurred."}
        )


@app.route("/cometsRest/combine", methods=["POST"])
def combine():
    try:
        parameters = dict(request.form)
        # for field in parameters:
        #     parameters[field] = parameters[field][0].decode()
        if not os.path.exists("tmp"):
            os.makedirs("tmp")
        timestamp = time.strftime("%Y_%m_%d_%I_%M")
        # abundences
        abundances = request.files["abundances"]
        name, ext = os.path.splitext(abundances.filename)
        filenameA = os.path.join("tmp", "abundances_" + timestamp + ext)
        saveFile = abundances.save(filenameA)
        parameters["abundances"] = filenameA
        if os.path.isfile(filenameA):
            print("Successfully Uploaded Abundances")
        # metadata
        metadata = request.files["metadata"]
        name, ext = os.path.splitext(metadata.filename)
        filenameM = os.path.join("tmp", "metadata_" + timestamp + ext)
        saveFile = metadata.save(filenameM)
        parameters["metadata"] = filenameM
        if os.path.isfile(filenameM):
            print("Successfully Uploaded Metadata")
        # samples
        sample = request.files["sample"]
        name, ext = os.path.splitext(sample.filename)
        filenameS = os.path.join("tmp", "sample_" + timestamp + ext)
        saveFile = sample.save(filenameS)
        parameters["sample"] = filenameS
        if os.path.isfile(filenameS):
            print("Successfully Uploaded Sample")
        r = pr.R()
        r('source("./comets_wrapper.R")')
        r.assign("parameters", json.dumps(parameters))
        r("combine = combineInputs(parameters)")
        returnFile = r["combine"]
        del r
        with open(returnFile) as file:
            result = json.loads(file.read())
        os.remove(returnFile)
        os.remove(filenameA)
        os.remove(filenameM)
        os.remove(filenameS)
        if "error" in result:
            response = buildFailure(result["error"])
        else:
            response = buildSuccess(result["saveValue"])
    except Exception as e:
        exc_type, exc_obj, tb = sys.exc_info()
        f = tb.tb_frame
        lineno = tb.tb_lineno
        filename = f.f_code.co_filename
        linecache.checkcache(filename)
        line = linecache.getline(filename, lineno, f.f_globals)
        print(
            'EXCEPTION IN ({}, LINE {} "{}"): {}'.format(
                filename, lineno, line.strip(), exc_obj
            )
        )
        response = buildFailure(
            {"status": False, "statusMessage": "An unknown error has occurred."}
        )
    finally:
        return response


@app.route("/cometsRest/templates", methods=["GET"])
def templates():
    return jsonify(app.config["htmlTemplates"])


@app.route("/cometsRest/excelTemplates", methods=["GET"])
def excelTemplates():
    return buildSuccess(app.config["excelTemplates"])


@app.route("/cometsRest/public/cohorts", methods=["GET"])
def cohorts():
    return buildSuccess(app.config["cohortList"])


@app.route("/cometsRest/registration/user_metadata", methods=["POST"])
def user_metadata():
    if "auth0" not in app.config:
        return "Not Available", 500

    try:
        parameters = json.loads(request.data)
        data = {
            "app_metadata": {"comets": "active"},
            "user_metadata": {
                "affiliation": parameters["affiliation"],
                "cohort": parameters["cohort"],
                "family_name": parameters["family_name"],
                "given_name": parameters["given_name"],
            },
        }
        url = (
            "https://"
            + app.config["auth0"]["domain"]
            + ".auth0.com/api/v2/users/"
            + parameters["user_id"]
        )
        headers = {
            "Authorization": "Bearer " + app.config["auth0"]["token"],
            "Content-Type": "application/json",
        }
        response = json.loads(
            requests.patch(url, data=json.dumps(data), headers=headers).text
        )
        response["comets"] = "active"
        user = response["user_metadata"]
        email = response["email"]
        send_email(
            ses_client,
            app.config["ses"]["sender"],
            app.config["ses"]["admin"],
            render_template(
                "email-templates/user-registration.html",
                {
                    "email": email,
                    "results_url": user["family_name"],
                    "given_name": user["given_name"],
                    "affiliation": user["affiliation"],
                    "cohort": user["cohort"],
                },
            )
        )
        response = buildSuccess(response)
    except Exception as e:
        exc_type, exc_obj, tb = sys.exc_info()
        f = tb.tb_frame
        lineno = tb.tb_lineno
        filename = f.f_code.co_filename
        linecache.checkcache(filename)
        line = linecache.getline(filename, lineno, f.f_globals)
        print(
            'EXCEPTION IN ({}, LINE {} "{}"): {}'.format(
                filename, lineno, line.strip(), exc_obj
            )
        )
        response = buildFailure(
            {"status": False, "statusMessage": "An unknown error has occurred."}
        )
    finally:
        return response


@app.route("/cometsRest/admin/users", methods=["GET"])
def user_list_get():
    if "auth0" not in app.config:
        return "Not Available", 500

    try:
        # url = "https://"+app.config['auth0.domain']+".auth0.com/api/v2/users?q=comets%3A*%20TO%20*&fields=app_metadata%2Cemail%2Cfamily_name%2Cgiven_name%2Cidentities.connection%2Cuser_id%2Cuser_metadata&include_fields=true&per_page=100&page="
        url = (
            "https://"
            + app.config["auth0"]["domain"]
            + ".auth0.com/api/v2/users?search_engine=v3&per_page=100&page="
        )
        headers = {
            "Authorization": "Bearer " + app.config["auth0"]["token"],
            "Content-Type": "application/json",
        }
        page = 0
        request = json.loads(requests.get(url + str(page), headers=headers).text)
        response = request
        while len(request) == 100:
            page += 1
            request = json.loads(requests.get(url + str(page), headers=headers).text)
            response += request
        response = buildSuccess({"user_list": response})
    except Exception as e:
        exc_type, exc_obj, tb = sys.exc_info()
        f = tb.tb_frame
        lineno = tb.tb_lineno
        filename = f.f_code.co_filename
        linecache.checkcache(filename)
        line = linecache.getline(filename, lineno, f.f_globals)
        print(
            'EXCEPTION IN ({}, LINE {} "{}"): {}'.format(
                filename, lineno, line.strip(), exc_obj
            )
        )
        response = buildFailure(
            {"status": False, "statusMessage": "An unknown error occurred"}
        )
    finally:
        return response


@app.route("/cometsRest/admin/users", methods=["PATCH"])
def user_list_update():
    if "auth0" not in app.config:
        return "Not Available", 500

    try:
        user_list = json.loads(request.data)
        response = []
        for parameters in user_list:
            comets = parameters["app_metadata"]["comets"]
            data = {"app_metadata": {"comets": comets}}
            url = (
                "https://"
                + app.config["auth0"]["domain"]
                + ".auth0.com/api/v2/users/"
                + parameters["user_id"]
            )
            headers = {
                "Authorization": "Bearer " + app.config["auth0"]["token"],
                "Content-Type": "application/json",
            }
            line = json.loads(
                requests.patch(url, data=json.dumps(data), headers=headers).text
            )
            line["comets"] = line["app_metadata"]["comets"]
            response.append(line)
        response = buildSuccess({"user_list": response})
    except Exception as e:
        exc_type, exc_obj, tb = sys.exc_info()
        f = tb.tb_frame
        lineno = tb.tb_lineno
        filename = f.f_code.co_filename
        linecache.checkcache(filename)
        line = linecache.getline(filename, lineno, f.f_globals)
        print(
            'EXCEPTION IN ({}, LINE {} "{}"): {}'.format(
                filename, lineno, line.strip(), exc_obj
            )
        )
        response = buildFailure(
            {"status": False, "statusMessage": "An unknown error occurred"}
        )
    finally:
        return response


@app.route("/api/end-session", methods=["POST"])
def end_session():
    """ Cleans up any files generated during a session """
    app.logger.info("User session has ended")
    for filename in request.get_json(force=True) or []:
        if filename:
            filename = secure_filename(filename)
            filepath = os.path.join("tmp", filename)
            app.logger.info("Cleaning up file %s", filepath)
            if os.path.exists(filepath):
                os.remove(filepath)

    return jsonify(True)
    

@app.route("/api/download-batch-results/<id>", methods=["GET"])
def download_batch_results(id):
    """ Downloads batch results by redirecting to a temporary presigned url """

    if not is_valid_uuid(id):
        return "Please provide a valid identifier.", 400

    s3_objects = s3_client.list_objects_v2(
        Bucket=config["s3"]["bucket"],
        Prefix=f"{config['s3']['output_key_prefix']}{id}/",
    )

    if "Contents" not in s3_objects or not s3_objects["Contents"]:
        return "Your results could not be found.", 400

    s3_object = s3_objects["Contents"][0]
    key = s3_object["Key"]
    last_modified = s3_object["LastModified"]
    expiration_date = last_modified + timedelta(days = 7)

    if datetime.now(tz=timezone.utc) > expiration_date:
        return "Your results have expired.", 400

    results_url = s3_client.generate_presigned_url(
        ClientMethod="get_object",
        Params={"Bucket": config["s3"]["bucket"], "Key": key},
        ExpiresIn=60 * 60 * 6,  # 6 hours (maximum for IAM instance roles)
    )

    return redirect(results_url, code=302)
    

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("-p", "--port", type=int, dest="port", default=8000)
    parser.add_argument("-d", "--debug", action="store_true")
    args = parser.parse_args()

    app.run(host="0.0.0.0", port=args.port, debug=args.debug, use_evalex=args.debug)
