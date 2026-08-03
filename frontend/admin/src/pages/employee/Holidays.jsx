import React from 'react';

const allHolidays2026 = [
  { name: 'Makar Sankranti', dateStr: '2026-01-14', type: 'Festival' },
  { name: 'Republic Day', dateStr: '2026-01-26', type: 'National' },
  { name: 'Maha Shivaratri', dateStr: '2026-02-14', type: 'Festival' },
  { name: 'Holi', dateStr: '2026-03-03', type: 'Festival' },
  { name: 'Ram Navami', dateStr: '2026-03-27', type: 'Festival' },
  { name: 'Independence Day', dateStr: '2026-08-15', type: 'National' },
  { name: 'Raksha Bandhan', dateStr: '2026-08-28', type: 'Festival' },
  { name: 'Janmashtami', dateStr: '2026-09-04', type: 'Festival' },
  { name: 'Ganesh Chaturthi', dateStr: '2026-09-14', type: 'Festival' },
  { name: 'Gandhi Jayanti', dateStr: '2026-10-02', type: 'National' },
  { name: 'Dussehra', dateStr: '2026-10-19', type: 'Festival' },
  { name: 'Diwali', dateStr: '2026-11-08', type: 'Festival' },
  { name: 'Christmas', dateStr: '2026-12-25', type: 'Festival' }
];

const Holidays = () => {
  const todayDate = new Date();
  todayDate.setHours(0,0,0,0);

  const holidays = allHolidays2026.map(h => {
    const parts = h.dateStr.split('-');
    const hDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    const diffTime = hDate - todayDate;
    const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return { 
      ...h,
      date: hDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }).replace(/[,.]/g, ''),
      fullDate: hDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      daysLeft,
      isPast: daysLeft < 0
    };
  });

  return (
    <div className="space-y-6 pb-12 font-['Inter',sans-serif] animate-slide-up" style={{ color: 'var(--zap-charcoal)' }}>
      <div>
        <h1 className="text-[32px] font-bold text-[#201515] dark:text-white" style={{ fontFamily: 'Playfair Display, serif' }}>
          Holidays 2026 🌴
        </h1>
        <p className="text-[#939084] mt-1">View all national and regional holidays for the year.</p>
      </div>

      <div className="bg-[#fffefb] dark:bg-[#0f0d0a] border border-[#c5c0b1] dark:border-[#38352e] rounded-[20px] shadow-[0_4px_24px_rgba(0,0,0,0.02)] overflow-hidden">
        <table className="w-full text-left border-collapse min-w-[600px]">
          <thead>
            <tr className="bg-[#f8f7f4] dark:bg-[#1a1713] border-b border-[#eceae3] dark:border-[#38352e]">
              <th className="py-4 px-6 font-bold text-sm text-[#201515] dark:text-white uppercase tracking-wider">Date</th>
              <th className="py-4 px-6 font-bold text-sm text-[#201515] dark:text-white uppercase tracking-wider">Holiday</th>
              <th className="py-4 px-6 font-bold text-sm text-[#201515] dark:text-white uppercase tracking-wider">Type</th>
              <th className="py-4 px-6 font-bold text-sm text-[#201515] dark:text-white uppercase tracking-wider text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            {holidays.map((h, i) => (
              <tr key={i} className={`border-b border-[#eceae3] dark:border-[#38352e] last:border-0 hover:bg-[#faf9f6] dark:hover:bg-[#15120e] transition-colors ${h.isPast ? 'opacity-60 grayscale' : ''}`}>
                <td className="py-4 px-6">
                  <div className="flex items-center gap-3">
                    <div className={`rounded-xl text-center min-w-[56px] p-2 border ${h.isPast ? 'bg-[#f1f5f9] text-[#64748b] border-[#e2e8f0]' : 'bg-[#f0fdf4] text-[#00a76b] border-[#bbf7d0]'}`}>
                      <p className="text-xl font-bold leading-none">{h.date.split(' ')[0]}</p>
                      <p className="text-[10px] font-bold uppercase mt-1">{h.date.split(' ')[1]}</p>
                    </div>
                    <span className="text-sm font-medium text-[#939084]">{h.fullDate.split(',')[0]}</span>
                  </div>
                </td>
                <td className="py-4 px-6 font-bold text-[15px] text-[#201515] dark:text-white">
                  {h.name}
                </td>
                <td className="py-4 px-6">
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${h.type === 'National' ? 'bg-[#eff6ff] text-[#3b82f6]' : 'bg-[#fff7ed] text-[#f97316]'}`}>
                    {h.type}
                  </span>
                </td>
                <td className="py-4 px-6 text-right">
                  {h.isPast ? (
                    <span className="text-xs font-semibold bg-[#f1f5f9] dark:bg-[#1e293b] px-3 py-1 rounded-full text-[#64748b] dark:text-[#94a3b8]">Passed</span>
                  ) : h.daysLeft === 0 ? (
                    <span className="text-xs font-bold bg-[#fef2f2] text-[#ef4444] px-3 py-1 rounded-full animate-pulse">Today!</span>
                  ) : (
                    <span className="text-xs font-semibold bg-[#eceae3] dark:bg-[#282520] px-3 py-1 rounded-full text-[#36342e] dark:text-white">In {h.daysLeft} days</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Holidays;
