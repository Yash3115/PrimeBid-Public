const priorityRank = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const toTimeMs = (value) => {
  const ms = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
};

export const getOperationAgeHours = (date, now = new Date()) => {
  const createdMs = toTimeMs(date);
  const nowMs = toTimeMs(now);
  if (createdMs === null || nowMs === null || nowMs < createdMs) return 0;
  return Math.floor((nowMs - createdMs) / (60 * 60 * 1000));
};

export const getOperationSlaStatus = (
  date,
  now = new Date(),
  { warningHours = 24, criticalHours = 72 } = {}
) => {
  const ageHours = getOperationAgeHours(date, now);
  if (ageHours >= criticalHours) return "Critical";
  if (ageHours >= warningHours) return "Warning";
  return "Fresh";
};

export const buildOperationItem = ({
  id,
  title,
  detail = "",
  status = "",
  amount = null,
  createdAt,
  href = "",
  actionLabel = "Review",
  meta = {},
  priority = "medium",
  now = new Date(),
  sla = {},
}) => ({
  id: id?.toString?.() || String(id || ""),
  title: title || "Untitled item",
  detail,
  status,
  amount,
  createdAt,
  ageHours: getOperationAgeHours(createdAt, now),
  slaStatus: getOperationSlaStatus(createdAt, now, sla),
  href,
  actionLabel,
  meta,
  priority,
});

export const sortOperationItems = (items = []) =>
  [...items].sort((a, b) => {
    const priorityDelta =
      (priorityRank[a.priority] ?? priorityRank.medium) -
      (priorityRank[b.priority] ?? priorityRank.medium);
    if (priorityDelta !== 0) return priorityDelta;
    return Number(b.ageHours || 0) - Number(a.ageHours || 0);
  });

export const buildOperationGroup = ({
  id,
  label,
  detail,
  href,
  priority = "medium",
  emptyLabel = "No items need review.",
  items = [],
}) => {
  const sortedItems = sortOperationItems(items);
  const criticalCount = sortedItems.filter(
    (item) => item.priority === "critical" || item.slaStatus === "Critical"
  ).length;
  const warningCount = sortedItems.filter(
    (item) => item.slaStatus === "Warning"
  ).length;

  return {
    id,
    label,
    detail,
    href,
    priority,
    emptyLabel,
    count: sortedItems.length,
    criticalCount,
    warningCount,
    items: sortedItems,
  };
};

export const summarizeOperationGroups = (groups = []) => ({
  totalOpen: groups.reduce((total, group) => total + Number(group.count || 0), 0),
  criticalOpen: groups.reduce(
    (total, group) => total + Number(group.criticalCount || 0),
    0
  ),
  warningOpen: groups.reduce(
    (total, group) => total + Number(group.warningCount || 0),
    0
  ),
});
