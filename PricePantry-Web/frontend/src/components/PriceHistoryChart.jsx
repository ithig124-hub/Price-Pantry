import React from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TrendingDown, TrendingUp, Minus, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export const PriceHistoryChart = ({ product, isOpen, onClose }) => {
  if (!product || !product.price_history || product.price_history.length === 0) {
    return null;
  }

  const priceHistory = product.price_history;
  const prices = priceHistory.map((p) => p.price);
  const labels = priceHistory.map((p) => {
    const date = new Date(p.date);
    return date.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
  });

  // Calculate stats
  const currentPrice = prices[prices.length - 1];
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
  const priceChange = currentPrice - prices[0];
  const priceChangePercent = ((priceChange / prices[0]) * 100).toFixed(1);

  // Determine trend
  const trend = priceChange < 0 ? "down" : priceChange > 0 ? "up" : "stable";

  // Chart data
  const chartData = {
    labels,
    datasets: [
      {
        label: "Price ($)",
        data: prices,
        fill: true,
        backgroundColor: "rgba(0, 230, 118, 0.1)",
        borderColor: "#00E676",
        borderWidth: 2,
        pointBackgroundColor: priceHistory.map((p) =>
          p.was_on_sale ? "#FF3D00" : "#00E676"
        ),
        pointBorderColor: "#fff",
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0.3,
      },
    ],
  };

  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: "rgba(0, 0, 0, 0.9)",
        titleColor: "#fff",
        bodyColor: "#fff",
        borderColor: "#00E676",
        borderWidth: 1,
        padding: 12,
        displayColors: false,
        callbacks: {
          label: (context) => {
            const dataIndex = context.dataIndex;
            const wasOnSale = priceHistory[dataIndex]?.was_on_sale;
            return `$${context.raw.toFixed(2)}${wasOnSale ? " (SALE)" : ""}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          maxTicksLimit: 7,
          font: {
            family: "Manrope",
            size: 11,
          },
        },
      },
      y: {
        grid: {
          color: "rgba(0, 0, 0, 0.05)",
        },
        ticks: {
          callback: (value) => `$${value.toFixed(2)}`,
          font: {
            family: "Manrope",
            size: 11,
          },
        },
        min: Math.floor(minPrice * 0.9),
        max: Math.ceil(maxPrice * 1.1),
      },
    },
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-[#00E676]" />
            Price History - Last 30 Days
          </DialogTitle>
        </DialogHeader>

        {/* Product Info */}
        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border">
          <img
            src={product.image}
            alt={product.name}
            className="w-16 h-16 object-cover rounded-lg"
          />
          <div className="flex-1">
            <p className="text-sm text-gray-500">{product.brand}</p>
            <h3 className="font-bold text-lg leading-tight">{product.name}</h3>
            <p className="text-sm text-gray-500">{product.size}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-mono font-bold">${currentPrice.toFixed(2)}</p>
            <div className="flex items-center gap-1 justify-end">
              {trend === "down" && (
                <Badge className="bg-green-100 text-green-700 border-green-200">
                  <TrendingDown className="w-3 h-3 mr-1" />
                  {Math.abs(priceChangePercent)}%
                </Badge>
              )}
              {trend === "up" && (
                <Badge className="bg-red-100 text-red-700 border-red-200">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  {priceChangePercent}%
                </Badge>
              )}
              {trend === "stable" && (
                <Badge className="bg-gray-100 text-gray-700 border-gray-200">
                  <Minus className="w-3 h-3 mr-1" />
                  Stable
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Price Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 bg-green-50 rounded-lg border border-green-200 text-center">
            <p className="text-xs text-green-600 font-medium">Lowest</p>
            <p className="text-lg font-mono font-bold text-green-700">
              ${minPrice.toFixed(2)}
            </p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg border text-center">
            <p className="text-xs text-gray-500 font-medium">Average</p>
            <p className="text-lg font-mono font-bold text-gray-700">
              ${avgPrice.toFixed(2)}
            </p>
          </div>
          <div className="p-3 bg-red-50 rounded-lg border border-red-200 text-center">
            <p className="text-xs text-red-600 font-medium">Highest</p>
            <p className="text-lg font-mono font-bold text-red-700">
              ${maxPrice.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Chart */}
        <div className="h-[250px] mt-4">
          <Line data={chartData} options={chartOptions} />
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 text-sm text-gray-500 mt-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#00E676]"></div>
            <span>Regular Price</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#FF3D00]"></div>
            <span>Sale Price</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PriceHistoryChart;
