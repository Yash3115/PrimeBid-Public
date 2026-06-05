import asyncErrorHandler from "./asyncErrorHandler.js";
import User from '../models/userSchema.js';
import DemoSession from "../models/demoSessionSchema.js";
import jwt from 'jsonwebtoken';
import { DATABASE_MODES } from "../db/connection.js";
import {
    clearDemoScope,
    isDemoModeEnabled,
    setDatabaseMode,
    setDemoScope,
} from "../utils/demoScope.js";

const getRequestToken = (req) => {
    const authorization = req.get("authorization") || "";
    if (authorization.toLowerCase().startsWith("bearer ")) {
        return authorization.slice(7).trim();
    }

    if (req.cookies?.token) return req.cookies.token;

    return null;
};

const isAuth = asyncErrorHandler(async(req,res,next)=>{
    const token = getRequestToken(req);
    if(!token){
        const err = new Error("User is not authenticated");
        err.statusCode=401;
        return next(err);
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const tokenIsDemo = decoded.mode === DATABASE_MODES.DEMO || decoded.isDemo;
    if (tokenIsDemo) {
        if (!isDemoModeEnabled()) {
            const err = new Error("Demo mode is not available");
            err.statusCode = 403;
            return next(err);
        }
        setDatabaseMode(DATABASE_MODES.DEMO);
        setDemoScope({
            isDemo: true,
            demoSessionId: decoded.demoSessionId,
            demoExpiresAt: decoded.demoExpiresAt,
        });
    } else {
        setDatabaseMode(DATABASE_MODES.PRODUCTION);
        clearDemoScope();
    }
    req.user = await User.findById(decoded.id);
    if(!req.user){
        const err = new Error("User account no longer exists");
        err.statusCode=401;
        return next(err);
    }
    if (tokenIsDemo) {
        const tokenSessionId = decoded.demoSessionId?.toString?.() || String(decoded.demoSessionId || "");
        const userSessionId = req.user.demoSessionId?.toString?.() || "";
        const tokenExpiry = decoded.demoExpiresAt ? new Date(decoded.demoExpiresAt) : null;
        if (
            req.user.isDemo !== true ||
            !tokenSessionId ||
            tokenSessionId !== userSessionId ||
            !tokenExpiry ||
            tokenExpiry <= new Date()
        ) {
            const err = new Error("Demo session expired. Please start a new demo.");
            err.statusCode=401;
            return next(err);
        }
        const demoSession = await DemoSession.findOne({
            _id: tokenSessionId,
            status: "Active",
            expiresAt: { $gt: new Date() },
        });
        if (!demoSession) {
            const err = new Error("Demo session expired. Please start a new demo.");
            err.statusCode=401;
            return next(err);
        }
        req.isDemo = true;
        req.demoSessionId = demoSession._id;
        req.demoExpiresAt = demoSession.expiresAt;
        req.demoPersona = decoded.demoPersona || req.user.role;
    } else if (req.user.isDemo) {
        const err = new Error("Demo users must use a demo session token");
        err.statusCode=401;
        return next(err);
    }
    if(req.user.accountStatus === "Paused"){
        const err = new Error("Your account is paused. Please contact support.");
        err.statusCode=403;
        return next(err);
    }
    next();
});

const optionalAuth = asyncErrorHandler(async(req,res,next)=>{
    const token = getRequestToken(req);
    if(!token){
        clearDemoScope();
        return next();
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const tokenIsDemo = decoded.mode === DATABASE_MODES.DEMO || decoded.isDemo;
        if (tokenIsDemo) {
            if (!isDemoModeEnabled()) {
                clearDemoScope();
                return next();
            }
            setDatabaseMode(DATABASE_MODES.DEMO);
            setDemoScope({
                isDemo: true,
                demoSessionId: decoded.demoSessionId,
                demoExpiresAt: decoded.demoExpiresAt,
            });
        } else {
            setDatabaseMode(DATABASE_MODES.PRODUCTION);
            clearDemoScope();
        }
        const user = await User.findById(decoded.id);
        if(user && user.accountStatus !== "Paused"){
            if (tokenIsDemo) {
                const tokenSessionId = decoded.demoSessionId?.toString?.() || String(decoded.demoSessionId || "");
                const userSessionId = user.demoSessionId?.toString?.() || "";
                const demoSession = tokenSessionId
                    ? await DemoSession.findOne({
                        _id: tokenSessionId,
                        status: "Active",
                        expiresAt: { $gt: new Date() },
                    })
                    : null;
                if (user.isDemo === true && demoSession && tokenSessionId === userSessionId) {
                    req.user = user;
                    req.isDemo = true;
                    req.demoSessionId = demoSession._id;
                    req.demoExpiresAt = demoSession.expiresAt;
                    req.demoPersona = decoded.demoPersona || user.role;
                } else {
                    clearDemoScope();
                }
            } else if (!user.isDemo) {
                req.user = user;
            }
        }
    } catch {
        // Public routes should remain readable even when a stale token is present.
        clearDemoScope();
        req.user = undefined;
    }

    next();
});

const isAuthorised = (...roles)=>{
    return (req,res,next)=>{
        if(!roles.includes(req.user.role)){
            const err = new Error("User is not authorized to perform this action");
            err.statusCode=403;
            return next(err);
        }
        next();
    }
}

export {isAuth,isAuthorised, optionalAuth, getRequestToken};
