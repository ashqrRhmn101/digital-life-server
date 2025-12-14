const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();

const port = process.env.PORT || 3000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

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
    const usersCollection = db.collection("users");
    const reportsCollection = db.collection("report");
    const commentsCollection = db.collection("comments");
    const favoritesCollection = db.collection("favorites");

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

    // // GET id by findOneAndUpdate
    // app.get("/lessons/:id", async (req, res) => {
    //   const id = req.params.id;
    //   const result = await lessonsCollection.findOneAndUpdate(
    //     { _id: new ObjectId(id) },
    //     { $inc: { views: 1 } },
    //     { returnDocument: "after" }
    //   );
    //   res.send(result.value);
    // });

    //  get Id
    app.get("/lessons/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await lessonsCollection.findOne(query);
      res.send(result);
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

    // POST /lessons/:id/save
    app.post("/lessons/:id/save", async (req, res) => {
      const id = req.params.id;
      const { userId, action } = req.body;
      const update =
        action === "save"
          ? { $addToSet: { savesArray: userId }, $inc: { saveCount: 1 } }
          : { $pull: { savesArray: userId }, $inc: { saveCount: -1 } };
      const result = await lessonsCollection.updateOne(
        { _id: new ObjectId(id) },
        update
      );
      res.send(result);
    });

    // POST /lessons/:id/report - report lesson
    app.post("/lessons/:id/report", async (req, res) => {
      const id = req.params.id;
      const { reporterId, reason } = req.body;
      const report = {
        lessonId: id,
        reporterId,
        reason,
        timestamp: new Date(),
      };
      await reportsCollection.insertOne(report);
      res.send({ success: true });
    });

    // GET /lessons/:id/comments - fetch comments
    app.get("/lessons/:id/comments", async (req, res) => {
      const id = req.params.id;
      const result = await commentsCollection
        .find({ lessonId: id })
        .sort({ createdAt: -1 })
        .toArray();
      res.send(result);
    });

    // POST /lessons/:id/comments - Post comment
    app.post("/lessons/:id/comments", async (req, res) => {
      const id = req.params.id;
      const { userId, text } = req.body;
      const comment = { lessonId: id, userId, text, createdAt: new Date() };
      await commentsCollection.insertOne(comment);
      res.send(comment);
    });

    // GET /recommended-lessons
    app.get("/recommended-lessons", async (req, res) => {
      const { category, tone, excludeId } = req.query;
      const query = {
        category,
        emotionalTone: tone,
        _id: { $ne: new ObjectId(excludeId) },
      };
      const result = await lessonsCollection.find(query).limit(6).toArray();
      res.send(result);
    });

     // ==================== FAVORITES ====================
    // POST /favorites - Save to favorites
    app.post("/favorites", async (req, res) => {
      try {
        const { userEmail, lessonId } = req.body;

        const existing = await favoritesCollection.findOne({
          userEmail,
          lessonId,
        });
        if (existing) {
          return res.status(400).json({ message: "Already saved" });
        }

        await favoritesCollection.insertOne({
          userEmail,
          lessonId,
          createdAt: new Date(),
        });

        // Increase saveCount
        await lessonsCollection.updateOne(
          { _id: new ObjectId(lessonId) },
          { $inc: { saveCount: 1 }, $addToSet: { savesArray: userEmail } }
        );

        res.json({ success: true });
      } catch (error) {
        console.error("Save favorite error:", error);
        res.status(500).json({ message: "Failed to save" });
      }
    });

    /// User related apis...............
    // ==================== USER RELATED APIs ====================

    //  gte fetch or create User
    app.get("/user", async (req, res) => {
      try {
        const email = req.query.email;
        if (!email) {
          return res.status(400).json({ message: "Email is required" });
        }

        const user = await usersCollection.findOne({ email });

        if (!user) {
          // new user auto create (Register/Login/Google)
          const newUser = {
            email,
            name: "",
            photoURL: "",
            role: "user",
            isPremium: false,
            createdAt: new Date(),
            lastLoginAt: new Date(),
          };
          const result = await usersCollection.insertOne(newUser);
          return res.status(201).json({ ...newUser, _id: result.insertedId });
        }

        // lastLoginAt
        await usersCollection.updateOne(
          { email },
          { $set: { lastLoginAt: new Date() } }
        );

        res.json(user);
      } catch (error) {
        console.error("Error in /user:", error);
        res.status(500).json({ message: "Server error" });
      }
    });

    // Upsert User (register + google login )
    app.put("/users", async (req, res) => {
      try {
        const userData = req.body;
        const { email } = userData;

        if (!email) {
          return res.status(400).json({ message: "Email is required" });
        }

        const result = await usersCollection.updateOne(
          { email },
          {
            $set: {
              name: userData.name,
              photoURL: userData.photoURL,
              lastLoginAt: new Date(),
            },
            $setOnInsert: {
              email: userData.email,
              role: "user",
              isPremium: false,
              createdAt: new Date(),
            },
          },
          { upsert: true }
        );

        res.json({
          success: true,
          upserted: result.upsertedId ? true : false,
          message: result.upsertedId
            ? "User created successfully"
            : "User updated successfully",
        });
      } catch (error) {
        console.error("Error in PUT /users:", error);
        res.status(500).json({ message: "Server error" });
      }
    });

    // By Dashboard
    app.get("/user-stats", async (req, res) => {
      try {
        const email = req.query.email;
        if (!email) return res.status(400).json({ message: "Email required" });

        const [totalLessons, totalFavorites, recentLessons] = await Promise.all(
          [
            lessonsCollection.countDocuments({ creatorEmail: email }),
            favoritesCollection.countDocuments({ userEmail: email }),
            lessonsCollection
              .find({ creatorEmail: email })
              .sort({ createdAt: -1 })
              .limit(6)
              .project({ title: 1, category: 1, createdAt: 1, likes: 1 })
              .toArray(),
          ]
        );

        res.json({
          totalLessons,
          totalFavorites,
          recentLessons,
        });
      } catch (error) {
        console.error("Error in /user-stats:", error);
        res.status(500).json({ message: "Server error" });
      }
    });

    // is's a optional — Admin check
    app.get("/users/admin/:email", async (req, res) => {
      const email = req.params.email;
      const user = await usersCollection.findOne({ email });
      const isAdmin = user?.role === "admin";
      res.json({ isAdmin });
    });

    // Send a ping to confirm a successful connection...............
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
