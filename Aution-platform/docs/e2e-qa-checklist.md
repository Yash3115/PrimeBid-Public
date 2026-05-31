# PrimeBid End-to-End QA Checklist

Use this checklist before demos and deployment updates.

## Accounts

- Login returns users to the protected page they were trying to open.
- Super Admin can open `/dashboard`.
- Auctioneer can open `/seller-dashboard`, `/create-auction`, and `/view-my-auctions`.
- Bidder can open `/bidder-dashboard`, `/wallet`, `/won-auctions`, and auction detail pages.

## Auction And Wallet Flow

- Bidder deposits demo wallet money from `/wallet#deposit`.
- Bidder places a bid only when the auction is live and wallet balance covers the required incremental lock.
- Same-auction bid increases use the existing lock plus only the extra amount.
- Outbid bidders get their bid lock released.
- Auto-bid can be updated or cancelled without hiding the current bid.

## Winner Handoff

- Ended auctions create a fulfillment record for the winner.
- Bidder next-action links open the exact won auction card on `/won-auctions`.
- Winner can save or update address before shipment starts.
- Auctioneer sees the address in `/seller-dashboard#fulfillment`.
- Auctioneer can update shipment to shipped, out for delivery, or delivered.
- Bidder can confirm delivery after delivered status.

## Disputes And Settlement

- Bidder can report a delivery issue.
- Auctioneer can respond to an open dispute.
- Super Admin can resolve disputes from `/dashboard#disputes`.
- Super Admin can review captured escrow from `/dashboard#escrow-settlements`.
- Escrow release credits seller payout and platform commission.
- Escrow refund returns captured funds to buyer wallet.
- Settlement actions are blocked when captured escrow is missing or a dispute is open.

## Admin Operations

- `/dashboard#operations-queue` surfaces KYC, withdrawal, dispute, settlement, fulfillment, seller-risk, and auction-risk queues.
- Queue links scroll to their target sections after lazy-loaded dashboard content renders.
- Withdrawal approval/rejection updates wallet holds and admin overview.

## Commands

```bash
cd backend
npm test

cd ../frontend
npm test
npm run lint
npm run build
```
