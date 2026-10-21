export function StatCard({ title, value, icon: Icon, trend, trendUp = true, color = 'blue', onClick }) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300',
    green: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300',
    yellow: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300',
    slate: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    orange: 'bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-300',
    red: 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300',
    sky: 'bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-300',
  };
  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-dark-800 rounded-xl p-6 border border-slate-200 dark:border-dark-700 shadow-xs ${onClick ? 'cursor-pointer hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-md transition-all' : ''}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-dark-500 dark:text-dark-400">{title}</p>
          <p className="text-2xl font-bold text-dark-900 mt-1 dark:text-white">{value}</p>
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              <span className={`text-xs font-medium ${trendUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>{trendUp ? '↑' : '↓'} {trend}</span>
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
