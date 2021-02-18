FROM centos:8

RUN dnf -y update \
 && dnf -y install \
    dnf-plugins-core \
    epel-release \
    glibc-langpack-en \
 && dnf config-manager --enable PowerTools \
 && dnf -y install \
    git \
    httpd-devel \
    libcurl-devel \
    libjpeg-turbo-devel \
    openssl-devel \
    python3-devel \
    python3-pip \
    R \
 && dnf clean all

ENV R_REMOTES_NO_ERRORS_FROM_WARNINGS=true

RUN R -e "install.packages('remotes', repos='https://cloud.r-project.org/')"
RUN R -e "remotes::install_bioc('Biobase')"
RUN R -e "remotes::install_github('rstudio/d3heatmap')"
RUN R -e "remotes::install_github('CBIIT/R-cometsAnalytics/RPackageSource')"
RUN R -e "remotes::install_version('dplyr', version='0.8.5', repos='https://cloud.r-project.org/')"
RUN R -e "install.packages('jsonlite', repos='https://cloud.r-project.org/')"

RUN python3 -m pip install --upgrade pip \
 && python3 -m pip install wheel \
 && python3 -m pip install \
   boto3 \
   flask \
   mod_wsgi \
   pyper \
   requests \
   r_functions

ARG COMETS_R_PACKAGE_REINSTALL=null

ARG COMETS_R_PACKAGE_URL=CBIIT/R-cometsAnalytics/RPackageSource

ARG COMETS_R_PACKAGE_TAG=master

# install version of COMETS specified by tag
RUN R -e "remotes::install_github('$COMETS_R_PACKAGE_URL', ref='$COMETS_R_PACKAGE_TAG', upgrade='never')"

RUN mkdir -p /deploy/app

COPY comets /deploy/app/

# copy uid.xlsx file from COMETS package
RUN cp -f /usr/lib64/R/library/COMETS/extdata/uid.xlsx /deploy/app/static/examples/uid.xlsx

WORKDIR /deploy

RUN chown -R apache:apache /deploy

RUN python3 -m pip install -r app/requirements.txt

CMD mod_wsgi-express start-server /deploy/app/deploy.wsgi \
  --port 8000 \
  --user apache \
  --group apache \
  --server-root wsgi \
  --document-root app/static \
  --working-directory app \
  --directory-index index.html \
  --log-directory logs \
  --socket-timeout 900 \
  --queue-timeout 900 \
  --shutdown-timeout 900 \
  --graceful-timeout 900 \
  --connect-timeout 900 \
  --request-timeout 900 \
  --limit-request-body 2147483647 \
  --processes 4 \
  --threads 1 \
  --rotate-logs \
  --log-level info \
  --error-log-name comets_log