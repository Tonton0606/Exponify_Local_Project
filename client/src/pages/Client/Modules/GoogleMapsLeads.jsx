import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Search, MapPin, Building2, Globe, Mail, Phone, Star, ChevronDown, ChevronUp, ExternalLink, Trash2, RefreshCw, Download, Loader2, AlertCircle, CheckCircle2, XCircle, UserCheck, Filter } from 'lucide-react';
import * as gmapsService from '../../../services/marketing/googleMapsLeads';
import { getCurrentWorkspaceId } from '../../../services/workspaceResolver';

const LEAD_STATUS_COLORS = {
  new: 'bg-blue-100 text-blue-800',
  contacted: 'bg-yellow-100 text-yellow-800',
  qualified: 'bg-green-100 text-green-800',
  unqualified: 'bg-red-100 text-red-800',
  converted: 'bg-emerald-100 text-emerald-800',
  archived: 'bg-gray-100 text-gray-800',
};

const ENRICHMENT_STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  enriched: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  skipped: 'bg-gray-100 text-gray-800',
};

export default function GoogleMapsLeads() {
  const outletContext = useOutletContext() || {};
  const [workspaceId, setWorkspaceId] = useState(
    outletContext?.workspaceId || outletContext?.workspace?.id || ''
  );

  // Resolve workspace ID from outlet context or async resolver (admin portal has no outlet context)
  useEffect(() => {
    const fromContext = outletContext?.workspaceId || outletContext?.workspace?.id;
    if (fromContext) {
      gmapsService.setWorkspaceContext(fromContext);
      setWorkspaceId(fromContext);
      return;
    }
    getCurrentWorkspaceId()
      .then(id => {
        if (id) {
          gmapsService.setWorkspaceContext(id);
          setWorkspaceId(id);
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outletContext?.workspaceId, outletContext?.workspace?.id]);

  const [view, setView] = useState('configs'); // 'configs' | 'leads' | 'search'
  const [configs, setConfigs] = useState([]);
  const [selectedConfig, setSelectedConfig] = useState(null);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [serviceHealth, setServiceHealth] = useState(null);

  // Search form state
  const [searchForm, setSearchForm] = useState({
    location: '',
    search_query: '',
    num_pages: 1,
    search_label: '',
    enrichment_enabled: true,
  });

  // Lead filter state
  const [leadFilters, setLeadFilters] = useState({
    enrichment_status: '',
    lead_status: '',
  });

  const loadConfigs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await gmapsService.getSearchConfigs();
      setConfigs(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadLeads = useCallback(async (configId, filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await gmapsService.getLeads(configId, filters);
      setLeads(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Only load once workspace is resolved — prevents 400 "workspace required" errors on mount
  useEffect(() => {
    if (!workspaceId) return;
    loadConfigs();
    gmapsService.checkHealth().then(setServiceHealth).catch(() => {});
  }, [workspaceId, loadConfigs]);

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await gmapsService.startSearch(searchForm);
      if (result.success) {
        await loadConfigs();
        setView('configs');
      } else {
        setError(result.error || 'Search failed');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleViewLeads = async (config) => {
    setSelectedConfig(config);
    setLeads([]);
    setView('leads');
    await loadLeads(config.id, leadFilters);
  };

  const handleDeleteConfig = async (configId) => {
    if (!window.confirm('Delete this search and all associated leads?')) return;
    setLoading(true);
    try {
      await gmapsService.deleteSearchConfig(configId);
      await loadConfigs();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRunEnrichment = async (configId) => {
    setLoading(true);
    try {
      const result = await gmapsService.runEnrichment(configId);
      if (result.success) {
        await loadConfigs();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateLeadStatus = async (leadId, newStatus) => {
    try {
      await gmapsService.updateLead(leadId, { lead_status: newStatus });
      await loadLeads(selectedConfig.id, leadFilters);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleFilterChange = (field, value) => {
    const newFilters = { ...leadFilters, [field]: value };
    setLeadFilters(newFilters);
    if (selectedConfig) {
      loadLeads(selectedConfig.id, newFilters);
    }
  };

  const handleExport = () => {
    if (!leads.length) return;
    const csv = [
      ['Business Name', 'Address', 'Website', 'Phone', 'Email', 'Facebook', 'Twitter', 'Instagram', 'LinkedIn', 'Rating', 'Reviews', 'Category', 'Status'].join(','),
      ...leads.map(l => [
        `"${(l.business_name || '').replace(/"/g, '""')}"`,
        `"${(l.address || '').replace(/"/g, '""')}"`,
        `"${(l.website || '').replace(/"/g, '""')}"`,
        `"${(l.phone || '').replace(/"/g, '""')}"`,
        `"${(l.email || '').replace(/"/g, '""')}"`,
        `"${(l.facebook || '').replace(/"/g, '""')}"`,
        `"${(l.twitter || '').replace(/"/g, '""')}"`,
        `"${(l.instagram || '').replace(/"/g, '""')}"`,
        `"${(l.linkedin || '').replace(/"/g, '""')}"`,
        l.rating || '',
        l.reviews || '',
        `"${(l.category || '').replace(/"/g, '""')}"`,
        l.lead_status || 'new',
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gmaps_leads_${selectedConfig?.search_label?.replace(/\s+/g, '_') || 'export'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Render: Configs List ───────────────────────────────────────
  const renderConfigs = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Saved Searches</h2>
        <div className="flex gap-2">
          <button
            onClick={loadConfigs}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            onClick={() => {
              setSearchForm({ location: '', search_query: '', num_pages: 1, search_label: '', enrichment_enabled: true });
              setView('search');
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Search className="w-4 h-4" />
            New Search
          </button>
        </div>
      </div>

      {configs.length === 0 && !loading && (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">No searches yet. Start by finding leads in any location!</p>
        </div>
      )}

      <div className="grid gap-4">
        {configs.map(config => (
          <div key={config.id} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium text-gray-900">{config.search_label}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    config.status === 'completed' ? 'bg-green-100 text-green-800' :
                    config.status === 'running' ? 'bg-blue-100 text-blue-800' :
                    config.status === 'failed' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {config.status}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {config.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5" />
                    {config.search_query}
                  </span>
                  <span>{config.num_pages} page{config.num_pages > 1 ? 's' : ''}</span>
                </div>
                <div className="flex items-center gap-4 mt-2 text-sm">
                  <span className="text-gray-700">
                    <strong>{config.total_found || 0}</strong> found
                  </span>
                  <span className="text-gray-700">
                    <strong>{config.total_enriched || 0}</strong> enriched
                  </span>
                  <span className="text-gray-500">
                    {new Date(config.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={() => handleViewLeads(config)}
                  className="px-3 py-1.5 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  View Leads
                </button>
                {config.status === 'completed' && config.total_enriched < config.total_found && (
                  <button
                    onClick={() => handleRunEnrichment(config.id)}
                    className="px-3 py-1.5 text-sm bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors"
                  >
                    Enrich
                  </button>
                )}
                <button
                  onClick={() => handleDeleteConfig(config.id)}
                  className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            {config.error_message && (
              <div className="mt-2 text-sm text-red-600 bg-red-50 rounded p-2">
                {config.error_message}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  // ── Render: Search Form ────────────────────────────────────────
  const renderSearchForm = () => (
    <div className="max-w-2xl mx-auto">
      <button
        onClick={() => setView('configs')}
        className="mb-4 text-sm text-blue-600 hover:text-blue-800"
      >
        ← Back to searches
      </button>
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">New Google Maps Search</h2>
        <form onSubmit={handleSearch} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search Label</label>
            <input
              type="text"
              value={searchForm.search_label}
              onChange={e => setSearchForm({ ...searchForm, search_label: e.target.value })}
              placeholder="e.g., Toronto Realtors Q3"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location *</label>
              <input
                type="text"
                required
                value={searchForm.location}
                onChange={e => setSearchForm({ ...searchForm, location: e.target.value })}
                placeholder="e.g., Toronto, London, New York"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search Query *</label>
              <input
                type="text"
                required
                value={searchForm.search_query}
                onChange={e => setSearchForm({ ...searchForm, search_query: e.target.value })}
                placeholder="e.g., Realtors, Dentists, Roofing"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pages (20 results each)</label>
              <input
                type="number"
                min="1"
                max="10"
                value={searchForm.num_pages}
                onChange={e => setSearchForm({ ...searchForm, num_pages: parseInt(e.target.value) || 1 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Max 10 pages (200 results)</p>
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={searchForm.enrichment_enabled}
                  onChange={e => setSearchForm({ ...searchForm, enrichment_enabled: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">AI Enrichment</span>
              </label>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                Start Search
              </>
            )}
          </button>
        </form>

        {!serviceHealth?.serper_api_key_configured && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-700">
              <strong>API Key Required:</strong> Set <code className="bg-yellow-100 px-1 rounded">SERPER_API_KEY</code> in your server .env to enable Google Maps searches.
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // ── Render: Leads Table ────────────────────────────────────────
  const renderLeads = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => { setView('configs'); setSelectedConfig(null); setLeads([]); }}
            className="mb-1 text-sm text-blue-600 hover:text-blue-800"
          >
            ← Back to searches
          </button>
          <h2 className="text-lg font-semibold text-gray-900">
            Leads: {selectedConfig?.search_label}
          </h2>
          <p className="text-sm text-gray-500">
            {leads.length} results · {leads.filter(l => l.enrichment_status === 'enriched').length} enriched
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Filters */}
          <select
            value={leadFilters.lead_status}
            onChange={e => handleFilterChange('lead_status', e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-2 py-1.5"
          >
            <option value="">All Statuses</option>
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="qualified">Qualified</option>
            <option value="unqualified">Unqualified</option>
            <option value="converted">Converted</option>
            <option value="archived">Archived</option>
          </select>
          <select
            value={leadFilters.enrichment_status}
            onChange={e => handleFilterChange('enrichment_status', e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-2 py-1.5"
          >
            <option value="">All Enrichment</option>
            <option value="pending">Pending</option>
            <option value="enriched">Enriched</option>
            <option value="failed">Failed</option>
            <option value="skipped">Skipped</option>
          </select>
          <button
            onClick={handleExport}
            disabled={!leads.length}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-50 text-green-700 rounded-lg hover:bg-green-100 disabled:opacity-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {leads.length === 0 && !loading && (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">No leads found for this search.</p>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Business</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Contact</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Social</th>
                <th className="text-center px-4 py-3 font-medium text-gray-700">Rating</th>
                <th className="text-center px-4 py-3 font-medium text-gray-700">Status</th>
                <th className="text-center px-4 py-3 font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {leads.map(lead => (
                <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{lead.business_name}</div>
                    <div className="text-gray-500 text-xs mt-0.5">{lead.address}</div>
                    {lead.website && (
                      <a href={lead.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 text-xs flex items-center gap-1 mt-1">
                        <Globe className="w-3 h-3" />
                        Website
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {lead.phone && (
                      <div className="flex items-center gap-1 text-xs">
                        <Phone className="w-3 h-3 text-gray-500" />
                        {lead.phone}
                      </div>
                    )}
                    {lead.email && (
                      <div className="flex items-center gap-1 text-xs mt-1">
                        <Mail className="w-3 h-3 text-gray-500" />
                        <span className="text-blue-600">{lead.email}</span>
                      </div>
                    )}
                    {!lead.email && !lead.phone && (
                      <span className="text-xs text-gray-400">No contact info</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      {lead.facebook && <a href={lead.facebook} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline truncate max-w-[150px]">Facebook</a>}
                      {lead.twitter && <a href={lead.twitter} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline truncate max-w-[150px]">Twitter/X</a>}
                      {lead.instagram && <a href={lead.instagram} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline truncate max-w-[150px]">Instagram</a>}
                      {lead.linkedin && <a href={lead.linkedin} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline truncate max-w-[150px]">LinkedIn</a>}
                      {!lead.facebook && !lead.twitter && !lead.instagram && !lead.linkedin && (
                        <span className="text-xs text-gray-400">Not found</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Star className="w-3.5 h-3.5 text-yellow-500" />
                      <span>{lead.rating || '-'}</span>
                    </div>
                    <div className="text-xs text-gray-500">{lead.reviews || 0} reviews</div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${LEAD_STATUS_COLORS[lead.lead_status] || 'bg-gray-100 text-gray-800'}`}>
                        {lead.lead_status}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${ENRICHMENT_STATUS_COLORS[lead.enrichment_status] || 'bg-gray-100 text-gray-800'}`}>
                        {lead.enrichment_status}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <select
                        value={lead.lead_status}
                        onChange={e => handleUpdateLeadStatus(lead.id, e.target.value)}
                        className="text-xs border border-gray-300 rounded px-1 py-1"
                      >
                        <option value="new">New</option>
                        <option value="contacted">Contacted</option>
                        <option value="qualified">Qualified</option>
                        <option value="unqualified">Unqualified</option>
                        <option value="converted">Converted</option>
                        <option value="archived">Archived</option>
                      </select>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // ── Main Render ────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <MapPin className="w-6 h-6 text-blue-600" />
          Google Maps Lead Generator
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Find and enrich local business leads from any location worldwide using Google Maps data + AI.
        </p>
      </div>

      {!workspaceId && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
          <Loader2 className="w-5 h-5 text-yellow-600 animate-spin flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-700">Resolving workspace… please wait.</div>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-700 flex-1">{error}</div>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Service status warning */}
      {serviceHealth && !serviceHealth.service_available && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-700">
            <strong>Service Unavailable:</strong>{' '}
            {serviceHealth.load_error
              ? `Google Maps service failed to load: ${serviceHealth.load_error}`
              : 'Google Maps lead service is not loaded. Ensure SERPER_API_KEY is set and Python dependencies are installed.'}
            {!serviceHealth.serper_configured && (
              <span className="block mt-1">
                Missing: <code className="bg-yellow-100 px-1 rounded">SERPER_API_KEY</code> — required for Maps searches.
              </span>
            )}
          </div>
        </div>
      )}

      {/* Loading overlay */}
      {loading && (
        <div className="mb-4 flex items-center gap-2 text-sm text-blue-600 bg-blue-50 rounded-lg p-3">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading...
        </div>
      )}

      {/* View switcher */}
      {view === 'configs' && renderConfigs()}
      {view === 'search' && renderSearchForm()}
      {view === 'leads' && renderLeads()}
    </div>
  );
}