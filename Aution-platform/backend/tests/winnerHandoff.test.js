import assert from "node:assert/strict";
import test from "node:test";
import { buildWinnerHandoff } from "../utils/winnerHandoff.js";

test("builds winner handoff with seller contact and payment details", () => {
  const handoff = buildWinnerHandoff({
    title: "Vintage Camera",
    createdBy: {
      userName: "Auctioneer Demo",
      email: "seller@example.com",
      phone: "9999999999",
      reputation: {
        ratingAverage: 4.5,
        ratingCount: 8,
      },
      paymentMethods: {
        bankTransfer: {
          bankName: "HDFC",
          bankAccountName: "Auctioneer Demo",
          bankAccountNumber: "1234567890",
          bankIFSCCode: "HDFC0001234",
        },
      },
    },
  });

  assert.equal(handoff.status, "Ready for delivery handoff");
  assert.deepEqual(handoff.seller, {
    userName: "Auctioneer Demo",
    email: "seller@example.com",
    phone: "9999999999",
    ratingAverage: 4.5,
    ratingCount: 8,
  });
  assert.deepEqual(handoff.payment, {
    method: "PrimeBid wallet",
    status: "Held in escrow until delivery is confirmed",
  });
  assert.equal(handoff.nextSteps.length, 4);
});

test("handles missing seller payment details without failing", () => {
  const handoff = buildWinnerHandoff({
    createdBy: {
      userName: "Seller Only",
      email: "seller@example.com",
    },
  });

  assert.deepEqual(handoff.payment, {
    method: "PrimeBid wallet",
    status: "Held in escrow until delivery is confirmed",
  });
  assert.equal(handoff.seller.userName, "Seller Only");
  assert.ok(handoff.nextSteps[0].includes("Seller Only"));
});

test("handles unpopulated seller safely", () => {
  const handoff = buildWinnerHandoff({
    createdBy: "6632f5b78390e61ee1f9c111",
  });

  assert.equal(handoff.seller, null);
  assert.deepEqual(handoff.payment, {
    method: "PrimeBid wallet",
    status: "Held in escrow until delivery is confirmed",
  });
  assert.equal(handoff.nextSteps.length, 4);
});
