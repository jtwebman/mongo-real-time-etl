# Real Time Mongo DB to Postgres Extract, Transform, and Load (ETL)

The goal at first is to get this to just Mongo DB to Postgres real time extract, transform, and load and then grow from there.

## It will eventually handle the following:

 - Discover the schema of each collection and can override the basics or even fully control the name and schema on the recieving side
 - Doing a full sync on a collection by collection or whole database in a way that the current table can still be queried.
 - Tailing the oplog for changes after the full sync and updating the corresponding tables in the other side.
 - If shutdown can pick up where it left off on tailing the oplog and if the last log processed has follan off trigger a full sync.
 - Simple abstractions on what to do with different MongoDb object structures.
 - Allow you to override the simple abstraction and do custom things based on a collection and field.
    - Turn arrays into records in another one to many table.
    - Flatten object properties. 
    - Nested objects into another ont to one table.
    - Full on custom function to do what ever you want
 - Handle creating new columnes if the Mongo object start having new properties as well as handle changing the coulmn type or ignoring when property doesn't match the type.
