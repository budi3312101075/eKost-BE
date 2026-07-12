import express from "express";
import authRoutes from "./api/auth.js";
import kostRoutes from "./api/kost.js";
import dataKostRoutes from "./api/dataKost.js";

const app = express();

app.use(authRoutes);
app.use(kostRoutes);
app.use(dataKostRoutes);

export default app;
