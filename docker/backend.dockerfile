FROM --platform=linux/amd64 oraclelinux:9

RUN dnf -y update \
   && dnf config-manager --set-enabled ol9_codeready_builder \
   && dnf -y install epel-release \
   && dnf -y install \
   cairo-devel \
   git \
   flexiblas-devel \
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
   readline-devel \
   rsync \
   v8-devel \
   && dnf clean all

# Install R 4.4.1 from Posit (pinned to match renv.lock)
RUN curl -O https://cdn.posit.co/r/rhel-9/pkgs/R-4.4.1-1-1.x86_64.rpm \
   && dnf -y install R-4.4.1-1-1.x86_64.rpm \
   && rm R-4.4.1-1-1.x86_64.rpm \
   && ln -s /opt/R/4.4.1/bin/R /usr/local/bin/R \
   && ln -s /opt/R/4.4.1/bin/Rscript /usr/local/bin/Rscript

RUN mkdir -p /server

RUN echo '\
options(\
    repos = c(CRAN = "https://packagemanager.posit.co/cran/__linux__/rhel9/latest"),\
    renv.config.repos.override = c(CRAN = "https://packagemanager.posit.co/cran/__linux__/rhel9/latest"),\
    HTTPUserAgent = sprintf("R/%s R (%s)", getRversion(), paste(getRversion(), R.version["platform"], R.version["arch"], R.version["os"])),\
    Ncpus = parallel::detectCores()\
)' >> /opt/R/4.4.1/lib/R/library/base/R/Rprofile

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

# install RaMP package from GitHub and its Bioconductor dependency
# Pin dbplyr to 2.5.2 (last version compatible with the project's dplyr 1.1.4).
# dbplyr 2.6.0 (2026-06-17) is pulled in transitively by BiocFileCache and calls
# dplyr::filter_out, which is not exported by CRAN dplyr 1.1.4, so the unpinned
# install breaks the build. Installing 2.5.2 first makes BiocFileCache use it.
RUN R -e "renv::install('dbplyr@2.5.2'); renv::install('bioc::BiocFileCache'); renv::install('ncats/RaMP-DB')"

COPY server /server/

ENV TZ=America/New_York
ENV RENV_CONFIG_SANDBOX_ENABLED=FALSE

CMD Rscript server.R