#!/bin/sh

set -e

# Executable that waits for a port at an address to be open.
# For further details go to: https://github.com/ufoscout/docker-compose-wait
/wait

awslocal s3 mb s3://dev-elife-style-content-adapter-incoming
awslocal s3 mb s3://dev-elife-style-content-adapter-expanded
awslocal s3 cp ./elife-666-vor-r1.zip s3://dev-elife-style-content-adapter-incoming
