import React from 'react';

export function RoleBadge({ role }) {
  if (role === 'ENGINEER') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
        ENGINEER
      </span>
    );
  }
  if (role === 'SUPERVISOR') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
        SUPERVISOR
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
      LABOUR
    </span>
  );
}

export function StatusBadge({ status }) {
  let color = 'bg-slate-700 text-slate-300 border-slate-600';

  if (status === 'Present') {
    color = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
  } else if (status === 'Present - Late' || status === 'Late') {
    color = 'bg-amber-500/20 text-amber-400 border-amber-500/30';
  } else if (status === 'Early Checkout' || status === 'Late / Early Checkout') {
    color = 'bg-orange-500/20 text-orange-400 border-orange-500/30';
  } else if (status === 'Absent') {
    color = 'bg-rose-500/20 text-rose-400 border-rose-500/30';
  } else if (status === 'Corrected') {
    color = 'bg-blue-500/20 text-blue-400 border-blue-500/30';
  } else if (status === 'Approved') {
    color = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
  } else if (status === 'Pending') {
    color = 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
  } else if (status === 'Rejected') {
    color = 'bg-red-500/20 text-red-400 border-red-500/30';
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${color}`}>
      {status || 'Unknown'}
    </span>
  );
}
