import "dotenv/config";
import express from 'express';
import cors from 'cors';
import mongoose from "mongoose";
import { createServer } from "node:http";

import { connectToSocket } from './controllers/socketManager.js';
import userRoute from "./routes/user.routes.js";

const app = express();
const server = createServer(app);

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
connectToSocket(server, CLIENT_URL);

app.use(cors({ origin: CLIENT_URL }));
app.use(express.json({ limit: "40kb" }));
app.use(express.urlencoded({ limit: "40kb", extended: true }));
app.set("port", (process.env.PORT || 8000));

app.use("/api/v1/users", userRoute);

app.use((req, res) => res.status(404).json({ message: "Route not found" }));

const start = async () => {
    if (!process.env.MONGO_URL) {
        console.error("MONGO_URL is missing. Copy .env.example to .env and fill it in.");
        process.exit(1);
    }
    try {
        const MongodbConnection = await mongoose.connect(process.env.MONGO_URL);
        console.log(`MongoDb connected to ${MongodbConnection.connection.host}`);
    } catch (err) {
        console.error("Could not connect to MongoDB:", err.message);
        process.exit(1);
    }
    server.listen(app.get("port"), () => {
        console.log("App is Listening on port " + app.get("port"));
    });
}

start();
