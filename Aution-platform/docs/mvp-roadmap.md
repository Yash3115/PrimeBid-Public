# PrimeBid MVP Roadmap

## Core MVP Features

| Milestone | Scope | Acceptance Criteria |
| --- | --- | --- |
| M1: Complete auction transaction | Winner handoff, delivery address capture, seller shipment updates, order status | A winning bidder can add delivery details and both sides can track shipment progress |
| M2: Reliable bidding | Atomic bid placement, bid conflict retry, server-time validation | Two simultaneous bids cannot corrupt current bid or leader |
| M3: Reliable closing | Atomic auction close claim, winner assignment, commission creation, notifications | Cron can run twice without duplicate commission or winner updates |
| M4: Marketplace scale | Server-side search, filters, sort, pagination | Auctions page loads predictable pages and can be linked/shared |
| M5: Trust workflow | KYC status CTAs, wallet settlement visibility, buyer/seller dispute basics | Users understand blocked states and admins have clear review actions |

## Trust Features

| Feature | User Impact | Complexity |
| --- | --- | --- |
| Winner handoff panel | Makes winning actionable and credible | Small |
| Order/settlement model | Turns auctions into complete transactions | Large |
| Seller verification badge | Shows KYC/trust status where bidders decide | Small |
| Wallet settlement timeline | Makes locked funds, captured bids, seller credits, and payouts understandable | Medium |
| Dispute/report listing flow | Protects users from bad listings | Medium |
| Rate limiting | Reduces abuse and quota burn | Medium |

## Retention Features

| Feature | User Impact | Complexity |
| --- | --- | --- |
| Saved searches | Gives bidders a reason to return | Medium |
| New-match alerts | Makes marketplace feel alive | Medium |
| Ending-soon digest | Pulls watchers/bidders back before close | Small |
| Recommendation explanations | Builds trust in smart recommendations | Small |
| Seller analytics by category | Helps auctioneers improve listings | Medium |

## Differentiation Features

| Feature | Why It Fits This Repo | Complexity |
| --- | --- | --- |
| AI listing quality gate | Existing listing assistant and quality score already exist | Medium |
| AI bid discipline coach | Existing bid advice exists; can become a guided bidding mode | Medium |
| Trust score per listing | KYC, seller reputation, listing quality, and payment history exist | Medium |
| Anti-sniping plus transparent timeline | Anti-sniping already exists; UI can explain extensions | Small |
| Commission/deposit marketplace model | Existing commission tracking can evolve into wallet/deposit | Large |

## Monetization And Growth

| Idea | Notes |
| --- | --- |
| Listing deposit | Prevents throwaway auctioneer accounts and abandoned commissions |
| Success fee | Existing commission logic supports this concept |
| Featured listings | Could use quality score and admin approval |
| Seller analytics premium | Useful once auctioneers have repeated listings |
