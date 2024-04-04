# Would love for this to be the start of an ETL process for Mongo to Postgres or at least to SNS

Goals is this is the start of something you could use to track changes to a Mongo DB with also periodical full sync scans that either update a Postgres DB or at first probably just send SNS to either queue and do the migration in another process or maybe just write changes to S3 for auditing and debugging

# Just testing tailing oplogs

To run start with

```bash
docker compose up -d
```

This will get you a Mongo 5 3 replica set running.

Then you just need to run this. Each time it runs it processes all oplogs since the beginning of time (or the last oplog it still has in storage).

```bash
node src/service.js
```

This just tails the oplog and prints out the changes. It is a good start to an ETL process.

# Todo

- [ ] Save logs I have already processed so it only processes new logs
- [ ] Add a setting to filter databases and collections to track (Currently hardcodes to db dev and test)
- [ ] Add a setting to publish a message for each collection under watch to do a full sync message every so often
