import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';

export function DataTable({ data, columns, page, pageSize, onPageChange, onSearch, searchPlaceholder = "Search...", emptyMessage = "No data found" }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');

  useMemo(() => {
    if (onSearch) onSearch(searchTerm);
  }, [searchTerm, onSearch]);

  const filteredData = useMemo(() => {
    if (!searchTerm || !onSearch) return data;
    const lower = searchTerm.toLowerCase();
    return data.filter(row =>
      columns.some(col => {
        const val = row[col.key];
        return val && String(val).toLowerCase().includes(lower);
      })
    );
  }, [data, searchTerm, columns, onSearch]);

  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;
    return [...filteredData].sort((a, b) => {
      const aVal = String(a[sortKey] || '').toLowerCase();
      const bVal = String(b[sortKey] || '').toLowerCase();
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortKey, sortDir]);

  const totalPages = Math.ceil(sortedData.length / pageSize);
  const paginated = sortedData.slice((page - 1) * pageSize, page * pageSize);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const capitalize = (s) => {
    if (!s) return '-';
    return String(s).replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div>
      {onSearch && (
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400 dark:text-dark-500" size={18} />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full max-w-md pl-10 pr-4 py-2.5 border border-dark-200 dark:border-dark-700 rounded-lg text-sm bg-white dark:bg-dark-800 text-dark-900 dark:text-white placeholder:text-dark-400 dark:placeholder:text-dark-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>
      )}
      <div className="overflow-x-auto rounded-lg border border-dark-200 dark:border-dark-700">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-dark-50 dark:bg-dark-700">
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => col.sortable !== false && handleSort(col.key)}
                  className={`px-4 py-3 text-left text-xs font-semibold text-dark-500 uppercase tracking-wider ${col.sortable !== false ? 'cursor-pointer hover:bg-dark-100 dark:hover:bg-dark-600' : ''} dark:text-dark-400`}
                >
                  <div className={`flex items-center gap-1 ${col.align === 'center' ? 'justify-center' : col.align === 'right' ? 'justify-end' : ''}`}>
                    {col.label}
                    {col.sortable !== false && sortKey === col.key && (
                      <span className="text-primary-600">{sortDir === 'asc' ? ' ↑' : ' ↓'}</span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-200 bg-white dark:bg-dark-800 dark:divide-dark-700">
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-dark-400 dark:text-dark-500">{emptyMessage}</td>
              </tr>
            ) : (
              paginated.map((row, idx) => (
                <tr key={row.id || idx} className="hover:bg-dark-50 transition-colors dark:hover:bg-dark-700">
                  {columns.map((col) => (
                    <td key={col.key} className={`px-4 py-3 text-dark-700 ${col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : ''} dark:text-gray-300`}>
                      {col.render ? col.render(row[col.key], row) : capitalize(row[col.key])}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-dark-500 dark:text-dark-400">
            Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, sortedData.length)} of {sortedData.length} entries
          </p>
          <div className="flex items-center gap-1">
            <button onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page === 1} className="px-3 py-1.5 text-sm rounded-lg border border-dark-200 hover:bg-dark-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-dark-700 dark:hover:bg-dark-700">Previous</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => onPageChange(p)} className={`px-3 py-1.5 text-sm rounded-lg ${p === page ? 'bg-primary-600 text-white' : 'border border-dark-200 hover:bg-dark-50'} dark:border-dark-700 dark:bg-dark-700 dark:hover:bg-dark-700`}>{p}</button>
            ))}
            <button onClick={() => onPageChange(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="px-3 py-1.5 text-sm rounded-lg border border-dark-200 hover:bg-dark-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-dark-700 dark:hover:bg-dark-700">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}