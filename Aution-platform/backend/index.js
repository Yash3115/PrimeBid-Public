import express from 'express';
import cors from "cors";
import cookieParser from 'cookie-parser';
import fileUpload from 'express-fileupload';
import os from "os";
import { connection } from './db/connection.js';
import dotenv from 'dotenv';
import userroute from "./routes/userroutes.js";
import errorMiddleware from './middlewares/error.js';
import auctionItemRoute from "./routes/auctionItemRoutes.js";
import bidRoute from "./routes/bidRoute.js";
import superAdminRoutes from "./routes/superAdminRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import cronRoutes from "./routes/cronRoutes.js";
import walletRoutes from "./routes/walletRoutes.js";
import { endedAuctionCron } from "./automation/endedAuctionCron.js";
import { requireTrustedOrigin, securityHeaders } from "./middlewares/security.js";
import { isAllowedOrigin } from "./utils/origin.js";

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

app.use(async (req, res, next) => {
    try {
        await connection();
        next();
    } catch (error) {
        next(error);
    }
});

app.get("/ready",(req,res)=>{
    res.status(200).json({
        success: true,
        status: "ready",
        database: "connected",
    });
})

app.use("/api/v1/user",userroute)
app.use("/api/v1/auctionitem",auctionItemRoute)
app.use("/api/v1/bid",bidRoute);
app.use("/api/v1/superadmin",superAdminRoutes);
app.use("/api/v1/ai",aiRoutes);
app.use("/api/v1/cron",cronRoutes);
app.use("/api/v1/wallet",walletRoutes);

app.use((req, res, next) => {
    const err = new Error(`Route not found: ${req.originalUrl}`);
    err.statusCode = 404;
    next(err);
});

app.use(errorMiddleware);

const shouldStartLocalServer = !process.env.VERCEL && process.env.NODE_ENV !== "test";

if (shouldStartLocalServer) {
  connection().then(() => {
    endedAuctionCron();
    const port = process.env.PORT || 8000;
    app.listen(port, () => {
        console.log(`listening on http://localhost:${port}`);
    });
  }).catch((error) => {
    console.error("Failed to start server:", error);
    process.exit(1);
  });
}

export default app;
