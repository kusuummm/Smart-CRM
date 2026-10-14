import { useState } from 'react';
import { X, Phone, ShieldCheck, Check, Sparkles } from 'lucide-react';

export default function BuyNumberModal({ isOpen, onClose }) {
  const [selectedCity, setSelectedCity] = useState('delhi');
  const [selectedNumber, setSelectedNumber] = useState(null);
  const [purchased, setPurchased] = useState(false);

  if (!isOpen) return null;

  const numbersByCity = {
    delhi: [
      { number: '+91 11 4982 5501', type: 'Local Landline', price: '₹499/mo' },
      { number: '+91 11 4982 5502', type: 'Local Landline', price: '₹499/mo' },
      { number: '+91 11 4982 9900', type: 'VIP Golden', price: '₹999/mo' },
    ],
    mumbai: [
      { number: '+91 22 6105 4401', type: 'Local Landline', price: '₹499/mo' },
      { number: '+91 22 6105 7788', type: 'VIP Golden', price: '₹999/mo' },
    ],
    bangalore: [
      { number: '+91 80 4719 3201', type: 'Local Landline', price: '₹499/mo' },
      { number: '+91 80 4719 3202', type: 'Local Landline', price: '₹499/mo' },
    ],
    tollfree: [
      { number: '1800 120 4488', type: 'Toll-Free 1800', price: '₹1499/mo' },
      { number: '1800 120 9900', type: 'Toll-Free VIP', price: '₹1999/mo' },
    ],
  };

  const handleBuy = () => {
    if (!selectedNumber) return;
    try {
      const existing = JSON.parse(localStorage.getItem('smartcrm_teams') || '[]');
      const cityName = selectedCity.charAt(0).toUpperCase() + selectedCity.slice(1);
      const newTeam = {
        id: existing.length > 0 ? Math.max(...existing.map((t) => Number(t.id) || 0)) + 1 : 1,
        name: `${cityName} Team`,
        status: 'Active',
        number: selectedNumber.number,
        staffActive: 1,
        staffTotal: 5,
        leadsUsed: 0,
        leadsTotal: 10000,
      };
      localStorage.setItem('smartcrm_teams', JSON.stringify([...existing, newTeam]));
      window.dispatchEvent(new Event('storage'));
    } catch {}
    setPurchased(true);
    setTimeout(() => {
      setPurchased(false);
      setSelectedNumber(null);
      onClose();
    }, 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-dark-900 rounded-2xl border border-dark-200 dark:border-dark-700 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-dark-200 dark:border-dark-700 flex items-center justify-between bg-dark-50/50 dark:bg-dark-800/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Phone size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-dark-900 dark:text-white">
                Buy a New Virtual Number
              </h3>
              <p className="text-xs text-dark-500">
                Instant cloud telephony activation for your teams
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-dark-400 hover:text-dark-700 hover:bg-dark-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {purchased ? (
            <div className="py-8 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <Check size={28} />
              </div>
              <h4 className="font-bold text-dark-900 dark:text-white text-base">
                Virtual Line Activated!
              </h4>
              <p className="text-xs text-dark-500">
                {selectedNumber?.number} is ready. Incoming calls are now routed to your team.
              </p>
            </div>
          ) : (
            <>
              {/* City / Type Pills */}
              <div>
                <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1.5">
                  Choose Region / Plan:
                </label>
                <div className="grid grid-cols-4 gap-2 text-xs font-semibold">
                  {[
                    { id: 'delhi', label: 'Delhi (011)' },
                    { id: 'mumbai', label: 'Mumbai (022)' },
                    { id: 'bangalore', label: 'Bengaluru (080)' },
                    { id: 'tollfree', label: 'Toll-Free' },
                  ].map((city) => (
                    <button
                      key={city.id}
                      onClick={() => {
                        setSelectedCity(city.id);
                        setSelectedNumber(null);
                      }}
                      className={`p-2 rounded-xl text-center border transition-all ${
                        selectedCity === city.id
                          ? 'border-blue-600 bg-blue-50 text-blue-700 font-bold dark:bg-blue-950 dark:text-blue-300'
                          : 'border-dark-200 dark:border-dark-700 text-dark-600 hover:bg-dark-50'
                      }`}
                    >
                      {city.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Number List */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300">
                  Available Cloud Phone Numbers:
                </label>
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {numbersByCity[selectedCity]?.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => setSelectedNumber(item)}
                      className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                        selectedNumber?.number === item.number
                          ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 ring-1 ring-blue-500'
                          : 'border-dark-200 dark:border-dark-700 hover:border-dark-300 bg-white dark:bg-dark-800'
                      }`}
                    >
                      <div>
                        <p className="font-mono font-bold text-sm text-dark-900 dark:text-white">
                          {item.number}
                        </p>
                        <span className="text-[11px] text-dark-500">{item.type}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-blue-600 dark:text-blue-400 text-xs">
                          {item.price}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!purchased && (
          <div className="p-3.5 border-t border-dark-200 dark:border-dark-700 flex items-center justify-between bg-dark-50/50 dark:bg-dark-800/40">
            <span className="text-xs text-dark-500">
              {selectedNumber ? `Selected: ${selectedNumber.number}` : 'Select a number to continue'}
            </span>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-3.5 py-1.5 text-xs font-medium text-dark-600 hover:bg-dark-200/60 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleBuy}
                disabled={!selectedNumber}
                className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors shadow-xs"
              >
                Activate Number
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
