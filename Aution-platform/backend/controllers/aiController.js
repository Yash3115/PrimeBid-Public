import asyncErrorHandler from "../middlewares/asyncErrorHandler.js";
import { AUCTION_CATEGORIES, AUCTION_CONDITIONS } from "../constants/auctionOptions.js";

const normalizeText = (value) => (typeof value === "string" ? value.trim() : "");
const clampString = (value, max = 2200) => normalizeText(value).slice(0, max);

const getGeminiConfig = () => {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (process.env.AI_FEATURES_ENABLED !== "true" || !apiKey) {
        const err = new Error("Gemini AI features are not configured");
        err.statusCode = 503;
        throw err;
    }

    return {
        apiKey,
        model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
    };
};

const parseJson = (text) => {
    const cleaned = normalizeText(text)
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/```$/i, "")
        .trim();
    return JSON.parse(cleaned);
};

const callGeminiJson = async ({ system, task, payload, temperature = 0.35 }) => {
    const { apiKey, model } = getGeminiConfig();
    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                contents: [
                    {
                        role: "user",
                        parts: [
                            {
                                text: [
                                    system,
                                    "",
                                    task,
                                    "",
                                    "Return valid JSON only. Do not wrap it in markdown.",
                                    "",
                                    JSON.stringify(payload),
                                ].join("\n"),
                            },
                        ],
                    },
                ],
                generationConfig: {
                    temperature,
                    maxOutputTokens: 1200,
                    responseMimeType: "application/json",
                },
            }),
        }
    );

    const data = await response.json();
    if (!response.ok) {
        const err = new Error(data?.error?.message || "Gemini request failed");
        err.statusCode = response.status || 502;
        throw err;
    }

    const text = data?.candidates?.[0]?.content?.parts
        ?.map((part) => part.text || "")
        .join("")
        .trim();

    if (!text) {
        const err = new Error("Gemini returned an empty response");
        err.statusCode = 502;
        throw err;
    }

    return parseJson(text);
};

const validateSuggestion = (suggestion) => {
    if (!suggestion || typeof suggestion !== "object") return false;
    if (!AUCTION_CATEGORIES.includes(suggestion.category)) return false;
    if (!AUCTION_CONDITIONS.includes(suggestion.condition)) return false;
    return ["sellingPoints", "missingDetails", "qualityTips"].every((key) =>
        Array.isArray(suggestion[key])
    );
};

const assistAuctionListing = asyncErrorHandler(async (req, res, next) => {
    const title = clampString(req.body.title, 140);
    const description = clampString(req.body.description);
    const category = normalizeText(req.body.category);
    const condition = normalizeText(req.body.condition);

    if (!title && !description) {
        const err = new Error("Provide a title or description to improve");
        err.statusCode = 400;
        return next(err);
    }
    if (category && !AUCTION_CATEGORIES.includes(category)) {
        const err = new Error("Invalid auction category");
        err.statusCode = 400;
        return next(err);
    }
    if (condition && !AUCTION_CONDITIONS.includes(condition)) {
        const err = new Error("Invalid auction condition");
        err.statusCode = 400;
        return next(err);
    }

    const suggestion = await callGeminiJson({
        system:
            "You improve auction listings for PrimeBid. Stay factual and buyer-safe. Do not invent brand, authenticity, warranty, serial number, defects, provenance, included accessories, or condition details. If important facts are unknown, place them in missingDetails.",
        task:
            "Create a polished auction listing. JSON shape: {title:string, description:string, category:string, condition:string, sellingPoints:string[], missingDetails:string[], qualityTips:string[]}. Use exactly one allowed category and one allowed condition.",
        payload: {
            title,
            description,
            category,
            condition,
            allowedCategories: AUCTION_CATEGORIES,
            allowedConditions: AUCTION_CONDITIONS,
        },
    });

    if (!validateSuggestion(suggestion)) {
        const err = new Error("Gemini returned an invalid listing suggestion");
        err.statusCode = 502;
        return next(err);
    }

    return res.status(200).json({
        success: true,
        suggestion,
    });
});

const suggestAuctionCategory = asyncErrorHandler(async (req, res, next) => {
    const title = clampString(req.body.title, 140);
    const description = clampString(req.body.description);
    if (!title && !description) {
        const err = new Error("Provide a title or description to suggest a category");
        err.statusCode = 400;
        return next(err);
    }

    const suggestion = await callGeminiJson({
        system:
            "You classify auction listings for PrimeBid. Use only the allowed category and condition values.",
        task:
            "Suggest the best category and likely condition. JSON shape: {category:string, condition:string, confidence:number, reason:string}. confidence is 0 to 100.",
        payload: {
            title,
            description,
            allowedCategories: AUCTION_CATEGORIES,
            allowedConditions: AUCTION_CONDITIONS,
        },
        temperature: 0.2,
    });

    if (!AUCTION_CATEGORIES.includes(suggestion.category)) {
        suggestion.category = AUCTION_CATEGORIES[0];
    }
    if (!AUCTION_CONDITIONS.includes(suggestion.condition)) {
        suggestion.condition = "Used";
    }

    return res.status(200).json({
        success: true,
        suggestion: {
            category: suggestion.category,
            condition: suggestion.condition,
            confidence: Math.max(0, Math.min(100, Number(suggestion.confidence || 0))),
            reason: clampString(suggestion.reason, 300),
        },
    });
});

const summarizeAuction = asyncErrorHandler(async (req, res, next) => {
    const auction = req.body.auction || {};
    if (!auction.title && !auction.description) {
        const err = new Error("Auction details are required");
        err.statusCode = 400;
        return next(err);
    }

    const summary = await callGeminiJson({
        system:
            "You summarize auction listings for buyers. Be concise, factual, and careful about unknown details.",
        task:
            "Create a buyer-facing summary. JSON shape: {headline:string, keyPoints:string[], missingInfo:string[], riskNotes:string[], buyerQuestions:string[]}.",
        payload: {
            title: clampString(auction.title, 140),
            description: clampString(auction.description),
            category: clampString(auction.category, 80),
            condition: clampString(auction.condition, 40),
            currentBid: Number(auction.currentBid || 0),
            startingBid: Number(auction.startingBid || 0),
            bidCount: Number(auction.bidCount || 0),
        },
    });

    return res.status(200).json({
        success: true,
        summary,
    });
});

const bidAdvice = asyncErrorHandler(async (req, res, next) => {
    const auction = req.body.auction || {};
    const intendedBid = Number(req.body.intendedBid || 0);
    if (!auction.title || !auction.currentBid) {
        const err = new Error("Auction details are required");
        err.statusCode = 400;
        return next(err);
    }

    const advice = await callGeminiJson({
        system:
            "You are a cautious auction bidding assistant. Do not give financial guarantees. Help users think through value, urgency, and bidding discipline.",
        task:
            "Give practical bid guidance. JSON shape: {verdict:string, suggestedBid:number, ceilingBid:number, reasons:string[], cautions:string[]}. Keep values in INR.",
        payload: {
            title: clampString(auction.title, 140),
            description: clampString(auction.description),
            category: clampString(auction.category, 80),
            condition: clampString(auction.condition, 40),
            currentBid: Number(auction.currentBid || 0),
            startingBid: Number(auction.startingBid || 0),
            minimumBidIncrement: Number(auction.minimumBidIncrement || 1),
            bidCount: Number(auction.bidCount || 0),
            intendedBid,
        },
        temperature: 0.25,
    });

    return res.status(200).json({
        success: true,
        advice,
    });
});

export {
    assistAuctionListing,
    suggestAuctionCategory,
    summarizeAuction,
    bidAdvice,
};
