import React from 'react';
import Card from '@shared/components/Card';
import Table from '@shared/components/Table';
import Badge from '@shared/components/Badge';
import { Users, UserCheck, CalendarDays, Clock, Award } from 'lucide-react';

const Dashboard = () => {
  const teamMembers = [
    { id: 1, name: 'Sarah Jenkins', role: 'Senior Designer', status: 'In Office', performance: 'Excellent' },
    { id: 2, name: 'Marcus Thorne', role: 'Tech Lead', status: 'Remote', performance: 'Good' },
    { id: 3, name: 'Elena Rodriguez', role: 'DevOps', status: 'On Leave', performance: 'Excellent' },
  ];

  const columns = [
    { key: 'name', title: 'Name', render: (val) => <span className="font-bold">{val}</span> },
    { key: 'role', title: 'Role' },
    { key: 'status', title: 'Status', render: (val) => <Badge variant={val === 'In Office' ? 'success' : 'secondary'}>{val}</Badge> },
    { key: 'performance', title: 'Review', render: (val) => <span className="text-[#005ab6] font-bold">{val}</span> },
  ];

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-[#191c1e]">Managerial Overview</h1>
          <p className="text-[#414753] font-medium mt-1">Direct reports and team performance tracking.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-l-4 border-[#005ab6]">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[#005ab6]/10 rounded-xl text-[#005ab6]"><Users size={24} /></div>
            <div>
              <p className="text-xs font-black uppercase text-[#414753]">Team Size</p>
              <p className="text-2xl font-black text-[#191c1e]">12 Members</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600"><UserCheck size={24} /></div>
            <div>
              <p className="text-xs font-black uppercase text-[#414753]">Pending Approvals</p>
              <p className="text-2xl font-black text-[#191c1e]">5 Requests</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600"><Award size={24} /></div>
            <div>
              <p className="text-xs font-black uppercase text-[#414753]">Avg Performance</p>
              <p className="text-2xl font-black text-[#191c1e]">4.8 / 5.0</p>
            </div>
          </div>
        </Card>
      </div>

      <Card title="My Direct Reports">
        <Table columns={columns} data={teamMembers} />
      </Card>
    </div>
  );
};

export default Dashboard;
