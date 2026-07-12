import express from "express";
import authRoutes from "./api/auth.js";
import kostRoutes from "./api/kost.js";
import kamarRoutes from "./api/kamar.js";

const app = express();

app.use(authRoutes);
app.use(kostRoutes);
app.use(kamarRoutes);

export default app;
