/* eslint-disable react/prop-types */
const ReportChartFrame = ({ children }) => (
  <div className="relative h-[320px] min-h-[320px] w-full min-w-0 overflow-hidden rounded-md border border-slate-200 bg-white p-3 sm:h-[360px] sm:min-h-[360px]">
    {children}
  </div>
);

export default ReportChartFrame;
