const { MongoClient, Timestamp, ObjectId, Long, Decimal128 } = require('mongodb');
const dbUrl = 'mongodb://localhost:27022,localhost:27023,localhost:27024?readConcernLevel=majority';

const client = new MongoClient(dbUrl);

const oplogDb = 'local';

let lastTimestamp;

const dayInMs = 86400000;

async function mongoRunFind(lastLog) {
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

  oplogStream.on('error', mongoError);
  oplogStream.on('end', mongoEnd);

  for await (const data of oplogStream) {
    await mongoDate(data);
  }
}

function getMongoType(value) {
  if (value instanceof ObjectId) {
    return {
      type: 'objectId',
      value: value.toString()
    };
  }
  if (value instanceof Timestamp) {
    return {
      type: 'timestamp',
      value: new Date(value.getHighBits() * 1000)
    };
  }
  if (value instanceof Long) {
    return {
      type: 'int64',
      value: value.toBigInt()
    };
  }
  if (value instanceof Decimal128) {
    return {
      type: 'decimal128',
      value: value.toString()
    };
  }
  if (value instanceof Date) {
    return {
      type: 'date',
      value
    };
  }
  if (value === null) {
    return {
      type: 'null',
      value
    };
  }
  const valueType = typeof value;
  if (valueType === 'number') {
    if (Number.isInteger(value)) {
      return {
        type: 'int32',
        value
      };
    }
    return {
      type: 'double',
      value
    };
  }
  if (Array.isArray(value)) {
    const arrayTypes = value.reduce((acc, item) => {
      acc.push(getMongoType(item));
      return acc;
    }, []);
    return {
      type: 'array',
      subTypes: arrayTypes
    };
  }
  if (valueType === 'object') {
    const subTypes = Object.keys(value).reduce((acc, key) => {
      acc[key] = getMongoType(value[key]);
      return acc;
    }, {});
    return {
      type: 'object',
      subTypes,
    };
  }
  return {
    type: valueType,
    value
  };
}

const opToOperation = {
  i: 'insert',
  u: 'update',
  d: 'delete'
}

async function mongoDate(data) {
  const [databaseName, collectionName] = data.ns.split(/\.(.*)/);
  const timestamp = data.ts.toBigInt();
  let recordId;
  let isObjectID = false;
  let propertyTypes = {};
  if (data.op === 'u') {
    isObjectID = data.o2._id instanceof ObjectId;
    recordId = data.o2._id.toString();
    propertyTypes = getMongoType(data.o['$set'] || data.o['diff']);
  } else {
    isObjectID = data.o._id instanceof ObjectId;
    recordId = data.o._id.toString();
    propertyTypes = getMongoType(data.o);
  }
    
  lastTimestamp = timestamp;
  console.dir({
    databaseName,
    collectionName,
    recordId,
    isObjectID,
    timestamp,
    propertyTypes,
    operation: opToOperation[data.op],
    // raw: data
  }, {depth: 10});
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