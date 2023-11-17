const express = require('express')
const cors = require('cors')
require('dotenv').config()
const app = express()
const port = process.env.PORT || 5000


// middleware
app.use(cors())
app.use(express.json())







// Create a MongoClient with a MongoClientOptions object to set the Stable API version

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.uwnroha.mongodb.net/?retryWrites=true&w=majority`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const userCollection = client.db('bistroDB').collection('users')
        const menuCollection = client.db('bistroDB').collection('menus')
        const reviewCollection = client.db('bistroDB').collection('reviews')
        const cartsCollection = client.db('bistroDB').collection('carts')


        app.get("/menu", async (req, res) => {
            const result = await menuCollection.find().toArray()
            res.send(result)
        })
        app.get("/review", async (req, res) => {
            const result = await reviewCollection.find().toArray()
            res.send(result)
        })


        // cartscolletion
        app.post('/carts', async (req, res) => {
            const data = req.body;
            const result = await cartsCollection.insertOne(data)
            res.send(result)
        })

        app.get('/carts', async (req, res) => {
            const email = req.query.email;
            const query = { email: email }
            const result = await cartsCollection.find(query).toArray()
            res.send(result)
        })

        app.delete('/carts/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await cartsCollection.deleteOne(query);
            res.send(result)
        })


        // users collection related api

        app.post('/users', async (req, res) => {
            const data = req.body;
            const query = { email: data.email }
            const existingUser = await userCollection.findOne(query)
            if (existingUser) {
                return res.send({ user: "user is already exist", insertedId: null })
            }
            const result = await userCollection.insertOne(data)
            res.send(result)
        })


        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);




app.get('/', (req, res) => {
    res.send('bistro boss is running')
})

app.listen(port, () => {
    console.log(`bistro boss runnig port is ${port}`);
})