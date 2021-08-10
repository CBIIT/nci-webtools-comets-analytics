FROM quay.io/centos/centos:stream8

RUN dnf -y update \
 && dnf -y install \
    dnf-plugins-core \
    epel-release \
    glibc-langpack-en \
 && dnf config-manager --enable powertools \
 && dnf -y install \
    git \
    httpd-devel \
    libcurl-devel \
    libjpeg-turbo-devel \
    openssl-devel \
    R \
 && dnf clean all

ENV R_REMOTES_NO_ERRORS_FROM_WARNINGS=true

# ensure that comets dependencies are installed
RUN R -e "install.packages( \
  c( \
    'future', \
    'jsonlite', \
    'paws', \
    'plumber', \
    'remotes', \
    'uuid' \
  ), \
  repos = 'https://cloud.r-project.org/' \
)"
RUN R -e "remotes::install_bioc('Biobase')"
RUN R -e "remotes::install_github('CBIIT/R-cometsAnalytics/RPackageSource', ref = 'v2.0', upgrade = 'never')"

RUN mkdir -p /deploy/app

ARG COMETS_R_PACKAGE_URL=CBIIT/R-cometsAnalytics/RPackageSource

# can be a tag, branch, or commit id - used to invalidate build cache
ARG COMETS_R_PACKAGE_TAG=v2.0

# install version of COMETS specified by tag
RUN R -e "remotes::install_github('$COMETS_R_PACKAGE_URL', ref='$COMETS_R_PACKAGE_TAG', upgrade='never')"

COPY server /deploy/app/

WORKDIR /deploy

CMD Rscript server.R