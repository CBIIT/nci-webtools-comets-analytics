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

ARG APP_VERSION=dev
ENV VITE_APP_VERSION=${APP_VERSION}

RUN npm run build 
RUN cp -r /client/dist/* /var/www/html/

COPY docker/frontend.conf /etc/httpd/conf.d/frontend.conf

WORKDIR /var/www/html

EXPOSE 80
EXPOSE 443

CMD rm -rf /run/httpd/* /tmp/httpd* \
   && exec /usr/sbin/httpd -DFOREGROUND