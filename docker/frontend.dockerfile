FROM public.ecr.aws/amazonlinux/amazonlinux:2023

RUN dnf -y update \
   && dnf -y install \
   gcc-c++ \
   httpd \
   make \
   nodejs22 \
   nodejs22-npm  \
   npm \
   git \
   && dnf clean all

RUN ln -s -f /usr/bin/node-22 /usr/bin/node; ln -s -f /usr/bin/npm-22 /usr/bin/npm;

RUN mkdir /client

WORKDIR /client

COPY client/package.json client/package-lock.json /client/

RUN npm ci --ignore-scripts
RUN npm rebuild esbuild

COPY client /client/

ARG GIT_TAG=dev
ARG GIT_BRANCH=dev  
ARG LAST_COMMIT_DATE=dev

ENV VITE_GIT_TAG=${GIT_TAG}
ENV VITE_GIT_BRANCH=${GIT_BRANCH}
ENV VITE_LAST_COMMIT_DATE=${LAST_COMMIT_DATE}

RUN npm run build 
RUN cp -r /client/dist/* /var/www/html/

COPY docker/frontend.conf /etc/httpd/conf.d/frontend.conf

WORKDIR /var/www/html

EXPOSE 80
EXPOSE 443

CMD rm -rf /run/httpd/* /tmp/httpd* \
   && exec /usr/sbin/httpd -DFOREGROUND