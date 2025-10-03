FROM public.ecr.aws/amazonlinux/amazonlinux:2023

RUN dnf -y update \
   && dnf -y install \
   gcc-c++ \
   httpd \
   make \
   nodejs \
   npm \
   git \
   && dnf clean all

RUN mkdir /client

WORKDIR /client

COPY client/package.json client/package-lock.json /client/

RUN npm install

COPY client /client/

ARG RELEASE_VERSION=dev
ARG LAST_COMMIT_DATE=dev

ENV VITE_RELEASE_VERSION=${RELEASE_VERSION}
ENV VITE_LAST_COMMIT_DATE=${LAST_COMMIT_DATE}

RUN npm run build 
RUN cp -r /client/dist/* /var/www/html/

COPY docker/frontend.conf /etc/httpd/conf.d/frontend.conf

WORKDIR /var/www/html

EXPOSE 80
EXPOSE 443

CMD rm -rf /run/httpd/* /tmp/httpd* \
   && exec /usr/sbin/httpd -DFOREGROUND