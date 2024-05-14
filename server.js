const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const session = require("express-session");

const saltRounds = 10;

const app = express();
const port = 3001;

app.use(express.static(__dirname));
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(
  session({
    secret: "xxxxx",
    resave: false,
    saveUninitialized: true,
  })
);

const uri =
  "mongodb://localhost:27017/";
const client = new MongoClient(uri);

async function connectToDB() {
  try {
    await client.connect();
    console.log("Connected to MongoDB");
    const db = client.db("StudySync");

    // Define a route for the root path
    app.get("/", (req, res) => {
      res.sendFile(__dirname + "/studysync/index.html");
    });

    // Define a route for the login page
    app.get("/login", (req, res) => {
      res.sendFile(__dirname + "/login.html");
    });

    // Define a route for the signup page
    app.get("/Register", (req, res) => {
      res.sendFile(__dirname + "/Register.html");
    });

    // Signup route
    app.post("/Register", async (req, res) => {
      const { username, email, password } = req.body;

      try {
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const result = await db.collection("users").insertOne({
          username: username,
          email: email,
          password: hashedPassword,
        });

        if (result && result.acknowledged) {
          req.session.user = {
            username: username,
            email: email,
          };

          console.log("User inserted successfully:", result.insertedId);

          // Redirect to index
          return res.redirect("/index.html");
        } else {
          console.error("Failed to insert user:", result);
          return res.status(500).send("Failed to insert user");
        }
      } catch (error) {
        console.error("Error during signup:", error);
        return res
          .status(500)
          .send("Internal server error during signup: " + error.message);
      }
    });

    // Login route
    app.post("/login", async (req, res) => {
      const { username, password } = req.body;

      try {
        const user = await db
          .collection("users")
          .findOne({ username: username });

        if (user) {
          const passwordMatch = await bcrypt.compare(password, user.password);

          if (passwordMatch) {
            req.session.user = {
              username: username,
              email: user.email,
              userId: user._id,
            };

            console.log("Login successful for user:", username);

            // Check if the session is active
            if (req.session && req.session.user) {
              console.log(
                "Session is active for user:",
                req.session.user.username
              );
            } else {
              console.log("Session is not active");
            }

            return res.redirect("/homepage.html");
          } else {
            console.error("Invalid password for user:", username);
            return res.status(401).send("Invalid username or password");
          }
        } else {
          console.error("User not found:", username);
          return res.status(401).send("Invalid username or password");
        }
      } catch (error) {
        console.error("Error during login:", error);
        return res
          .status(500)
          .send("Internal server error during login: " + error.message);
      }
    });

    // Logout route
    app.get("/logout", (req, res) => {
      req.session.destroy((err) => {
        if (err) {
          console.error("Error destroying session:", err);
          return res.status(500).send("Internal server error");
        }
        console.log("Session ended successfully");
        res.redirect("/");
      });
    });

    app.post("/createTask", async (req, res) => {
      console.log(req.body, req.session.user);
      const { priority, status, taskDescription, title, dueDate } = req.body;
      console.log(priority, status, taskDescription);

      try {
        if (!priority || !status || !taskDescription) {
          return res.status(400).send("Priority and status are required");
        }

        const result = await db.collection("tasks").insertOne({
          title: title,
          dueDate: dueDate,
          priority: priority,
          status: status,
          taskDescription: taskDescription,
          userId: req.session.user.userId,
        });

        if (result && result.acknowledged) {
          console.log(
            "Task inserted successfully:",
            result.insertedId.toString()
          );
          return res.status(201).json(result.insertedId.toString());
        } else {
          console.error("Failed to insert task:", result);
          return res.status(500).send("Failed to insert task");
        }
      } catch (error) {
        console.error("Error creating task:", error);
        return res.status(500).send("Internal server error: " + error.message);
      }
    });

    app.get("/tasks", async (req, res) => {
      try {
        const userId = req.session.user.userId;
        const tasks = await db
          .collection("tasks")
          .find({ userId: userId })
          .toArray();
        res.json(tasks);
      } catch (error) {
        console.error("Error retrieving tasks:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    app.put("/tasks/:taskId", async (req, res) => {
      const { taskId } = req.params;
      const { status } = req.body;

      try {
        const result = await db
          .collection("tasks")
          .updateOne({ _id: ObjectId(taskId) }, { $set: { status: status } });
        if (result.modifiedCount === 1) {
          res.status(200).send("Task status updated successfully");
        } else {
          res.status(404).send("Task not found");
        }
      } catch (error) {
        console.error("Error updating task status:", error);
        res.status(500).send("Internal server error");
      }
    });

    app.post("/createDeadline", async (req, res) => {
      console.log(req.body, req.session.user);
      const { title, description, selectedDate,priority } = req.body;

      try {
        if (!title || !description || !selectedDate) {
          return res
            .status(400)
            .send("Title, description, and selected date are required");
        }

        const result = await db.collection("deadline").insertOne({
          title: title,
          description: description,
          selectedDate: selectedDate,
          userId: req.session.user.userId,
          priority:priority
        });

        if (result && result.acknowledged) {
          console.log(
            "Task inserted successfully:",
            result.insertedId.toString()
          );
          return res.status(201).json(result.insertedId.toString());
        } else {
          console.error("Failed to insert task:", result);
          return res.status(500).send("Failed to insert task");
        }
      } catch (error) {
        console.error("Error creating task:", error);
        return res.status(500).send("Internal server error: " + error.message);
      }
    });

    app.get("/deadline", async (req, res) => {
      try {
        const userId = req.session.user.userId;
        const tasks = await db
          .collection("deadline")
          .find({ userId: userId })
          .toArray();
        res.json(tasks);
      } catch (error) {
        console.error("Error retrieving deadline:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    app.post("/createNote", async (req, res) => {
      console.log(req.body, req.session.user);
      const { title, content } = req.body;

      try {
        if (!title || !content) {
          return res.status(400).send("Title and content are required");
        }

        const result = await db.collection("notes").insertOne({
          title: title,
          content: content,
          userId: req.session.user.userId,
        });

        if (result && result.acknowledged) {
          console.log(
            "Note inserted successfully:",
            result.insertedId.toString()
          );
          return res.status(201).json(result.insertedId.toString());
        } else {
          console.error("Failed to insert note:", result);
          return res.status(500).send("Failed to insert note");
        }
      } catch (error) {
        console.error("Error creating note:", error);
        return res.status(500).send("Internal server error: " + error.message);
      }
    });

    app.post("/createCornellNote", async (req, res) => {
      console.log(req.body, req.session.user);
      const { title, cueContent,
        notesContent,
        summaryContent } = req.body;

      try {
        if (!title || !cueContent || !notesContent || !summaryContent) {
          return res.status(400).send("Title and content are required");
        }

        const result = await db.collection("cornellNotes").insertOne({
          title: title,
          cueContent,
          notesContent,
          summaryContent,
          userId: req.session.user.userId,
        });

        if (result && result.acknowledged) {
          console.log(
            "Note inserted successfully:",
            result.insertedId.toString()
          );
          return res.status(201).json(result.insertedId.toString());
        } else {
          console.error("Failed to insert note:", result);
          return res.status(500).send("Failed to insert note");
        }
      } catch (error) {
        console.error("Error creating note:", error);
        return res.status(500).send("Internal server error: " + error.message);
      }
    });

    app.get("/notes", async (req, res) => {
      try {
        const userId = req.session.user.userId;
        const tasks = await db
          .collection("notes")
          .find({ userId: userId })
          .toArray();
        res.json(tasks);
      } catch (error) {
        console.error("Error retrieving deadline:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    app.get("/cornellNotes", async (req, res) => {
      try {
        const userId = req.session.user.userId;
        const tasks = await db
          .collection("cornellNotes")
          .find({ userId: userId })
          .toArray();
        res.json(tasks);
      } catch (error) {
        console.error("Error retrieving cornell notes:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    app.get("/dashboard", async (req, res) => {
      try {
        const userId = req.session.user.userId;

        const recentDeadlines = await db
          .collection("deadline")
          .find({ userId: userId })
          .sort({ selectedDate: 1 })
          .limit(3)
          .toArray();

        const pendingTasks = await db
          .collection("tasks")
          .find({ userId: userId, status: "In Progress" })
          .limit(3)
          .toArray();

        const recentNotes = await db
          .collection("notes")
          .find({ userId: userId })
          .sort({ _id: -1 })
          .limit(3)
          .toArray();

        const dashboardData = {
          recentDeadlines: recentDeadlines,
          pendingTasks: pendingTasks,
          recentNotes: recentNotes,
        };
        res.json(dashboardData);
      } catch (error) {
        console.error("Error retrieving dashboard data:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    app.delete("/deleteNote/:id", async (req, res) => {
      const noteId = req.params.id;
  
      try {
          const note = await db.collection("notes").findOne({ _id: ObjectId(noteId) });
          if (!note) {
              return res.status(404).json({ error: "Note not found" });
          }
  
          if (note.userId !== req.session.user.userId) {
              return res.status(403).json({ error: "Unauthorized to delete this note" });
          }
  
          const result = await db.collection("notes").deleteOne({ _id: ObjectId(noteId) });
          if (result && result.deletedCount === 1) {
              console.log("Note deleted successfully:", noteId);
              return res.status(200).json({ message: "Note deleted successfully" });
          } else {
              console.error("Failed to delete note:", result);
              return res.status(500).send("Failed to delete note");
          }
      } catch (error) {
          console.error("Error deleting note:", error);
          return res.status(500).send("Internal server error: " + error.message);
      }
  });

  app.delete("/deletecornellNote/:id", async (req, res) => {
    const noteId = req.params.id;

    try {
        const note = await db.collection("cornellNotes").findOne({ _id: ObjectId(noteId) });
        if (!note) {
            return res.status(404).json({ error: "Note not found" });
        }

        if (note.userId !== req.session.user.userId) {
            return res.status(403).json({ error: "Unauthorized to delete this note" });
        }

        const result = await db.collection("cornellNotes").deleteOne({ _id: ObjectId(noteId) });
        if (result && result.deletedCount === 1) {
            console.log("Note deleted successfully:", noteId);
            return res.status(200).json({ message: "Note deleted successfully" });
        } else {
            console.error("Failed to delete note:", result);
            return res.status(500).send("Failed to delete note");
        }
    } catch (error) {
        console.error("Error deleting note:", error);
        return res.status(500).send("Internal server error: " + error.message);
    }
});


    app.delete("/deadline/:id", async (req, res) => {
      const deadlineId = req.params.id;

      try {
          const deadline = await db.collection("deadline").findOne({ _id: ObjectId(deadlineId) });
          if (!deadline) {
              return res.status(404).json({ error: "Deadline not found" });
          }
          if (deadline.userId !== req.session.user.userId) {
              return res.status(403).json({ error: "Unauthorized to delete this deadline" });
          }

          const result = await db.collection("deadline").deleteOne({ _id: ObjectId(deadlineId) });
          if (result && result.deletedCount === 1) {
              console.log("Deadline deleted successfully:", deadlineId);
              return res.status(200).json({ message: "Deadline deleted successfully" });
          } else {
              console.error("Failed to delete deadline:", result);
              return res.status(500).send("Failed to delete deadline");
          }
      } catch (error) {
          console.error("Error deleting deadline:", error);
          return res.status(500).send("Internal server error: " + error.message);
      }
  });

  app.delete("/tasks/:id", async (req, res) => {
    const taskId = req.params.id;

    try {
        const task = await db.collection("tasks").findOne({ _id: ObjectId(taskId) });
        if (!task) {
            return res.status(404).json({ error: "Task not found" });
        }

        if (task.userId !== req.session.user.userId) {
            return res.status(403).json({ error: "Unauthorized to delete this task" });
        }

        const result = await db.collection("tasks").deleteOne({ _id: ObjectId(taskId) });
        if (result && result.deletedCount === 1) {
            console.log("Task deleted successfully:", taskId);
            return res.status(200).json({ message: "Task deleted successfully" });
        } else {
            console.error("Failed to delete task:", result);
            return res.status(500).send("Failed to delete task");
        }
    } catch (error) {
        console.error("Error deleting task:", error);
        return res.status(500).send("Internal server error: " + error.message);
    }
  });


    // Start the server
    app.listen(port, () => {
      console.log(`StudySync server is running at http://localhost:${port}`);
    });
  } catch (err) {
    console.error("Failed to connect to MongoDB", err);
  }
}

connectToDB();
