const express = require('express')
const app = express()
const cors = require('cors');
require('dotenv').config();
const { MongoClient } = require('mongodb');
const ObjectId = require('mongodb').ObjectId;

const port = process.env.PORT || 5000

// verify token

const admin = require("firebase-admin");
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});


async function verifyToken(req, res, next) {
    if (req.headers.authorization.startsWith('Bearer ')) {
        const token = req.headers.authorization.split(' ')[1];
        try {
            const decodedUser = await admin.auth().verifyIdToken(token)
            req.decodedEmail = decodedUser.email;
        } catch (error) {

        }
    }

    next()
}

app.use(cors())
app.use(express.json())

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.3ga0n.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });


async function run() {
    try {
        await client.connect();
        const database = client.db('aparttVilla');
        // const appointmentsCollection = database.collection('appointments');
        const usersCollection = database.collection('users');
        const reviewCollection = database.collection('reviews');
        const propertyCollection = database.collection('properties');
        const buyingCollection = database.collection('buyingList');
        const divisionCollection = database.collection('divisons');


        app.get('/users', async (req, res) => {
            const cursor = await usersCollection.find({}).toArray()
            res.json(cursor)

        });

        app.get('/users/:email', async (req, res) => {
            const email = req.params.email
            const query = { email: email }
            const user = await usersCollection.findOne(query)
            let isAdmin = false
            if (user?.role === 'admin') {
                isAdmin = true
            }
            res.json({ admin: isAdmin })
        })

        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user)
            console.log(result);
            res.json(result)

        })

        app.put('/users', async (req, res) => {
            const user = req.body;
            const filter = { email: user.email }
            const options = { upsert: true }
            const updateDoc = { $set: user };
            const result = await usersCollection.updateOne(filter, updateDoc, options)
            res.json(result)
        })

        app.put('/users/admin', verifyToken, async (req, res) => {
            const user = req.body;
            const requester = req.decodedEmail
            console.log(requester)
            if (requester) {
                const requesterAccount = await usersCollection.findOne({ email: requester })
                if (requesterAccount.role === 'admin') {
                    const filter = { email: user.email }
                    const updateDoc = { $set: { role: 'admin' } };
                    const result = await usersCollection.updateOne(filter, updateDoc)
                    res.json(result)
                }
            } else {
                res.status(403).json({ message: ' you do not have access make admin' })
            }


        })

        app.post('/reviews', async (req, res) => {
            const review = req.body;
            const result = await reviewCollection.insertOne(review)
            console.log(review);
            res.json(result)
        })
        app.get('/reviews', async (req, res) => {
            const allReview = await reviewCollection.find({}).toArray()
            res.json(allReview)
        })


        app.post('/properties', async (req, res) => {
            const property = req.body;
            const result = await propertyCollection.insertOne(property)
            console.log(property);
            res.json(result)
        })
        app.get('/properties', async (req, res) => {
            const allProperties = await propertyCollection.find({}).toArray()
            res.json(allProperties)
        })
        app.get('/properties/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const user = await propertyCollection.findOne(query)
            res.send(user)
        })

        app.put('/properties/:id', async (req, res) => {
            const id = req.params.id;
            const updatedUser = req.body;
            const filter = { _id: ObjectId(id) };
            const options = { update: true }
            const updateDoc = {
                $set: {

                    name: updatedUser.name,
                    image: updatedUser.image,
                    division: updatedUser.division,
                    propertySize: updatedUser.propertySize,
                    bedrooms: updatedUser.bedrooms,
                    baths: updatedUser.baths,
                    balcony: updatedUser.balcony,
                    price: updatedUser.price,
                    location: updatedUser.location,

                }
            };
            const result = await propertyCollection.updateOne(filter, updateDoc, options)
            res.send(result)
        })


        app.delete('/properties/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const result = await propertyCollection.deleteOne(query)
            res.json(result)

        })
        app.delete('/buyingList/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const result = await buyingCollection.deleteOne(query)
            res.json(result)

        })

        app.post('/buyingList', async (req, res) => {
            const property = req.body;
            const result = await buyingCollection.insertOne(property)
            console.log(property);
            res.json(result)
        })
        app.get('/buyingList', async (req, res) => {
            const allProperties = await buyingCollection.find({}).toArray()
            res.json(allProperties)
        })

        app.get("/buyingList/:email", async (req, res) => {
            const result = await buyingCollection.find({
                userEmail: req.params.email,
            }).toArray();
            res.send(result);
        });

        app.put('/buyingList/:id', async (req, res) => {
            const id = req.params.id;
            const updatedUser = req.body;
            const filter = { _id: ObjectId(id) };
            const options = { update: true }
            const updateDoc = {
                $set: {
                    status: updatedUser.status
                }
            };
            const result = await buyingCollection.updateOne(filter, updateDoc, options)
            res.send(result)
        })


        app.post('/filter', async (req, res) => {
            const { division, bedrooms, baths, balcony } = req.body
            const getData = await propertyCollection.find({ division, bedrooms, baths, balcony }).toArray()

            res.json(getData)
        })


        app.post('/division', async (req, res) => {
            const property = req.body;
            const result = await divisionCollection.insertOne(property)
            res.json(result)
        })
        app.get('/division', async (req, res) => {
            const allDivision = await divisionCollection.find({}).toArray()
            res.json(allDivision)
        })



    } finally {
        // await client.close();
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('From AparttVilla!')
})

app.listen(port, () => {
    console.log(`listening at ${port}`)
})