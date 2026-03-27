'use client';

import React, { useState, useEffect } from 'react';

export default function EngineToggle() {
  const [isEnabled, setIsEnabled] = useState<boolean | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetch('/api/admin/settings?key=engine_enabled')
      .then((res) => res.json())
      .then((data) => setIsEnabled(data.value ?? true))
      .catch(() => setIsEnabled(true));
  }, []);

  const handleToggle = async () => {
    if (isEnabled === null || isUpdating) return;

    const newValue = !isEnabled;
    setIsUpdating(true);

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'engine_enabled', value: newValue }),
      });

      if (res.ok) {
        setIsEnabled(newValue);
      }
    } catch (err) {
      console.error('Failed to toggle engine:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  if (isEnabled === null) return <div className="animate-pulse h-6 w-24 bg-gray-200 rounded"></div>;

  return (
    <div className="flex items-center gap-3">
      <span className={`text-[10px] font-bold uppercase tracking-widest ${isEnabled ? 'text-green-600' : 'text-gray-400'}`}>
        Engine {isEnabled ? 'Active' : 'Paused'}
      </span>
      <button
        onClick={handleToggle}
        disabled={isUpdating}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
          isEnabled ? 'bg-blue-600' : 'bg-gray-200'
        } ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            isEnabled ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}
