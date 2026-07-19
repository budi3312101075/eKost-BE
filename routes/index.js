import express from "express";
import authRoutes from "./api/auth.js";
import kostRoutes from "./api/kost.js";
import dataKostRoutes from "./api/dataKost.js";
import pembayaranRoutes from "./api/pembayaran.js";

const app = express();

app.use(authRoutes);
app.use(kostRoutes);
app.use(dataKostRoutes);
app.use(pembayaranRoutes);

export default app;
