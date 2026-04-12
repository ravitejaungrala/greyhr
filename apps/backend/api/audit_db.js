const { MongoClient } = require('mongodb');
const uri = "mongodb://localhost:27017";
const client = new MongoClient(uri);

async function run() {
    try {
        await client.connect();
        const db = client.db('test');
        console.log('--- USER SAMPLE ---');
        const users = await db.collection('users').find({status: 'approved'}).limit(3).toArray();
        console.log(JSON.stringify(users, null, 2));
        
        console.log('--- ATTENDANCE SAMPLE ---');
        const attendance = await db.collection('attendance').find({}).limit(5).sort({timestamp: -1}).toArray();
        console.log(JSON.stringify(attendance, null, 2));

        console.log('--- LEAVES SAMPLE ---');
        const leaves = await db.collection('leaves').find({}).limit(5).toArray();
        console.log(JSON.stringify(leaves, null, 2));
    } finally {
        await client.close();
    }
}
run();
