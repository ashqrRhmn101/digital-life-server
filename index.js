const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();

const port = process.env.PORT || 3000;
const { MongoClient, ServerApiVersion } = require("mongodb");

// middleware
app.use(express.json());
app.use(cors());

// MongoDB server & apis.....................
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.yaijel2.mongodb.net/?appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

app.get("/", (req, res) => {
  res.send("Server connect.......");
});

async function run() {
  try {
    const db = client.db("digitalLife_db");
    const lessonsCollection = db.collection("lessons");

    // lessons apis.................
    app.get("/lessons", async (req, res) => {
      const query = {};
      const { email } = req.query;
      if (email) {
        query.creatorEmail = email;
      }

      const cursor = lessonsCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
