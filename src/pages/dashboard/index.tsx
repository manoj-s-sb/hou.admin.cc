import React from "react";

const Dashboard: React.FC = () => {
  return (
    <div className="max-w-6xl">
      <h1 className="text-4xl font-bold text-slate-800 mb-8">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md transition-all hover:-translate-y-1 hover:shadow-lg">
          <h3 className="text-sm font-medium text-gray-600 mb-3 uppercase tracking-wide">
            Total Users
          </h3>
          <p className="text-4xl font-bold text-slate-800 m-0">150</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md transition-all hover:-translate-y-1 hover:shadow-lg">
          <h3 className="text-sm font-medium text-gray-600 mb-3 uppercase tracking-wide">
            Active Users
          </h3>
          <p className="text-4xl font-bold text-slate-800 m-0">120</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md transition-all hover:-translate-y-1 hover:shadow-lg">
          <h3 className="text-sm font-medium text-gray-600 mb-3 uppercase tracking-wide">
            Inactive Users
          </h3>
          <p className="text-4xl font-bold text-slate-800 m-0">30</p>
        </div>
      </div>
      <div className="bg-white p-8 rounded-lg shadow-md">
        <p className="text-lg text-gray-600 m-0">
          Welcome to the Admin Portal Dashboard
        </p>
      </div>
    </div>
  );
};

export default Dashboard;
