import React from "react";

const FiveFactorScore = ({
  title = "Liquidity 5-Factor Score",
  totalScore = 0,
  rating = "",
  factors = [],
}) => {
  return (
    <div className="p-6 rounded-xl border border-gray-700 bg-[#0C0F14] w-full">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">{title}</h2>

        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold text-white">{totalScore}/100</span>
          {rating && (
            <span className="px-2 py-0.5 bg-red-600 text-white text-xs font-bold rounded">
              {rating}
            </span>
          )}
        </div>
      </div>

      {/* FACTOR ROWS */}
      {factors.map((item) => (
        <div key={item.name} className="mb-4">
          <div className="flex justify-between mb-1">
            <span className="text-sm font-medium text-gray-300">{item.name}</span>
            <span className="text-sm font-normal text-gray-400">
              {item.score ?? "--"}
            </span>
          </div>

          <div className="w-full h-2 bg-gray-700 rounded">
            <div
              className="h-2 rounded"
              style={{
                width: `${Math.max(0, Math.min(100, item.score))}%`,
                backgroundColor: item.colour,
              }}
            ></div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default FiveFactorScore;
