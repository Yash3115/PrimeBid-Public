import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { MONTH_LABELS, getAdminChartOptions } from "@/lib/adminCharts";
import { useSelector } from "react-redux";
import ReportChartFrame from "./ReportChartFrame";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  LineElement,
  PointElement
);

const PaymentGraph = () => {
  const { monthlyRevenue } = useSelector((state) => state.superAdmin);

  const data = {
    labels: MONTH_LABELS,
    datasets: [
      {
        label: "Total Payment Received",
        data: monthlyRevenue,
        backgroundColor: "#4f46e5",
        borderRadius: 5,
        maxBarThickness: 38,
      },
    ],
  };

  const options = getAdminChartOptions({
    title: "Monthly Total Payments Received",
    suggestedMax: 5000,
  });

  return (
    <ReportChartFrame>
      <Bar data={data} options={options} />
    </ReportChartFrame>
  );
};

export default PaymentGraph;
