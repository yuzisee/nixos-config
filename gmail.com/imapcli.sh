#!/bin/sh
#
# Usage:
#   ./imapcli.sh my_email@my_domain.my_tld

docker run --rm -it bovender/imapcli -s imaps-proxy.fastmail.com -u "$1" -P stats -o total_size --reverse # --limit 30

