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
import { Line } from "react-chartjs-2";
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

const BiddersAuctioneersGraph = () => {
  const { totalAuctioneers, totalBidders } = useSelector(
    (state) => state.superAdmin
  );
  const data = {
    labels: MONTH_LABELS,
    datasets: [
      {
        label: "Number of Bidders",
        data: totalBidders,
        borderColor: "#4f46e5",
        backgroundColor: "#4f46e5",
        pointRadius: 3,
        tension: 0.35,
        fill: false,
      },
      {
        label: "Number of Auctioneers",
        data: totalAuctioneers,
        borderColor: "#0f766e",
        backgroundColor: "#0f766e",
        pointRadius: 3,
        tension: 0.35,
        fill: false,
      },
    ],
  };

  const options = getAdminChartOptions({
    title: "Number of Bidders And Auctioneers Registered",
    suggestedMax: 50,
  });

  return (
    <ReportChartFrame>
      <Line data={data} options={options} />
    </ReportChartFrame>
  );
};

export default BiddersAuctioneersGraph;
