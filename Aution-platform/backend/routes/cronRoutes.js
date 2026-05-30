import express from "express";
import { runEndedAuctionTasks } from "../automation/endedAuctionCron.js";

const router = express.Router();

const requireCronAccess = (req, res, next) => {
    if (process.env.NODE_ENV !== "production" && !process.env.CRON_SECRET) {
        return next();
    }

    const expectedToken = process.env.CRON_SECRET;
    const authorization = req.get("authorization") || "";
    if (expectedToken && authorization === `Bearer ${expectedToken}`) {
        return next();
    }

    const err = new Error("Cron access denied");
    err.statusCode = 401;
    return next(err);
};

router.get("/auctions", requireCronAccess, async (req, res, next) => {
    try {
        const result = await runEndedAuctionTasks();
        return res.status(200).json({
            success: true,
            task: "auctions",
            result,
        });
    } catch (error) {
        return next(error);
    }
});

router.get("/all", requireCronAccess, async (req, res, next) => {
    try {
        const auctions = await runEndedAuctionTasks();
        return res.status(200).json({
            success: true,
            result: {
                auctions,
            },
        });
    } catch (error) {
        return next(error);
    }
});

export default router;
