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
    libsodium-devel \
    libxml2-devel \
    openssl-devel \
    R \
 && dnf clean all

RUN mkdir -p /server

WORKDIR /server

COPY server/install.R /server/

RUN Rscript install.R

ARG COMETS_R_PACKAGE_URL=CBIIT/R-cometsAnalytics/RPackageSource

# can be a tag, branch, or commit sha - used to invalidate build cache
ARG COMETS_R_PACKAGE_REF=master

# install version of COMETS specified by tag
RUN R -e "remotes::install_github('$COMETS_R_PACKAGE_URL', ref='$COMETS_R_PACKAGE_REF', upgrade='never')"

COPY server /server/

CMD Rscript server.R