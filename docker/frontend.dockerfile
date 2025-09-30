FROM public.ecr.aws/amazonlinux/amazonlinux:2023

RUN dnf -y update \
 && dnf -y install \
    gcc-c++ \
    httpd \
    make \
    nodejs20 \
    nodejs20-npm  \
    npm \
    git \
 && dnf clean all

RUN ln -s -f /usr/bin/node-20 /usr/bin/node; ln -s -f /usr/bin/npm-20 /usr/bin/npm;

RUN mkdir /client

WORKDIR /client

COPY package.json /package.json
COPY client/package.json /client/

RUN npm install

COPY client /client/

# Accept git information as build arguments
ARG GIT_TAG=dev
ARG GIT_BRANCH=dev  
ARG LAST_COMMIT_DATE=dev

# Set environment variables for Vite build
ENV VITE_GIT_TAG=${GIT_TAG}
ENV VITE_GIT_BRANCH=${GIT_BRANCH}
ENV VITE_LAST_COMMIT_DATE=${LAST_COMMIT_DATE}

# Build the application and move to web root
RUN echo "Building with Git Info: Tag=$VITE_GIT_TAG, Branch=$VITE_GIT_BRANCH, Date=$VITE_LAST_COMMIT_DATE" && \
    npm run build && \
    mv /client/dist/* /var/www/html/

COPY docker/frontend.conf /etc/httpd/conf.d/frontend.conf

WORKDIR /var/www/html

EXPOSE 80
EXPOSE 443

CMD rm -rf /run/httpd/* /tmp/httpd* \
 && exec /usr/sbin/httpd -DFOREGROUND