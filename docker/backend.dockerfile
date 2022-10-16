FROM public.ecr.aws/amazonlinux/amazonlinux:2022

RUN dnf -y update \
 && dnf -y install \
    git \
    httpd-devel \
    libcurl-devel \
    libjpeg-turbo-devel \
    libxml2-devel \
    openssl-devel \
    R \
 && dnf clean all

ENV LD_LIBRARY_PATH=/usr/local/lib

ENV PKG_CONFIG_PATH=/usr/local/lib/pkgconfig

ENV LIBSODIUM_VERSION=1.0.18

RUN cd /tmp \
 && curl -O https://download.libsodium.org/libsodium/releases/libsodium-${LIBSODIUM_VERSION}.tar.gz \
 && tar -xzf libsodium-${LIBSODIUM_VERSION}.tar.gz \
 && cd libsodium-${LIBSODIUM_VERSION} \
 && ./configure \
 && make \
 && make check \
 && make install

RUN mkdir -p /server

WORKDIR /server

COPY server/renv.lock ./

RUN R -e "\
    options(Ncpus=parallel::detectCores()); \
    install.packages('renv', repos = 'https://cloud.r-project.org/'); \
    renv::restore();"

COPY server ./

ARG COMETS_R_PACKAGE_URL=CBIIT/R-cometsAnalytics/RPackageSource

# can be a tag, branch, or commit sha - used to invalidate build cache
ARG COMETS_R_PACKAGE_REF=master

# install version of COMETS specified by tag
# renv::restore() is used a second time to relink dependencies from cache
# since they are overwritten by the previous copy command
RUN R -e "\
   renv::restore(); \
   renv::install('${COMETS_R_PACKAGE_URL}@${COMETS_R_PACKAGE_REF}'); \
   renv::snapshot();"

CMD Rscript server.R