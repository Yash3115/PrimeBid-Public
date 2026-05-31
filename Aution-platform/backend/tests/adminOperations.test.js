import assert from "node:assert/strict";
import test from "node:test";
import {
  buildOperationGroup,
  buildOperationItem,
  getOperationAgeHours,
  getOperationSlaStatus,
  summarizeOperationGroups,
} from "../utils/adminOperations.js";

const now = new Date("2026-05-31T12:00:00.000Z");

test("calculates operation age and SLA status from server time", () => {
  assert.equal(getOperationAgeHours("2026-05-30T06:30:00.000Z", now), 29);
  assert.equal(
    getOperationSlaStatus("2026-05-30T06:30:00.000Z", now, {
      warningHours: 24,
      criticalHours: 48,
    }),
    "Warning"
  );
  assert.equal(
    getOperationSlaStatus("2026-05-28T06:00:00.000Z", now, {
      warningHours: 24,
      criticalHours: 48,
    }),
    "Critical"
  );
});

test("builds operation groups sorted by priority and age", () => {
  const group = buildOperationGroup({
    id: "wallet",
    label: "Wallet reviews",
    items: [
      buildOperationItem({
        id: "new-medium",
        title: "New medium",
        createdAt: "2026-05-31T11:00:00.000Z",
        priority: "medium",
        now,
      }),
      buildOperationItem({
        id: "old-critical",
        title: "Old critical",
        createdAt: "2026-05-29T10:00:00.000Z",
        priority: "critical",
        now,
      }),
      buildOperationItem({
        id: "older-medium",
        title: "Older medium",
        createdAt: "2026-05-30T06:00:00.000Z",
        priority: "medium",
        now,
      }),
    ],
  });

  assert.deepEqual(
    group.items.map((item) => item.id),
    ["old-critical", "older-medium", "new-medium"]
  );
  assert.equal(group.count, 3);
  assert.equal(group.criticalCount, 1);
  assert.equal(group.warningCount, 2);
});

test("summarizes open operation groups", () => {
  const groups = [
    buildOperationGroup({
      id: "critical",
      label: "Critical",
      items: [
        buildOperationItem({
          id: "a",
          title: "A",
          createdAt: "2026-05-29T10:00:00.000Z",
          priority: "critical",
          now,
        }),
      ],
    }),
    buildOperationGroup({
      id: "warning",
      label: "Warning",
      items: [
        buildOperationItem({
          id: "b",
          title: "B",
          createdAt: "2026-05-30T10:00:00.000Z",
          priority: "medium",
          now,
        }),
      ],
    }),
  ];

  assert.deepEqual(summarizeOperationGroups(groups), {
    totalOpen: 2,
    criticalOpen: 1,
    warningOpen: 2,
  });
});
