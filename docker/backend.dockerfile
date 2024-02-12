FROM public.ecr.aws/amazonlinux/amazonlinux:2023

RUN dnf -y update \
   && dnf -y install \
   git \
   httpd-devel \
   libcurl-devel \
   libjpeg-turbo-devel \
   libxml2-devel \
   openssl-devel \
   v8-devel \
   mariadb-connector-c-devel \
   libsodium \
   libsodium-devel \
   R-core-devel \
   readline-devel \
   libXt-devel  \
   cairo-devel \
   && dnf clean all

ENV R_VERSION=4.3.2

RUN cd /tmp \
   && curl -O https://cran.rstudio.com/src/base/R-4/R-${R_VERSION}.tar.gz \
   && tar -xzvf R-${R_VERSION}.tar.gz \
   && cd R-${R_VERSION} \
   && ./configure \
   --prefix=$HOME/R \
   && make \
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
