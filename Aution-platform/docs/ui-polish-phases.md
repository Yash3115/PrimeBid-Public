# PrimeBid UI Polish Phases

## Phase 1: Hero And Card Stability

- Fix homepage hero breakage where the auction preview and headline compete for space on mid-width screens.
- Keep large text inside its layout bounds without clipping or covering auction cards.
- Make the hero auction card use compact bid/date blocks that do not wrap awkwardly.
- Improve trust strip spacing and icon alignment.
- Status: implemented in the current UI polish patch.

## Phase 2: Marketplace And Auction Cards

- Standardize card heights, media aspect ratios, and action placement across featured, watchlist, and marketplace grids.
- Tighten long currency/date text wrapping in cards.
- Improve empty, loading, and filtered states so each page feels intentional.
- Status: first pass implemented for shared auction cards, seller auction cards, homepage closing rows, watchlist, recently viewed, featured auctions, and upcoming auction rows.

## Phase 3: Wallet And Transaction Surfaces

- Reduce dense wallet sections with clearer grouped panels and progressive disclosure.
- Make deposit, withdraw, locked funds, escrow, and transaction history easier to scan.
- Keep floating payment actions visible without blocking important content.

## Phase 4: Admin And Seller Workspaces

- Refine dense admin tables and queues with better spacing, sticky action context, and clearer severity states.
- Improve seller dashboard shipment, settlement, and auction-management panels for repeated use.

## Phase 5: Responsive QA Pass

- Verify the main flows at mobile, tablet, laptop, and wide desktop sizes.
- Add visual regression checkpoints for homepage, marketplace, auction detail, wallet, bidder dashboard, seller dashboard, and admin dashboard.
