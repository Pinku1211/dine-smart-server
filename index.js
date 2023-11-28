
const express = require('express')
const app = express();
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')
const morgan = require('morgan')
require('dotenv').config()
const stripe = require('stripe')(process.env.STRIPE_SECRETE_KEY);
const port = process.env.PORT || 5000;

// middleware
app.use(express.json());
app.use(cors({
  origin: [
    'http://localhost:5173',

  ],
  credentials: true
}));
app.use(cookieParser())
app.use(morgan('dev'))

const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token
  console.log(token)
  if (!token) {
    return res.status(401).send({ message: 'unauthorized access' })
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      console.log(err)
      return res.status(401).send({ message: 'unauthorized access' })
    }
    req.user = decoded
    next()
  })
}



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.r8pib.mongodb.net/?retryWrites=true&w=majority`;

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
    // await client.connect();
    // Send a ping to confirm a successful connection
    const userCollection = client.db('dineSmart').collection('users');
    const mealCollection = client.db('dineSmart').collection('meals');



    // auth api
    app.post('/jwt', async (req, res) => {
      const user = req.body
      console.log('I need a new jwt', user)
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '365d',
      })
      res
        .cookie('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
        })
        .send({ success: true })
    })

    // logout and clear token
    app.get('/logout', async (req, res) => {
      try {
        res
          .clearCookie('token', {
            maxAge: 0,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
          })
          .send({ success: true })
        console.log('Logout successful')
      } catch (err) {
        res.status(500).send(err)
      }
    })


    // Save or modify user email, status in DB
    app.put('/users/:email', async (req, res) => {
      const email = req.params.email
      const user = req.body
      const query = { email: email }
      const options = { upsert: true }
      const isExist = await userCollection.findOne(query)
      console.log('User', isExist)
      if (isExist) return res.send(isExist)
      const result = await userCollection.updateOne(
        query,
        {
          $set: { ...user, timestamp: Date.now() },
        },
        options
      )
      res.send(result)
    })

    // meals related api
    app.get('/meals', async (req, res) => {
      const result = await mealCollection.find().toArray()
      res.send(result)
    })

    app.get('/meal/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await mealCollection.findOne(query);
      res.send(result)
    })
    app.get('/dashboard/all-meals/meal/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await mealCollection.findOne(query);
      res.send(result)
    })

    app.get('/dashboard/all-meals/update/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await mealCollection.findOne(query);
      res.send(result)
    })

    app.post('/meals', async (req, res) => {
      const newMeal = req.body;
      const result = await mealCollection.insertOne(newMeal)
      res.send(result)
    })


    // delete a meal
    app.delete('/dashboard/all-meals/meal/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await mealCollection.deleteOne(query)
      res.send(result)
    })
    


    // update a meal

    app.put('/dashboard/all-meals/meal/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updatedMeal = req.body;
      const job = {
        $set: {
          meal_title: updatedMeal.meal_title,
          meal_type: updatedMeal.name_posted,
          meal_image: updatedMeal.meal_type,
          ingredients: updatedMeal.ingredients,
          description: updatedMeal.description,
          price: updatedMeal.price,
          rating: updatedMeal.rating,
          post_time: updatedMeal.post_time,
          likes: updatedMeal.likes,
          admin_name: updatedMeal.admin_name,
          admin_email: updatedMeal.admin_email,
        }
      }
      const result = await mealCollection.updateOne(filter, job, options);
      res.send(result)
    })


    // user related api----------------------------
    app.get('/users', async (req, res) => {
      const result = await userCollection.find().toArray()
      res.send(result)
    })

    app.get('/user/:email', async (req, res) => {
      const email = req.params.email
      const query = { email: email }
      const result = await userCollection.findOne(query);
      res.send(result)
    })

    app.get('/users/:role', async(req, res) => {
      const role = req.params.role
      const query = {role : role}
      const result = await userCollection.find(query).toArray()
      res.send(result)
    })

    app.get('/user1/:id', async (req, res) => {
      const id = req.params.id
      console.log(id)
      const query = { _id: new ObjectId(id) }
      const result = await userCollection.findOne(query);
      res.send(result)
    })
    app.put('/user1/:id', async(req, res) => {
      const id = req.params.id
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const makeAdmin = {
        $set: {
          "role" : "admin"
        }
      }
      const result = await userCollection.updateOne(filter, makeAdmin, options)
      res.send(result)
    })

    // stripe payment -----------------------------------
    app.post('/create-payment-intent', async (req, res) => {
      const {price} = req.body;
      const amount = parseInt(price * 100);
      console.log('amount', amount)
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      });
      res.send({
        clientSecret: paymentIntent.client_secret
      })
    })
    



    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Hello from template Server..')
})


app.listen(port, () => {
  console.log(`template is running on port ${port}`)
})