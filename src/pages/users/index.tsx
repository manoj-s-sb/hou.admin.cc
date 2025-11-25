import React, { useState } from 'react';
import SectionTitle from '../../components/SectionTitle';
import UserTable, { ColumnDef } from '../../components/UserTable';

const UserList: React.FC = () => {
  const [users] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredUsers = users.filter(
    user =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Define columns for the user table
  const userColumns: ColumnDef[] = [
    {
      field: 'name',
      headerName: 'Name',
      flex: 2,
    },
    {
      field: 'email',
      headerName: 'Email',
      flex: 2,
    },
    {
      field: 'role',
      headerName: 'Role',
      flex: 1.5,
      renderCell: params => (
        <span
          className={`inline-flex items-center rounded-lg border px-3 py-1.5 text-[10px] font-semibold transition-all ${
            params.value === 'Admin'
              ? 'border-purple-200 bg-purple-50 text-purple-700'
              : params.value === 'Moderator'
                ? 'border-blue-200 bg-blue-50 text-blue-700'
                : 'border-indigo-200 bg-indigo-50 text-indigo-700'
          }`}
        >
          {params.value}
        </span>
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      flex: 1,
      renderCell: params => (
        <span
          className={`inline-flex items-center rounded-lg border px-3 py-1.5 text-[10px] font-semibold capitalize transition-all ${
            params.value === 'active'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-rose-200 bg-rose-50 text-rose-700'
          }`}
        >
          <span
            className={`mr-2 h-1.5 w-1.5 rounded-full ${params.value === 'active' ? 'bg-emerald-500' : 'bg-rose-500'}`}
          ></span>
          {params.value}
        </span>
      ),
    },
    {
      field: 'createdAt',
      headerName: 'Created',
      type: 'date',
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

      <div className={`grid grid-cols-1 ${selectedUser ? 'lg:grid-cols-[1fr_350px]' : 'w-full'} gap-6`}>
        <UserTable
          data={filteredUsers}
          columns={userColumns}
          selectedItem={selectedUser}
          onSelectItem={setSelectedUser}
          emptyState={{
            icon: (
              <svg className="mb-4 h-16 w-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            ),
            title: 'No users found',
            subtitle: 'Try adjusting your search criteria',
          }}
        />

        {selectedUser && (
          <div className="sticky top-8 h-fit rounded-lg bg-white p-6 shadow-md">
            <h2 className="m-0 mb-6 border-b-2 border-gray-200 pb-4 text-2xl font-bold text-slate-800">User Details</h2>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-600">ID:</span>
                <span className="text-sm font-medium text-gray-800">{selectedUser.id}</span>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-600">Name:</span>
                <span className="text-sm font-medium text-gray-800">{selectedUser.name}</span>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-600">Email:</span>
                <span className="text-sm font-medium text-gray-800">{selectedUser.email}</span>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-600">Role:</span>
                <span className="text-sm font-medium text-gray-800">
                  <span className="inline-block rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-indigo-600">
                    {selectedUser.role}
                  </span>
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-600">Status:</span>
                <span className="text-sm font-medium text-gray-800">
                  <span
                    className={`inline-block rounded-full px-3 py-1 text-xs font-medium capitalize ${
                      selectedUser.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {selectedUser.status}
                  </span>
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-600">Created At:</span>
                <span className="text-sm font-medium text-gray-800">{selectedUser.createdAt}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserList;
