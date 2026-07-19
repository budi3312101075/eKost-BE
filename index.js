import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { scheduleJob } from "node-schedule";
import cluster from "node:cluster";
import { availableParallelism } from "node:os";
import cookieParser from "cookie-parser";
import Routes from "./routes/index.js";

const totalCPU = availableParallelism();

if (cluster.isMaster) {
  for (let i = 0; i < totalCPU; i++) {
    cluster.fork();

    if (i === 1) {
      scheduleJob("0 1 * * *", async function () {});
    }
  }
} else {
  startExpress();
}

function startExpress() {
  dotenv.config();
  const app = express();

  app.use(
    cors({
      origin: process.env.CORS,
      credentials: true,
    }),
  );

  app.use(cookieParser());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use("/api/v1", Routes);
  app.use("/public", express.static("public"));

  app.listen(process.env.APP_PORT, () => {
    console.log(
      `⚡️[server]: Server is running at ${process.env.IP}:${process.env.APP_PORT}`,
    );
  });
}
