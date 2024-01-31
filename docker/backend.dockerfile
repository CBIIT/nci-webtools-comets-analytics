FROM public.ecr.aws/amazonlinux/amazonlinux:2023

RUN dnf -y update \
   && dnf -y install \
   git \
   httpd-devel \
   libcurl-devel \
   libjpeg-turbo-devel \
   libxml2-devel \
   openssl-devel \
   R \
   v8-devel \
   mariadb-connector-c-devel \
   && dnf clean all

ENV LD_LIBRARY_PATH=/usr/local/lib

ENV PKG_CONFIG_PATH=/usr/local/lib/pkgconfig

ENV LIBSODIUM_VERSION=1.0.19

RUN cd /tmp \
   && curl -L -O https://github.com/jedisct1/libsodium/releases/download/${LIBSODIUM_VERSION}-RELEASE/libsodium-${LIBSODIUM_VERSION}.tar.gz \
   && tar -xzf libsodium-${LIBSODIUM_VERSION}.tar.gz \
   && cd libsodium-stable \
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
   renv::init(bare = T); \
   renv::restore(); \
   renv::snapshot();"

COPY server ./

CMD Rscript server.R
