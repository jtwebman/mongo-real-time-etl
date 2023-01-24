#!/bin/bash
set -eo pipefail

if mongo --quiet "127.0.0.1" --eval 'quit(db.runCommand({ ping: 1 }).ok ? 0 : 2)'; then
	exit 0
fi

exit 1