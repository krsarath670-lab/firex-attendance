const QUEUE_KEY = 'firex_attendance_offline_queue';
const SYNC_STATE_KEY = 'firex_attendance_last_sync_status';

let syncListeners = [];

export function subscribeToSyncStatus(listener) {
  syncListeners.push(listener);
  return () => {
    syncListeners = syncListeners.filter((l) => l !== listener);
  };
}

function notifySyncListeners(status) {
  try {
    localStorage.setItem(SYNC_STATE_KEY, JSON.stringify(status));
    syncListeners.forEach((l) => l(status));
  } catch (err) {
    console.warn('Sync listener notification error:', err);
  }
}

export function getOfflineQueue() {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Error reading offline queue:', err);
    return [];
  }
}

export function queuePunchAction(actionType, payload) {
  const queue = getOfflineQueue();
  const datePrefix = new Date().toISOString().substring(0, 10).replace(/-/g, '');
  const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
  const uniqueId = `ATT-${datePrefix}-${randomSuffix}`;

  const item = {
    id: uniqueId,
    client_event_id: uniqueId,
    actionType, // 'PUNCH_IN' or 'PUNCH_OUT'
    payload: {
      ...payload,
      client_timestamp: new Date().toISOString(),
    },
    timestamp: new Date().toISOString(),
    status: 'Pending Sync',
    retry_count: 0,
  };

  queue.push(item);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  notifySyncListeners({ state: 'PENDING', remaining: queue.length, lastItem: item });
  return item;
}

export function removeQueueItem(id) {
  const queue = getOfflineQueue();
  const updated = queue.filter((item) => item.id !== id && item.client_event_id !== id);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(updated));
  notifySyncListeners({ state: updated.length ? 'PENDING' : 'SYNCED', remaining: updated.length });
}

export async function syncOfflineQueue(authToken) {
  const queue = getOfflineQueue();
  if (!queue.length) {
    notifySyncListeners({ state: 'SYNCED', remaining: 0 });
    return { synced: 0, failed: 0, remaining: 0 };
  }
  if (!authToken) {
    return { synced: 0, failed: queue.length, remaining: queue.length };
  }

  notifySyncListeners({ state: 'SYNCING', remaining: queue.length });

  let synced = 0;
  let failed = 0;

  // Try bulk batch sync endpoint first
  try {
    const res = await fetch('/api/attendance/sync-batch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ queue }),
    });

    if (res.ok) {
      const data = await res.json();
      // Clear successfully synced items
      if (data.results && Array.isArray(data.results)) {
        for (const resItem of data.results) {
          if (resItem.status === 'SYNCED' || resItem.status === 'ALREADY_EXISTS') {
            removeQueueItem(resItem.id);
            synced++;
          } else {
            failed++;
          }
        }
      } else {
        localStorage.removeItem(QUEUE_KEY);
        synced = queue.length;
      }
      const remainingCount = getOfflineQueue().length;
      notifySyncListeners({
        state: remainingCount === 0 ? 'SYNCED' : 'PARTIALLY_SYNCED',
        remaining: remainingCount,
      });
      return { synced, failed, remaining: remainingCount };
    }
  } catch (batchErr) {
    console.warn('Batch sync endpoint failed, falling back to individual items:', batchErr);
  }

  // Fallback: Individual item sync
  for (const item of queue) {
    const endpoint = item.actionType === 'PUNCH_IN' ? '/api/attendance/punch-in' : '/api/attendance/punch-out';
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          ...item.payload,
          client_event_id: item.client_event_id || item.id,
          client_timestamp: item.timestamp,
        }),
      });

      if (res.ok || res.status === 409) {
        removeQueueItem(item.id);
        synced++;
      } else {
        item.retry_count = (item.retry_count || 0) + 1;
        failed++;
      }
    } catch (err) {
      console.warn(`Sync failed for item ${item.id}:`, err);
      failed++;
    }
  }

  const remaining = getOfflineQueue().length;
  notifySyncListeners({
    state: remaining === 0 ? 'SYNCED' : failed > 0 ? 'SYNC_FAILED' : 'PENDING',
    remaining,
  });

  return { synced, failed, remaining };
}

// Global auto-sync listener when browser reconnects to internet
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('[FIREX Network] Connection restored! Triggering auto-sync...');
    const token = localStorage.getItem('firex_token');
    if (token) {
      syncOfflineQueue(token);
    }
  });
}
