import express from 'express';
import cors from "cors";
import cookieParser from 'cookie-parser';
import fileUpload from 'express-fileupload';
import os from "os";
import { connection, DATABASE_MODES } from './db/connection.js';
import dotenv from 'dotenv';
import userroute from "./routes/userroutes.js";
import errorMiddleware from './middlewares/error.js';
import auctionItemRoute from "./routes/auctionItemRoutes.js";
import bidRoute from "./routes/bidRoute.js";
import superAdminRoutes from "./routes/superAdminRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import cronRoutes from "./routes/cronRoutes.js";
import walletRoutes from "./routes/walletRoutes.js";
import demoRoutes from "./routes/demoRoutes.js";
import { endedAuctionCron } from "./automation/endedAuctionCron.js";
import {
    getReadinessSnapshot,
    requireDatabaseConnection,
    requireProductionDatabase,
} from "./middlewares/database.js";
import { requireTrustedOrigin, securityHeaders } from "./middlewares/security.js";
import { isAllowedOrigin } from "./utils/origin.js";
import { buildDemoMarketplaceResponse } from "./utils/demoMarketplace.js";
import { createDemoRequestContext } from "./utils/demoScope.js";

dotenv.config();
const app=express();
app.set("trust proxy", 1);

app.use(
    cors({
      origin: (origin, callback) => {
        if (isAllowedOrigin(origin)) {
          return callback(null, true);
        }
        return callback(new Error("Not allowed by CORS"));
      },
      methods: ["POST", "GET", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: true,
    })
  );

app.use(securityHeaders);
app.use(requireTrustedOrigin);
app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended:true, limit: "1mb" }));
app.use(createDemoRequestContext);
app.use(fileUpload({
    useTempFiles: true,
    tempFileDir: os.tmpdir(),
    limits: { fileSize: 2 * 1024 * 1024 },
}));

app.get("/",(req,res)=>{
    res.send("server is running");
})

app.get("/health",(req,res)=>{
    res.status(200).json({
        success: true,
        status: "ok",
        uptime: process.uptime(),
    });
})

app.get("/ready",(req,res)=>{
    const readiness = getReadinessSnapshot();
    res.status(readiness.production.connected ? 200 : 503).json({
        success: readiness.production.connected,
        status: readiness.production.connected ? "ready" : "not_ready",
        database: readiness.production.connected ? "connected" : "disconnected",
        databases: readiness,
        error: readiness.production.connected ? null : "Database temporarily unavailable",
    });
})

const allowDemoMarketplaceFallback =
    process.env.NODE_ENV !== "production" &&
    process.env.DISABLE_DEMO_MARKETPLACE_FALLBACK !== "true";

app.get("/api/v1/auctionitem/allitems", (req, res, next) => {
    const database = getReadinessSnapshot().production;
    if (database.connected || !allowDemoMarketplaceFallback) {
        return next();
    }

    return res.status(200).json(buildDemoMarketplaceResponse());
});

app.use("/api/v1/user", requireDatabaseConnection(), userroute)
app.use("/api/v1/auctionitem", requireDatabaseConnection(), auctionItemRoute)
app.use("/api/v1/bid", requireDatabaseConnection(), bidRoute);
app.use("/api/v1/superadmin", requireDatabaseConnection(), superAdminRoutes);
app.use("/api/v1/ai", requireDatabaseConnection(), aiRoutes);
app.use("/api/v1/cron", requireProductionDatabase, cronRoutes);
app.use("/api/v1/wallet", requireDatabaseConnection(), walletRoutes);
app.use("/api/v1/demo", demoRoutes);

app.use((req, res, next) => {
    const err = new Error(`Route not found: ${req.originalUrl}`);
    err.statusCode = 404;
    next(err);
});

app.use(errorMiddleware);

const shouldStartLocalServer = !process.env.VERCEL && process.env.NODE_ENV !== "test";

if (shouldStartLocalServer) {
  const port = process.env.PORT || 8000;
  app.listen(port, () => {
      console.log(`listening on http://localhost:${port}`);
  });

  connection(DATABASE_MODES.PRODUCTION).then(() => {
    endedAuctionCron();
  }).catch((error) => {
    console.error(
      "Database connection failed. DB-backed routes will return errors until the database is reachable:",
      error.message
    );
  });
}

export default app;
