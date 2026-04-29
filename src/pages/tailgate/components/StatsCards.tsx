interface StatsCardsProps {
  today_total: number;
  today_date: string;
  today_entries: number;
  today_tailgates: number;
  total_unidentified: number;
  total_violations: number;
}

const StatsCards = ({ today_total, today_date, today_entries, today_tailgates, total_unidentified, total_violations }: StatsCardsProps) => {
  const cards = [
    {
      label: "Today's Events", value: today_total, sub: today_date,
      color: 'text-[#21295A]', border: 'border-l-4 border-l-[#21295A]',
      icon: (
        <svg className="h-4 w-4 text-[#21295A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} />
        </svg>
      ),
    },
    {
      label: 'Entries', value: today_entries, sub: 'Lane door entries',
      color: 'text-green-600', border: 'border-l-4 border-l-green-400',
      icon: (
        <svg className="h-4 w-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} />
        </svg>
      ),
    },
    {
      label: 'Tailgates', value: today_tailgates, sub: 'Detected today',
      color: 'text-red-600', border: 'border-l-4 border-l-red-400',
      icon: (
        <svg className="h-4 w-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} />
        </svg>
      ),
    },
    {
      label: 'Unidentified', value: total_unidentified, sub: 'Across all dates',
      color: 'text-yellow-600', border: 'border-l-4 border-l-yellow-400',
      icon: (
        <svg className="h-4 w-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} />
        </svg>
      ),
    },
    {
      label: 'Violations', value: total_violations, sub: 'All time',
      color: 'text-red-600', border: 'border-l-4 border-l-red-600',
      icon: (
        <svg className="h-4 w-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} />
        </svg>
      ),
    },
  ];

  return (
    <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map(s => (
        <div key={s.label} className={`rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 ${s.border}`}>
          <div className="mb-1.5 flex items-center gap-1.5">
            {s.icon}
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{s.label}</p>
          </div>
          <p className={`text-[26px] font-bold leading-none ${s.color}`}>{s.value ?? '—'}</p>
          <p className="mt-1 text-[11px] text-gray-400">{s.sub}</p>
        </div>
      ))}
    </div>
  );
};

export default StatsCards;
