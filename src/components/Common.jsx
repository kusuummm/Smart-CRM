export function StatCard({ title, value, icon: Icon, trend, trendUp = true, color = 'blue', onClick }) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600', green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600', purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600', red: 'bg-red-50 text-red-600',
    indigo: 'bg-indigo-50 text-indigo-600',
  };
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl p-6 border border-dark-200 shadow-sm ${onClick ? 'cursor-pointer hover:border-primary-300 hover:shadow-md transition-all' : ''}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-dark-500 dark:text-dark-400">{title}</p>
          <p className="text-2xl font-bold text-dark-900 mt-1 dark:text-white">{value}</p>
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              <span className={`text-xs font-medium ${trendUp ? 'text-green-600' : 'text-red-600'}`}>{trendUp ? '↑' : '↓'} {trend}</span>
              <span className="text-xs text-dark-400 dark:text-dark-500">vs last month</span>
            </div>
          )}
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClasses[color]}`}><Icon size={24} /></div>
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h2 className="text-2xl font-bold text-dark-900 dark:text-white">{title}</h2>
        {subtitle && <p className="text-sm text-dark-500 mt-1 dark:text-dark-400">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
