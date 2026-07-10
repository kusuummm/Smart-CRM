import { useState, useEffect } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { globalSearch } from '../api/search';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const showResults = query.length >= 2;

  // Debounce the search so we don't hit the backend on every keystroke.
  useEffect(() => {
    if (!showResults) { setResults([]); return; }

    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await globalSearch(query);
        setResults(data.results);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => clearTimeout(timeout);
  }, [query, showResults]);

  // The backend searches all fields at once; when a specific field filter is
  // selected, narrow the results further on the client.
  const filteredResults = results.filter((c) => {
    if (filter === 'all') return true;
    const q = query.toLowerCase();
    const value = (c[filter] || '').toString().toLowerCase();
    return value.includes(q);
  });

  const hasResults = filteredResults.length > 0;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 border border-dark-200 shadow-sm dark:bg-dark-800 dark:border-dark-700">
        <h2 className="text-xl font-bold text-dark-900 mb-1 dark:text-white">Global Search</h2>
        <p className="text-sm text-dark-500 mb-4 dark:text-dark-400">Search across customers, leads, and more</p>

        <div className="flex items-center gap-3 bg-dark-50 rounded-lg p-2 border border-dark-200 dark:border-dark-700 dark:bg-dark-700">
          <Search className="text-dark-400 ml-2 dark:text-dark-500" size={20} />
          <input
            autoFocus
            type="text"
            placeholder="Search by name, mobile, email, company, city..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-dark-900 placeholder-dark-400 dark:text-white"
          />
          {query && <button onClick={() => { setQuery(''); setFilter('all'); }} className="p-1 rounded-lg hover:bg-dark-100 text-dark-400 dark:text-dark-500 dark:hover:bg-dark-600"><X size={18} /></button>}
        </div>

        <div className="flex gap-2 mt-3">
          {['all', 'name', 'mobile', 'email', 'company', 'city'].map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1 text-xs rounded-full font-medium capitalize transition-colors ${filter === f ? 'bg-primary-100 text-primary-700' : 'bg-dark-100 text-dark-600 hover:bg-dark-200'}`}>{f}</button>
          ))}
        </div>
      </div>

      {showResults && (
        <div className="bg-white rounded-xl border border-dark-200 shadow-sm overflow-hidden dark:bg-dark-800 dark:border-dark-700">
          <div className="px-4 py-2 bg-dark-50 border-b border-dark-200 dark:border-dark-700 dark:bg-dark-700">
            <p className="text-sm text-dark-600 dark:text-dark-300">
              {loading ? 'Searching...' : hasResults ? `${filteredResults.length} result${filteredResults.length > 1 ? 's' : ''} found` : `No results found for "${query}"`}
            </p>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-10 text-dark-400 dark:text-dark-500">
              <Loader2 className="animate-spin mr-2" size={18} /> Searching...
            </div>
          ) : hasResults && (
            <div className="divide-y divide-dark-200 dark:divide-dark-700">
              {filteredResults.map(customer => (
                <div key={customer._id} className="px-4 py-3 hover:bg-dark-50 dark:hover:bg-dark-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-dark-900 dark:text-white">{customer.name}</p>
                      <p className="text-sm text-dark-500 dark:text-dark-400">{customer.company} · {customer.city} · {customer.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-dark-600 dark:text-dark-300">{customer.mobile}</p>
                      <p className="text-xs text-dark-400 dark:text-dark-500">{customer.assignedTelecaller}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!showResults && (
        <div className="bg-white rounded-xl p-12 border border-dark-200 shadow-sm text-center dark:bg-dark-800 dark:border-dark-700">
          <Search className="w-12 h-12 text-dark-300 mx-auto mb-3" />
          <p className="text-dark-500 dark:text-dark-400">Start typing to search customers</p>
          <p className="text-sm text-dark-400 mt-1 dark:text-dark-500">Search by name, mobile, email, company, or city</p>
        </div>
      )}
    </div>
  );
}
