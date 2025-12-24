import React from 'react';

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  gradient: string;
  subStats?: Array<{
    label: string;
    value: number;
    color: string;
  }>;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, gradient, subStats }) => {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-xl">
      {/* Gradient Background */}
      <div
        className={`absolute right-0 top-0 h-32 w-32 rounded-full bg-gradient-to-br ${gradient} opacity-10 blur-3xl transition-all duration-300 group-hover:scale-150`}
      ></div>

      <div className="relative">
        {/* Header */}
        <div className="mb-4 flex items-start justify-between">
          <div
            className={`flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} shadow-lg`}
          >
            {icon}
          </div>
        </div>

        {/* Main Stat */}
        <div className="mb-4">
          <h3 className="mb-1 text-sm font-semibold text-gray-600">{title}</h3>
          <p className="text-4xl font-bold text-gray-900">{value.toLocaleString()}</p>
        </div>

        {/* Sub Stats */}
        {subStats && subStats.length > 0 && (
          <div className="space-y-2 border-t border-gray-100 pt-4">
            {subStats.map((stat, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${stat.color}`}></div>
                  <span className="text-sm font-medium text-gray-600">{stat.label}</span>
                </div>
                <span className="text-sm font-bold text-gray-900">{stat.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StatCard;
