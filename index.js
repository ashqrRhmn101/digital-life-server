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

    // GET - public + private
    app.get("/lessons", async (req, res) => {
      try {
        const {
          search = "",
          category = "",
          tone = "",
          sort = "newest",
          page = 1,
          limit = 12,
          access = "all",
        } = req.query;

        const currentUserEmail = req.user?.email;
        const isPremium = req.user?.isPremium || false;

        let query = { visibility: "public" };

        // search by title or description
        if (search) {
          query.$or = [
            { title: { $regex: search, $options: "i" } },
            { shortDescription: { $regex: search, $options: "i" } },
          ];
        }

        // category filter
        if (category && category !== "all") {
          query.category = category;
        }

        // emotional tone filter
        if (tone && tone !== "all") {
          query.emotionalTone = tone;
        }

        // access level free / premium
        if (!isPremium) {
          query.accessLevel = "free";
        } else if (access !== "all") {
          query.accessLevel = access;
        }

        // sort
        let sortOption = { createdAt: -1 };
        if (sort === "mostSaved") {
          sortOption = { saveCount: -1 };
        } else if (sort === "mostLiked") {
          sortOption = { likes: -1 };
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const result = await lessonsCollection
          .find(query)
          .sort(sortOption)
          .skip(skip)
          .limit(parseInt(limit))
          .toArray();

        const total = await lessonsCollection.countDocuments(query);

        res.send({
          lessons: result,
          total,
          page: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
        });
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Server error" });
      }
    });

    // GET id
    app.get("/lessons/:id", async (req, res) => {
      const id = req.params.id;
      const result = await lessonsCollection.findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $inc: { views: 1 } },
        { returnDocument: "after" }
      );
      res.send(result.value);
    });

    // POST by /lessons/:id/like - like and unlike
    app.post("/lessons/:id/like", async (req, res) => {
      const id = req.params.id;
      const { userId, action } = req.body;
      const update =
        action === "like"
          ? { $addToSet: { likesArray: userId }, $inc: { likes: 1 } }
          : { $pull: { likesArray: userId }, $inc: { likes: -1 } };
      const result = await lessonsCollection.updateOne(
        { _id: new ObjectId(id) },
        update
      );
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
