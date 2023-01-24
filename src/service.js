const { MongoClient, Timestamp } = require('mongodb');

const dbUrl = 'mongodb://localhost:27022,localhost:27023?readConcernLevel=majority';

const client = new MongoClient(dbUrl);

const oplogDb = 'local';

let lastTimestamp;

function mongoRunFind() {
  const db = client.db(oplogDb);
  const oplogCollection = db.collection('oplog.rs');
  let query = {
    op: { $in: ['i', 'u', 'd']}
  };
  if (lastTimestamp) {
    query.ts = { $gt: new Timestamp(lastTimestamp) };
  } else {
    query.ts = { $gt: new Timestamp(0, Math.floor(new Date().getTime() / 1000))  };
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
  console.log(`data with ts ${data.ts.toBigInt()}:`, {
    ...data,
    databaseName,
    collectionName
  });
  lastTimestamp = data.ts.toBigInt();
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