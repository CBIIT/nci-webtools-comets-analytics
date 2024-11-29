FROM --platform=linux/amd64 oraclelinux:9

RUN dnf -y update \
   && dnf config-manager --set-enabled ol9_codeready_builder \
   && dnf -y install epel-release \
   && dnf -y install \
   cairo-devel \
   git \
   glpk-devel \
   httpd-devel \
   libcurl-devel \
   libjpeg-turbo-devel \
   libsodium \
   libsodium-devel \
   libxml2-devel \
   libXt-devel  \
   mariadb-connector-c-devel \
   openssl-devel \
   R \
   readline-devel \
   rsync \
   v8-devel \
   && dnf clean all

RUN mkdir -p /server

RUN echo '\
options(\
    repos = c(CRAN = "https://packagemanager.posit.co/cran/__linux__/rhel9/latest"),\
    renv.config.repos.override = c(CRAN = "https://packagemanager.posit.co/cran/__linux__/rhel9/latest"),\
    HTTPUserAgent = sprintf("R/%s R (%s)", getRversion(), paste(getRversion(), R.version["platform"], R.version["arch"], R.version["os"])),\
    Ncpus = parallel::detectCores()\
)' >> /usr/lib64/R/library/base/R/Rprofile

# install R packages with renv
COPY server/renv.lock /server/
COPY server/.Rprofile /server/
COPY server/renv/activate.R /server/renv/
COPY server/renv/settings.json /server/renv/

# copy renv cache if available
# note: disabled since we are using ppm
# ENV RENV_PATHS_CACHE=/server/renv/cache
# RUN mkdir ${RENV_PATHS_CACHE}
# ARG R_RENV_CACHE_HOST=/renvCach[e]
# COPY ${R_RENV_CACHE_HOST} ${RENV_PATHS_CACHE}
WORKDIR /server
RUN R -e "options(Ncpus=parallel::detectCores()); renv::restore(repos=c(CRAN='https://packagemanager.posit.co/cran/__linux__/rhel9/latest'))"

# can be a tag, branch, or commit sha - used to invalidate build cache
ARG COMETS_R_PACKAGE_URL=CBIIT/R-cometsAnalytics/RPackageSource
ARG COMETS_R_PACKAGE_REF=master

# install version of COMETS specified by tag
RUN R -e "\
   renv::install('${COMETS_R_PACKAGE_URL}@${COMETS_R_PACKAGE_REF}'); \
   renv::settings\$snapshot.type('all'); \
   renv::snapshot();"

COPY server /server/

ENV TZ=America/New_York
ENV RENV_CONFIG_SANDBOX_ENABLED=FALSE

CMD Rscript server.R
