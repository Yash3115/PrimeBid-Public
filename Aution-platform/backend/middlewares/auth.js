import asyncErrorHandler from "./asyncErrorHandler.js";
import User from '../models/userSchema.js';
import jwt from 'jsonwebtoken';

const getRequestToken = (req) => {
    if (req.cookies?.token) return req.cookies.token;

    const authorization = req.get("authorization") || "";
    if (authorization.toLowerCase().startsWith("bearer ")) {
        return authorization.slice(7).trim();
    }

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
    req.user = await User.findById(decoded.id);
    if(!req.user){
        const err = new Error("User account no longer exists");
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
        return next();
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if(user && user.accountStatus !== "Paused"){
            req.user = user;
        }
    } catch {
        // Public routes should remain readable even when a stale token is present.
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
