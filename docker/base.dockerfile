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
