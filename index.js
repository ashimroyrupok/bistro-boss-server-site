require('dotenv').config()
const express = require('express')
const app = express()
const cors = require('cors')
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)


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
        const paymentsCollection = client.db('bistroDB').collection('payments')


        // middleware 
        const verifyToken = (req, res, next) => {
            // console.log(req.headers);
            if (!req.headers.authorization) {
                return res.status(401).send({ message: "unauthorized access " })
            }
            const token = req.headers.authorization.split(' ')[1];
            // console.log(req.headers.authorization.split(' ')[1]);
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
                if (err) {
                    return res.status(401).send({ message: "unauthorized access " })
                }
                req.decoded = decoded;
                next()
            })            // next()
        }

        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded?.email;
            const query = { email: email }
            const user = await userCollection.findOne(query);
            const isAdmin = user?.role === 'admin';
            if (!isAdmin) {
                return res.status(401).send({ message: "forbidden access" })
            }
            next()
        }


        // jwt related api

        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
                expiresIn: '1h'
            })
            res.send({ token })

        })

        app.get("/menu", async (req, res) => {
            const result = await menuCollection.find().toArray()
            res.send(result)
        })

        app.post('/menu', verifyToken, verifyAdmin, async (req, res) => {
            const data = req.body;
            const result = await menuCollection.insertOne(data);
            res.send(result)
        })

        app.delete('/menu/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: id };
            const result = await menuCollection.deleteOne(query);
            res.send(result)
        })

        app.get('/menu/:id', async (req, res) => {
            const id = req.params.id;
            const data = req.body;
            const query = { _id: id };
            const result = await menuCollection.findOne(query)
            res.send(result)
        })

        app.patch('/menu/:id', async (req, res) => {
            const id = req.params.id;
            const data = req.body;
            const query = { _id: id }
            const filter = await menuCollection.findOne(query)
            const updateDoc = {
                $set: {
                    name: data.name,
                    price: data.price,
                    recipe: data.recipe,
                    category: data.category,
                    image: data.image
                }
            }
            const result = await menuCollection.updateOne(filter, updateDoc)
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







        app.get('/users', verifyToken, verifyAdmin, async (req, res) => {

            const result = await userCollection.find().toArray()
            res.send(result)
        })

        app.get('/users/admin/:id', verifyToken, async (req, res) => {
            const email = req.params?.id;
            console.log(email);
            // console.log(req.decoded?.email);
            if (email !== req.decoded.email) {
                return res.status(403).send({ message: 'forbidden access' })
            }
            const query = { email: email };
            const user = await userCollection.findOne(query);
            let admin = false;
            if (user) {
                admin = user?.role === 'admin';
                console.log(admin);
            }
            res.send({ admin })
        })

        app.delete('/users/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await userCollection.deleteOne(query)
            res.send(result)
        })

        app.patch('/users/admin/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    role: "admin"
                }
            }
            const result = await userCollection.updateOne(filter, updateDoc)
            res.send(result)
        })


        // payment intent
        app.post("/create-payment-intent", async (req, res) => {
            const { price } = req.body;
            const amount = parseInt(price * 100)
            console.log(amount, 'insed the payment intent');
            const paymentIntent = await stripe.paymentIntents.create({

                amount: amount,
                currency: 'usd',
                payment_method_types: ["card"]

            })
            res.send({
                clientSecret: paymentIntent.client_secret
            });
        })

        app.post('/payments', async (req, res) => {
            const payment = req.body;

            console.log("payment info", payment);
            const paymentResult = await paymentsCollection.insertOne(payment);
            const query = {
                _id: {
                    $in: payment.cartId.map(id => new ObjectId(id))
                }
            }
            const deletedResult = await cartsCollection.deleteMany(query)
            res.send({ paymentResult, deletedResult })
        })

        app.get('/payments/:email', verifyToken, async (req, res) => {
            const query = { email: req.params.email };
            if (req.params.email !== req.decoded.email) {
                return res.status(403).send({ message: "forbidden access" })
            }
            const result = await paymentsCollection.find(query).toArray();
            res.send(result)
        })

        app.get('/admin-stats', verifyToken, verifyAdmin, async (req, res) => {
            const users = await userCollection.estimatedDocumentCount()
            const menuItem = await menuCollection.estimatedDocumentCount()
            const orders = await paymentsCollection.estimatedDocumentCount()

            const result = await paymentsCollection.aggregate([
                {
                    $group: {
                        _id: null,
                        totalRevenue: {
                            $sum: "$price"
                        }
                    }
                }
            ]).toArray()

            const revenue = result.length > 0 ? result[0].totalRevenue : 0;


            res.send({
                users,
                menuItem,
                orders,
                revenue
            })
        })

        // aggregate pipeline

        app.get('/order-stats', async (req, res) => {
            const result = await paymentsCollection.aggregate([
                {
                    $unwind: "$cartId"
                },
                {
                    $lookup: {
                        from: "menus",
                        localField: "cartId",
                        foreignField: "_id",
                        as: "menuItems"
                    }
                },
                {
                    $unwind: "$menuItems"
                },
                {
                    $group: {
                        _id: "$menuItems.category",
                        quantity: { $sum: 1 },
                        revenue: {$sum: '$menuItems.price' }
                    }
                },
                {
                    $project:{
                        _id:0,
                        category: "$_id",
                        quantity:"$quantity",
                        revenue:"$revenue"
                    }
                }

            ]).toArray()
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