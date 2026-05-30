# Implementation Plan

## Immediate Slice For This Session

Selected slice: bidder post-win handoff.

Why this slice:

- It improves a core MVP gap without a risky rewrite.
- The current app can end auctions and show won auctions, but it does not clearly tell the winner how to complete the transaction.
- It ties directly to existing data: `Auction.highestBidder`, populated seller user data, bank details, won auctions page, seller reputation.

Planned changes:

1. Add a backend utility to build a safe winner handoff payload.
2. Update `getWonAuctions` to populate seller contact/payment fields and attach handoff instructions.
3. Update `WonAuctions.jsx` to show next steps, seller contact, and seller bank transfer details when available.
4. Add backend tests for winner handoff payload behavior.
5. Re-run tests, lint, build, and clean generated build artifacts.

Out of scope for this slice:

- Full order model.
- Payment gateway or escrow.
- Atomic bidding rewrite.
- Vite breaking upgrade.
- Real object storage migration.

## MVP Completion Roadmap

1. Transaction completion
   - Add `Order` or `Settlement` model.
   - Track `Awaiting Buyer Payment`, `Payment Sent`, `Seller Confirmed`, `Completed`, `Disputed`, `Cancelled`.
   - Acceptance: every won auction has a visible transaction status and next action.

2. Bid and close durability
   - Make bid placement atomic.
   - Add idempotent auction closing state.
   - Acceptance: repeated cron or simultaneous bids do not duplicate money spent, commissions, winners, or notifications.

3. Marketplace scale
   - Add backend pagination, filters, search, and sorting.
   - Update frontend filters to use URL query params.
   - Acceptance: marketplace can handle thousands of auctions without loading all at once.

4. Trust and abuse protection
   - Add rate limiting, clearer KYC CTAs, listing report flow, wallet settlement timeline, and dispute basics.
   - Acceptance: critical endpoints have abuse controls and users understand blocked states.

## Differentiation Roadmap

1. Trust-first auction marketplace
   - KYC badges, seller reputation, listing quality score, payment history, transparent anti-sniping timeline.

2. AI-assisted listing and bidding
   - Listing quality gate before publish.
   - AI missing-info checklist for sellers.
   - Bid discipline mode for bidders.

3. Seller success tooling
   - Category insights, watcher conversion, bid velocity, listing improvement recommendations.

4. Buyer retention loop
   - Saved searches, new-match alerts, ending-soon digest, personalized recommendations.
