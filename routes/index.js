import express from "express"
import authRoutes from "./api/auth.js";
import kostRoutes from "./api/kost.js";

const app = express();

app.use(authRoutes);
app.use(kostRoutes);

export default app;