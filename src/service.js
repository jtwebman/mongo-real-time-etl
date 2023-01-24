const { MongoClient, Timestamp, ObjectID } = require('mongodb');

const dbUrl = 'mongodb://localhost:27022,localhost:27023?readConcernLevel=majority';

const client = new MongoClient(dbUrl);

const oplogDb = 'local';

let lastTimestamp;

const dayInMs = 86400000;

function mongoRunFind(lastLog) {
  const db = client.db(oplogDb);
  const oplogCollection = db.collection('oplog.rs');
  let query = {
    ns : { '$regex' : '^(test|dev)\\.'},
    op: { $in: ['i', 'u', 'd']},
    fromMigrate : { $exists : false }
  };
  if (lastTimestamp) {
    query.ts = { $gt: new Timestamp(lastTimestamp) };
  } else {
    query.ts = { $gt: new Timestamp(0, Math.floor(new Date().getTime() / 1000) - dayInMs * 10)  };
  }
  const oplogStream = oplogCollection.find(query, { 
    tailable: true, 
    awaitData: true, 
    noCursorTimeout: true, 
    oplogReplay: true, 
  }).stream();

  oplogStream.on('data', mongoDate);
  oplogStream.on('error', mongoError);
  oplogStream.on('end', mongoEnd);
}

function mongoDate(data) {
  const [databaseName, collectionName] = data.ns.split(/\.(.*)/);
  const timestamp = data.ts.toBigInt();
  let recordId;
  let isObjectID = false
  if (data.op === 'u') {
    isObjectID = data.o2._id instanceof ObjectID
    recordId = data.o2._id.toString()
  } else {
    isObjectID = data.o._id instanceof ObjectID
    recordId = data.o._id.toString()
  }
  console.log(`data with ts ${data.ts.toBigInt()}:`, {
    ...data,
    databaseName,
    collectionName,
    recordId,
    isObjectID,
    timestamp,
  });
  lastTimestamp = timestamp;
}

function mongoError( error) {
  console.log(`oplog tail error:`, error.stack);
}

function mongoEnd() {
  console.log('oplog tail ended');
  return mongoRunFind();
}

async function mongoConnect() {
  await client.connect();
  console.log('Connected successfully to server');
  return mongoRunFind();
}

mongoConnect()
  .catch(error => {
    console.log(`error: ${error.stack || error.message || error }`)
  });