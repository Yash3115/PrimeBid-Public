import assert from "node:assert/strict";
import test from "node:test";
import {
  MONTH_LABELS,
  getAdminChartOptions,
} from "../src/lib/adminCharts.js";

test("admin report charts use a stable responsive sizing config", () => {
  const options = getAdminChartOptions({
    title: "Monthly report",
    suggestedMax: 100,
  });

  assert.equal(options.responsive, true);
  assert.equal(options.maintainAspectRatio, false);
  assert.equal(options.resizeDelay, 150);
  assert.equal(options.scales.y.suggestedMax, 100);
  assert.equal(options.plugins.title.text, "Monthly report");
});

test("admin report charts keep a full month axis", () => {
  assert.equal(MONTH_LABELS.length, 12);
  assert.deepEqual(MONTH_LABELS.slice(0, 3), [
    "January",
    "February",
    "March",
  ]);
});
