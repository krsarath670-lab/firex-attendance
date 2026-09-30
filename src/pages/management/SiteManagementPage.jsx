import React, { useState, useEffect } from 'react';
import { Building, Plus, MapPin, Edit2, ShieldAlert, X, Save, RefreshCw, AlertCircle } from 'lucide-react';

export function SiteManagementPage() {
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSite, setEditingSite] = useState(null);

  const fetchSites = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/sites', {
        headers: { Authorization: `Bearer ${localStorage.getItem('firex_token')}` },
      });
      if (res.ok) {
        setSites(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSites();
  }, []);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">Work Sites & Geofences</h1>
          <p className="text-xs text-slate-400">
            Define project locations, GPS coordinates, and allowed punch radiuses
          </p>
        </div>

        <button
          onClick={() => {
            setEditingSite(null);
            setShowModal(true);
          }}
          className="px-4 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-2xl text-xs font-bold shadow-lg shadow-rose-600/30 flex items-center space-x-1.5 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Add Work Site</span>
        </button>
      </div>

      {/* Sites Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full p-8 text-center text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin text-rose-500 mx-auto mb-2" />
            <p className="text-xs">Loading sites...</p>
          </div>
        ) : sites.length === 0 ? (
          <div className="col-span-full bg-slate-900 border border-slate-800 rounded-3xl p-10 text-center text-slate-400">
            <Building className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-white">No sites registered yet</p>
          </div>
        ) : (
          sites.map((site) => (
            <div
              key={site.id}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-3xl p-5 shadow-lg space-y-3 transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
                      <Building className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">{site.site_name}</h3>
                      <span className="text-[10px] font-mono text-slate-400 font-bold">{site.site_code}</span>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      site.status === 'Active'
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                    }`}
                  >
                    {site.status}
                  </span>
                </div>

                <div className="mt-3 space-y-1.5 text-xs text-slate-300">
                  <p className="text-slate-400 flex items-center space-x-1">
                    <MapPin className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
                    <span className="truncate">{site.address || site.area || 'Bahrain'}</span>
                  </p>
                  {site.latitude && site.longitude && (
                    <p className="text-[11px] font-mono text-slate-400">
                      GPS: {site.latitude.toFixed(4)}, {site.longitude.toFixed(4)} (±{site.allowed_radius || 100}m radius)
                    </p>
                  )}
                  {site.remarks && <p className="text-[11px] text-slate-500 italic mt-1">{site.remarks}</p>}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">Radius: {site.allowed_radius || 100} meters</span>
                <button
                  onClick={() => {
                    setEditingSite(site);
                    setShowModal(true);
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 rounded-xl flex items-center space-x-1 transition"
                >
                  <Edit2 className="w-3 h-3 text-blue-400" />
                  <span>Edit Site</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Site Modal */}
      {showModal && (
        <SiteModal
          site={editingSite}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            fetchSites();
          }}
        />
      )}
    </div>
  );
}

function SiteModal({ site, onClose, onSuccess }) {
  const isEdit = Boolean(site);
  const [formData, setFormData] = useState({
    site_code: site?.site_code || '',
    site_name: site?.site_name || '',
    address: site?.address || '',
    area: site?.area || '',
    latitude: site?.latitude || 26.2415,
    longitude: site?.longitude || 50.5368,
    allowed_radius: site?.allowed_radius || 150,
    status: site?.status || 'Active',
    remarks: site?.remarks || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.site_name.trim()) {
      setError('Site Name is required.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const url = isEdit ? `/api/sites/${site.id}` : '/api/sites';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('firex_token')}`,
        },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error('Failed to save site');
      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white bg-slate-800 rounded-full transition"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-xl font-bold text-white mb-1">{isEdit ? 'Edit Site' : 'Add Work Site'}</h3>
        <p className="text-xs text-slate-400 mb-5">Configure project site parameters and allowed geofence radius</p>

        {error && (
          <div className="mb-4 p-3 bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs rounded-xl flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Site Code</label>
              <input
                type="text"
                placeholder="e.g. SITE-HQ"
                value={formData.site_code}
                onChange={(e) => setFormData({ ...formData, site_code: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Site Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. FIREX Main Workshop"
                value={formData.site_name}
                onChange={(e) => setFormData({ ...formData, site_name: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Address / Street</label>
            <input
              type="text"
              placeholder="e.g. Villa 13, Building 2373, Road 2831"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Latitude</label>
              <input
                type="number"
                step="any"
                value={formData.latitude}
                onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Longitude</label>
              <input
                type="number"
                step="any"
                value={formData.longitude}
                onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Radius (Meters)</label>
              <input
                type="number"
                value={formData.allowed_radius}
                onChange={(e) => setFormData({ ...formData, allowed_radius: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Remarks</label>
            <textarea
              rows={2}
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-2xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-2xl text-xs font-bold shadow-lg shadow-rose-600/30 flex items-center space-x-1.5"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'Saving...' : 'Save Site'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
