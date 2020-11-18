FROM centos:8

RUN dnf -y update \
 && dnf -y module enable mod_auth_openidc \
 && dnf -y install \
    httpd \
    mod_auth_openidc \
 && dnf clean all

# Add custom httpd configuration
ADD docker/frontend.conf /etc/httpd/conf.d/frontend.conf

# Docker copy ignores top-level directories
COPY /comets/static /var/www/html

WORKDIR /var/www/html/

RUN chmod 755 -R /var/www/html

EXPOSE 80
EXPOSE 443

# Simple startup script to avoid some issues observed with container restart
CMD rm -rf /run/httpd/* /tmp/httpd* \
 && exec /usr/sbin/apachectl -DFOREGROUND