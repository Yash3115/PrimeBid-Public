const requireAuctioneerKyc = (req, res, next) => {
    if (req.user?.role !== "Auctioneer") {
        return next();
    }

    if (req.user.kycStatus === "Approved") {
        return next();
    }

    const err = new Error("KYC approval is required before listing auctions");
    err.statusCode = 403;
    return next(err);
};

export { requireAuctioneerKyc };
