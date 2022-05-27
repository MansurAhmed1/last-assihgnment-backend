



const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');


/////////monney transper er jonno/////////////
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
/////////monney transper er jonno/////////////


const app = express();
const port = process.env.PORT || 5000;

// app.use(cors({origin:"*"}));
// app.use(express.json());

const corsConfig = {
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE',"PATCH"]
}
app.use(cors(corsConfig))
app.options("", cors(corsConfig))
app.use(express.json())
app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*")
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept,authorization")
  next()
})







var uri = `mongodb://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0-shard-00-00.v85be.mongodb.net:27017,cluster0-shard-00-01.v85be.mongodb.net:27017,cluster0-shard-00-02.v85be.mongodb.net:27017/?ssl=true&replicaSet=atlas-e24feo-shard-0&authSource=admin&retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1
})






function  verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  const token = authHeader.split(" ")[1];
  console.log(token)
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).send({ message: "Forbidden access" });
    }
    console.log("decoded", decoded);
    req.decoded = decoded;
    next();
  });
}





async function run() {
  try {
    await client.connect();
    const serviceCollection = client.db('test').collection('testCollection');
    const userCollection = client.db('test').collection('userCollection');
    const paymentCollection = client.db('test').collection('PaymentCollection');
    const reviewCollection = client.db('test').collection('reviewCollection');
    const orderCollection = client.db('test').collection('orderCollection');
    const profileColllection=client.db('test').collection('profileCollection');




//////////////////review post ////////////////////

app.post("/reviews", async (req, res) => {
  const newproduct = req.body;
 
  const result = await reviewCollection.insertOne(newproduct);
  res.send(result);
});






//////profile post
app.post("/profile", async (req, res) => {
  const newproduct = req.body;
 
  
  const result = await profileColllection.insertOne(newproduct);
  res.send(result);
});




app.get("/profile",  async (req, res) => {
  const email = req.query.email;
  
    const query = { email: email };
    const cursor = profileColllection.find(query);
    const  profileData= await cursor.toArray();
    res.send(profileData);

   
});







///////////order post 



app.post("/order", async (req, res) => {
  const order = req.body;
 
  const result = await orderCollection.insertOne(order);
  res.send(result);
});




//////////your order
app.get("/order",  async (req, res) => {
  const email = req.query.email;
 


    const query = { email: email };
    const cursor = orderCollection.find(query);
    const products = await cursor.toArray();
    res.send(products);

   
});







app.post("/added", async (req, res) => {
  const order = req.body;
  
  const result = await serviceCollection.insertOne(order);
  res.send(result);
});



app.delete("/delete/:id", async (req, res) => {
  const id = req.params.id;
  
  const query = { _id: ObjectId(id) };
  const result = await orderCollection.deleteOne(query);
  res.send(result);
});






app.delete("/deleteproduct/:id", async (req, res) => {
  const id = req.params.id;
 
  const query = { _id: ObjectId(id) };
  const result = await serviceCollection.deleteOne(query);
  res.send(result);
});




// app.get('/order', verifyJWT, async (req, res) => {
//   const email = req.query.email;
//   console.log(email)
//   const decodedEmail = req.decoded.email;
//   console.log(email)
//   if (email === decodedEmail) {
//     const query = { email: email };
//     const order =  await orderCollection.find(query).toArray();;
//     return res.send(order);
//   }
//   else {
//     return res.status(403).send({ message: 'forbidden access' });
//   }
// });
/////////////







app.get('/reviews', async (req, res) => {
  const query = {};
  const cursor = reviewCollection.find(query)
  const services = await cursor.toArray();
  res.send(services);
});




//////////////////////varify admin//////////////////
    const verifyAdmin = async (req, res, next) => {
      const requester = req.decoded.email;
      const requesterAccount = await userCollection.findOne({ email: requester });
      if (requesterAccount.role === 'admin') {
        next();
      }
      else {
        res.status(403).send({ message: 'forbidden' });
      }
    }
 ////////////////////varify admin////////////////////





//  verifyJWT,   eita stripe er inter nal
/////////////////////////card paument kora////////////////////////////////
    app.post('/create-payment-intent',async(req, res) =>{
      const service = req.body;
     
      const price = service.price;
      const amount = parseInt(price) *100;
      const paymentIntent = await stripe.paymentIntents.create({
        amount : amount,
        currency: 'usd',
        payment_method_types:['card']
      });
      res.send({clientSecret: paymentIntent.client_secret})
    });
/////////////////////////card paument kora////////////////////////////////


// verifyJWT,
// ///////////////////payment korar somoy alada pruduct er payment kora//////////
app.patch('/pay/:id',async(req, res) =>{
  const id  = req.params.id;
  console.log(id)
  const payment = req.body;
  console.log(payment)
  const filter = {_id: ObjectId(id)};
  const updatedDoc = {
    $set: {
      paid: true,
      pending:true,
      transactionId: payment.transactionId
    }
  }

  const result = await paymentCollection.insertOne(payment);
  const updatedBooking = await orderCollection.updateOne(filter, updatedDoc);
  res.send(updatedBooking);
})
// ///////////////////payment korar somoy alada pruduct er payment kora///////////




/////////update order when shipment
app.put("/order/update/:id",async (req, res) => {
  const id = req.params.id;
 
  const updateOrder = req.body;
 
  const filter = { _id: ObjectId(id) };
  const options = { upsert: true };
  const updatedDoc = {
    $set: updateOrder
  };
  const result = await orderCollection.updateOne(
    filter,
    updatedDoc,
    options
  );
  res.send(result);
});



    app.get('/service',async (req, res) => {
      const query = {};
      const cursor = serviceCollection.find(query)
      const services = await cursor.toArray();
      res.send(services);
    });




/////////////////////single data with id
app.get("/service/:id", async (req, res) => {
  const id = req.params.id;

  const query = { _id: ObjectId(id) };
  const product = await serviceCollection.findOne(query);
  res.send(product);
});


app.get("/pay/:id", async (req, res) => {
  const id = req.params.id;

  const query = { _id: ObjectId(id) };
  const product = await orderCollection.findOne(query);
  res.send(product);
});




app.get('/orders', async (req, res) => {
  const query = {};
  const cursor = orderCollection.find(query)
  const services = await cursor.toArray();
  res.send(services);
});








    
/////////////////////////////////user er data load korar niom//////////////////////
app.get('/user',  async (req, res) => {
  const users = await userCollection.find().toArray();
  res.send(users);
});
/////////////////////////////////user er data load korar niom//////////////////////



app.delete("/user/:id", async (req, res) => {
  const id = req.params.id;
  const query = { _id: ObjectId(id) };
  const result = await userCollection.deleteOne(query);
  res.send(result);
});
  


///////////////////////////////////[requ1ired admin] object er moddo role==admin hole true return korbe ebong jodi true return kore tahole ami koekta router sorto die dekhabo //////////////////////////////////////////////
app.get('/admin/:email', async(req, res) =>{
  const email = req.params.email;
  const user = await userCollection.findOne({email: email});
    const isAdmin = user?.role === 'admin';
    console.log("admin",isAdmin)
    res.send({admin: isAdmin})
})
///////////////////////////////////[required admin] object er moddo role==admin hole true return korbe ebong jodi true return kore tahole ami koekta router sorto die dekhabo //////////////////////////////////////////////







////////////////////////////////for admin nije chara keu dekhte parbena////////////////////////
    app.put('/user/admin/:email', verifyJWT, verifyAdmin, async (req, res) => {
      const email = req.params.email;
      
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: { role: 'admin' },
      };
      const result = await userCollection.updateOne(filter, updateDoc,options);
      res.send(result);
    })
////////////////////////////////for admin nije chara keu dekhte parbena////////////////////////






////////////////////login korar somoy user je token create kore oita ba useToken er jonno/////////////////
    app.put('/user/:email', async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
      res.send({ result, token });
    });
    
////////////////////login korar somoy user je token create kore oita ba useToken er jonno/////////////////
   


  }
  finally {

  }
}
 //////////////doctor ke post kora/////////////////  


run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Hello From Assihnmnet 12')
})

app.listen(port, () => {
  console.log(`assihnmnet12 on port ${port}`)
})