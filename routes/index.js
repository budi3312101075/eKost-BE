import express from "express"
import authRoutes from "./api/auth.js";

const app = express();

app.use(authRoutes);

export default app;