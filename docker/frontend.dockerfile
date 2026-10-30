FROM --platform=linux/amd64 public.ecr.aws/amazonlinux/amazonlinux:2023

RUN dnf -y update \
 && dnf -y install \
    gcc-c++ \
    httpd \
    make \
    gzip \
    tar \
 && dnf clean all

# AL2023 repos lack a patched Node 24 (CVE-2026-111497 fixed in 24.22.1)
ARG NODE_VERSION=24.22.1

RUN FILE=node-v${NODE_VERSION}-linux-x64.tar.gz \
 && cd /tmp \
 && curl -fsSLO https://nodejs.org/dist/v${NODE_VERSION}/${FILE} \
 && curl -fsSLO https://nodejs.org/dist/v${NODE_VERSION}/SHASUMS256.txt \
 && grep " ${FILE}$" SHASUMS256.txt | sha256sum -c - \
 && tar -xzf ${FILE} -C /usr/local --strip-components=1 --no-same-owner \
 && rm -f ${FILE} SHASUMS256.txt

RUN mkdir /client

WORKDIR /client

COPY client/package.json /client/

RUN npm install

COPY client /client/

RUN npm run build \
 && mv /client/dist/* /var/www/html/

COPY docker/frontend.conf /etc/httpd/conf.d/frontend.conf

# forward request and error logs to docker log collector
RUN ln -sf /dev/stdout /var/log/httpd/access_log \
    && ln -sf /dev/stderr /var/log/httpd/error_log

WORKDIR /var/www/html

EXPOSE 80
EXPOSE 443

CMD rm -rf /run/httpd/* /tmp/httpd* \
    && exec /usr/sbin/httpd -DFOREGROUND