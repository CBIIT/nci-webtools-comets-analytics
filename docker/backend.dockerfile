FROM --platform=linux/amd64 oraclelinux:9

RUN dnf -y update \
   && dnf config-manager --set-enabled ol9_codeready_builder \
   && dnf -y install epel-release \
   && dnf -y install \
   cairo-devel \
   cmake \
   git \
   flexiblas-devel \
   glpk-devel \
   httpd-devel \
   libcurl-devel \
   libjpeg-turbo-devel \
   libuv-devel \
   libsodium \
   libsodium-devel \
   libxml2-devel \
   libXt-devel  \
   mariadb-connector-c-devel \
   openssl-devel \
   readline-devel \
   rsync \
   v8-devel \
   && dnf clean all

RUN dnf config-manager --set-enabled ol9_addons \
   && dnf -y install \
   R-4.4.1 \
   R-devel-4.4.1 \
   && dnf clean all

RUN mkdir -p /server

# install R packages with renv
COPY server/renv.lock /server/
COPY server/.Rprofile /server/
COPY server/renv/activate.R /server/renv/
COPY server/renv/settings.json /server/renv/

WORKDIR /server
RUN R -e "options(Ncpus=parallel::detectCores()); renv::restore()"

# can be a tag, branch, or commit sha - used to invalidate build cache
ARG COMETS_R_PACKAGE_URL=CBIIT/R-cometsAnalytics/RPackageSource
ARG COMETS_R_PACKAGE_REF=master

# install version of COMETS specified by tag
RUN R -e "renv::install('${COMETS_R_PACKAGE_URL}@${COMETS_R_PACKAGE_REF}')"

# install RaMP package from GitHub
RUN R -e "renv::install('ncats/RaMP-DB')"

COPY server /server/

ENV TZ=America/New_York
ENV RENV_CONFIG_SANDBOX_ENABLED=FALSE

CMD Rscript server.R
