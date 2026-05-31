export const MONTH_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const getAdminChartOptions = ({ title, suggestedMax } = {}) => ({
  responsive: true,
  maintainAspectRatio: false,
  resizeDelay: 150,
  scales: {
    x: {
      ticks: {
        maxRotation: 0,
        autoSkip: true,
      },
    },
    y: {
      beginAtZero: true,
      suggestedMax,
      ticks: {
        callback(value) {
          return value.toLocaleString();
        },
      },
    },
  },
  plugins: {
    legend: {
      labels: {
        boxWidth: 12,
        usePointStyle: true,
      },
    },
    title: {
      display: Boolean(title),
      text: title,
    },
  },
});
