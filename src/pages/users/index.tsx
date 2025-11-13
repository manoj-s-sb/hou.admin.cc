import React, { useState } from "react";
import SectionTitle from "../../components/SectionTitle";
import UserTable, { ColumnDef } from "../../components/UserTable";

const UserList: React.FC = () => {
  const [users] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // Define columns for the user table
  const userColumns: ColumnDef[] = [
    {
      field: "name",
      headerName: "Name",
      flex: 2,
    },
    {
      field: "email",
      headerName: "Email",
      flex: 2,
    },
    {
      field: "role",
      headerName: "Role",
      flex: 1.5,
      renderCell: (params) => (
        <span
          className={`inline-flex items-center px-3 py-1.5 rounded-lg text-[10px] font-semibold border transition-all ${
            params.value === "Admin"
              ? "bg-purple-50 text-purple-700 border-purple-200"
              : params.value === "Moderator"
                ? "bg-blue-50 text-blue-700 border-blue-200"
                : "bg-indigo-50 text-indigo-700 border-indigo-200"
          }`}
        >
          {params.value}
        </span>
      ),
    },
    {
      field: "status",
      headerName: "Status",
      flex: 1,
      renderCell: (params) => (
        <span
          className={`inline-flex items-center px-3 py-1.5 rounded-lg text-[10px] font-semibold capitalize border transition-all ${
            params.value === "active"
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-rose-50 text-rose-700 border-rose-200"
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full mr-2 ${
              params.value === "active" ? "bg-emerald-500" : "bg-rose-500"
            }`}
          ></span>
          {params.value}
        </span>
      ),
    },
    {
      field: "createdAt",
      headerName: "Created",
      type: "date",
      flex: 1.5,
    },
  ];

  return (
    <div className="max-full">
      <SectionTitle
        title="User Management"
        description="Manage your users and their roles."
        inputPlaceholder="Search users..."
        value={searchTerm}
        onSearch={setSearchTerm}
      />

      <div
        className={`grid grid-cols-1 ${selectedUser ? "lg:grid-cols-[1fr_350px]" : "w-full"} gap-6 `}
      >
        <UserTable
          data={filteredUsers}
          columns={userColumns}
          selectedItem={selectedUser}
          onSelectItem={setSelectedUser}
          emptyState={{
            icon: (
              <svg
                className="w-16 h-16 text-gray-300 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            ),
            title: "No users found",
            subtitle: "Try adjusting your search criteria",
          }}
        />

        {selectedUser && (
          <div className="bg-white rounded-lg shadow-md p-6 h-fit sticky top-8">
            <h2 className="text-2xl font-bold text-slate-800 m-0 mb-6 pb-4 border-b-2 border-gray-200">
              User Details
            </h2>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  ID:
                </span>
                <span className="text-sm text-gray-800 font-medium">
                  {selectedUser.id}
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Name:
                </span>
                <span className="text-sm text-gray-800 font-medium">
                  {selectedUser.name}
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Email:
                </span>
                <span className="text-sm text-gray-800 font-medium">
                  {selectedUser.email}
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Role:
                </span>
                <span className="text-sm text-gray-800 font-medium">
                  <span className="inline-block px-3 py-1 bg-blue-50 text-indigo-600 rounded-full text-xs font-medium">
                    {selectedUser.role}
                  </span>
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Status:
                </span>
                <span className="text-sm text-gray-800 font-medium">
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-medium capitalize ${
                      selectedUser.status === "active"
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {selectedUser.status}
                  </span>
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Created At:
                </span>
                <span className="text-sm text-gray-800 font-medium">
                  {selectedUser.createdAt}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserList;
