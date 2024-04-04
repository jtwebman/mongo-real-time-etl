#!/bin/bash

mongo "mongodb://host.docker.internal:27022/" <<EOF
var config = {
  "_id": "dbrs",
  "version": 1,
  "members": [
    {
      "_id": 1,
      "host": "host.docker.internal:27022",
      "priority": 2
    },
    {
      "_id": 2,
      "host": "host.docker.internal:27023",
      "priority": 1
    },
    {
      "_id": 3,
      "host": "host.docker.internal:27024",
      "priority": 3
    }
  ]
};
rs.initiate(config, { force: true });
rs.status();
EOF