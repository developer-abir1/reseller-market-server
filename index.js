const express = require('express');
const app = express();
const cors = require('cors');
const port = process.env.PORT || 5000;
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.myfzpsp.mongodb.net/?retryWrites=true&w=majority`;

app.use(express.json());
app.use(cors());

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ massage: ' unauthorization access' });
  }
  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
    if (err) {
      return res.status(403).send({ massage: ' forbidden access' });
    }
    req.decoded = decoded;
    next();
  });
};

async function run() {
  try {
    const userCollection = client.db('sceoundBikeDb').collection('users');

    const productsCollection = client
      .db('sceoundBikeDb')
      .collection('products');
    const bookingCollection = client.db('sceoundBikeDb').collection('booking');

    //jwt token ----------------------------------------------

    app.post('/jwt', (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN, {
        expiresIn: '2h',
      });
      res.send({ token });
    });

    app.post('/products', verifyToken, async (req, res) => {
      const product = req.body;
      const result = await productsCollection.insertOne(product);
      res.send(result);
    });

    // get all products
    app.get('/products', verifyToken, async (req, res) => {
      const cursor = productsCollection.find({});
      const products = await cursor.toArray();
      res.send(products);
    });
    // get single Products
    app.get('/product', verifyToken, async (req, res) => {
      const decoded = req.decoded;

      if (decoded.email !== req.query.email) {
        res.status(403).send({ message: ' forbidden Access' });
      }

      const email = req.query.email;
      const query = { email: email };
      const result = await productsCollection.find(query).toArray();
      res.send(result);
    });
    app.get('/product/:id', verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await productsCollection.findOne(query);
      res.send(result);
    });

    // save login user in database
    app.post('/users', async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const alreadyUser = await userCollection.findOne(query);
      if (alreadyUser) {
        return res.status(401).send({ massage: 'user already exist' });
      }
      const user = req.body;
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    app.get('/users', async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = userCollection.find(query);
      const users = await result.toArray();
      res.send(users);
    });

    // -------------------------------------------------------------------- update user profile -------------------------------------------------

    app.put('/users/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const userInfo = req.body;
      const option = { upsert: true };
      const updateDoc = {
        $set: {
          displayName: userInfo.displayName,
          email: userInfo.email,
          phoneNumber: userInfo.phoneNumber,
          address: userInfo.address,
          photoURL: userInfo.photoURL,
        },
      };
      const result = await userCollection.updateOne(filter, updateDoc, option);
      res.send(result);
    });

    // -------------------------------------------------------------------- update user profile end -------------------------------------------------
    // -----------------------------------------user product booking---------------------------------------------------------------------------------------

    app.post('/booking', async (req, res) => {
      const booking = req.body;
      const result = await bookingCollection.insertOne(booking);
      res.send(result);
    });

    app.get('/booking', async (req, res) => {
      const result = await bookingCollection.find({}).toArray();
      res.send(result);
    });

    // <-------------------------------------------------------------------------------------------------------------------------------------------->
    //  admin panel
    app.get('/users/admin', async (req, res) => {
      const result = await userCollection.find({}).toArray();
      res.send(result);
    });

    app.put('/users/admin/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const option = { upsert: true };
      const updateDoc = { $set: { role: 'admin' } };
      const result = await userCollection.updateOne(filter, updateDoc, option);
      res.send(result);
    });
    app.delete('/users/admin/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };

      const result = await userCollection.deleteOne(filter);
      res.send(result);
    });
    app.patch('/users/admin/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const option = { upsert: true };
      const updateDoc = { $unset: { role: 'admin' } };
      const result = await userCollection.updateOne(filter, updateDoc, option);
      res.send(result);
    });
    // <-------------------------------------------------------------------------------------------------------------------------------------------->
  } finally {
  }
}

run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
