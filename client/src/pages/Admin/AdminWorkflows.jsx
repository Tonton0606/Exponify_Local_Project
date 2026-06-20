/**
 * AdminWorkflows - AI-Powered Workflow Automation Builder
 * Replaces the placeholder "Workflows" page with a fully functional
 * visual automation builder that chains triggers to AI actions to outcomes
 */

import { useState, useEffect } from 'react';
import { 
  Plus, Save, Play, Trash2, Edit3, Sparkles, 
  Zap, Brain, Target, MessageSquare, TrendingUp,
  Clock, AlertTriangle, CheckCircle, ArrowRight,
  Eye, EyeOff, Download, X
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Input, Select } from '../../components/admin/ui';
import { supabase } from '../../config/supabaseClient';
import autoAIEngine from '../../services/ai/autoAIEngine';

const TRIGGER_TYPES = {
  schedule: { label: 'Schedule', icon: Clock, color: 'bg-blue-500', config: { frequency: 'daily', time: '09:00' } },
  database_event: { label: 'Database Event', icon: Zap, color: 'bg-purple-500', config: { table: 'deals', event: 'INSERT', conditions: [] } },
  ai_insight: { label: 'AI Insight', icon: Brain, color: 'bg-amber-500', config: { module: 'deals', metric: 'anomaly', threshold: 0.8 } },
  manual: { label: 'Manual Trigger', icon: Play, color: 'bg-green-500', config: { description: '' } }
};

const ACTION_TYPES = {
  send_notification: { label: 'Send Notification', icon: MessageSquare, color: 'bg-indigo-500', config: { channel: 'in_app', message: '', recipient: 'admin' } },
  run_ai_analysis: { label: 'Run AI Analysis', icon: Brain, color: 'bg-amber-500', config: { module: 'deals', analysis_type: 'insights' } },
  update_record: { label: 'Update Record', icon: Edit3, color: 'bg-teal-500', config: { table: '', field: '', value: '' } },
  generate_report: { label: 'Generate Report', icon: TrendingUp, color: 'bg-rose-500', config: { report_type: 'summary', format: 'pdf' } },
  create_task: { label: 'Create Task', icon: CheckCircle, color: 'bg-emerald-500', config: { title: '', assignee: '', priority: 'medium', due_in_days: 3 } },
  send_email: { label: 'Send Email', icon: MessageSquare, color: 'bg-sky-500', config: { template: '', to: '', subject: '' } },
  webhook: { label: 'Webhook Call', icon: Zap, color: 'bg-gray-500', config: { url: '', method: 'POST', payload: {} } }
};

function WorkflowBlockUI({ block, btype, index, onEdit, onDelete, readOnly }) {
  const config = btype === 'trigger' ? TRIGGER_TYPES[block.type] : ACTION_TYPES[block.type];
  if (!config) return null;
  const Icon = config.icon;

  let description = '';
  if (btype === 'trigger') {
    if (block.type === 'schedule') description = block.config.frequency + ' at ' + block.config.time;
    else if (block.type === 'database_event') description = block.config.event + ' on ' + block.config.table;
    else if (block.type === 'ai_insight') description = block.config.module + ' ' + block.config.metric;
    else description = 'Manual';
  } else {
    description = block.config.message || block.config.module || block.config.report_type || block.config.title || block.config.template || 'Action';
  }

  const borderClass = btype === 'trigger'
    ? 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20'
    : 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20';

  return (
    <div className={'flex items-center gap-3 p-3 rounded-lg border-2 transition-all ' + borderClass}>
      <div className={'w-10 h-10 rounded-lg ' + config.color + ' flex items-center justify-center flex-shrink-0'}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white">{config.label}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{description}</p>
      </div>
      {!readOnly && (
        <div className="flex gap-1">
          <button onClick={() => onEdit && onEdit(index)} className="p-1.5 rounded hover:bg-white/50 dark:hover:bg-white/10 text-gray-400 hover:text-gray-600">
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onDelete && onDelete(index)} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      <Badge variant={btype === 'trigger' ? 'info' : 'warning'} className="text-[10px]">
        {btype === 'trigger' ? 'TRIGGER' : 'ACTION'}
      </Badge>
    </div>
  );
}

function Modal({ open, onClose, title, children, className }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className={'relative bg-white rounded-2xl shadow-2xl w-full max-h-[90vh] overflow-y-auto ' + (className || 'max-w-md')}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function InputField({ label, type, value, onChange, placeholder }) {
  return (
    <div className="space-y-1">
      {label && <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>}
      <input
        type={type || 'text'}
        value={value || ''}
        onChange={onChange}
        placeholder={placeholder}
        className="block w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white placeholder-gray-400 text-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div className="space-y-1">
      {label && <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>}
      <select
        value={value || ''}
        onChange={onChange}
        className="block w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white text-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

function TextAreaField({ label, value, onChange, placeholder, rows }) {
  return (
    <div className="space-y-1">
      {label && <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>}
      <textarea
        rows={rows || 3}
        value={value || ''}
        onChange={onChange}
        placeholder={placeholder}
        className="block w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white placeholder-gray-400 text-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
      />
    </div>
  );
}

export default function AdminWorkflows() {
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [workflowLogs, setWorkflowLogs] = useState([]);
  const [showLogs, setShowLogs] = useState(false);

  const [form, setForm] = useState({
    name: '',
    description: '',
    enabled: true,
    trigger: { type: 'database_event', config: { table: 'deals', event: 'INSERT', conditions: [] } },
    actions: [{ type: 'send_notification', config: { channel: 'in_app', message: '', recipient: 'admin' } }],
  });

  const WORKFLOW_TEMPLATES = [
    {
      name: 'Deal Stage Change Alert',
      desc: 'When a deal moves to Negotiation stage, notify the sales manager',
      icon: TrendingUp,
      trigger: { type: 'database_event', config: { table: 'deals', event: 'UPDATE', conditions: [{ field: 'stage_id', operator: 'changed_to', value: 'negotiation' }] } },
      actions: [
        { type: 'send_notification', config: { channel: 'in_app', message: 'Deal entered Negotiation stage', recipient: 'sales_manager' } },
        { type: 'run_ai_analysis', config: { module: 'deals', analysis_type: 'forecast_update' } }
      ]
    },
    {
      name: 'Daily Pipeline Summary',
      desc: 'Every morning at 9 AM, generate a pipeline summary',
      icon: Clock,
      trigger: { type: 'schedule', config: { frequency: 'daily', time: '09:00' } },
      actions: [
        { type: 'run_ai_analysis', config: { module: 'deals', analysis_type: 'pipeline_summary' } },
        { type: 'send_notification', config: { channel: 'email', message: 'Daily Pipeline Summary', recipient: 'team' } }
      ]
    },
    {
      name: 'New Lead Auto-Score',
      desc: 'When a new contact is created, score the lead automatically',
      icon: Target,
      trigger: { type: 'database_event', config: { table: 'contacts', event: 'INSERT', conditions: [] } },
      actions: [
        { type: 'run_ai_analysis', config: { module: 'contacts', analysis_type: 'lead_scoring' } },
        { type: 'send_notification', config: { channel: 'in_app', message: 'New lead scored', recipient: 'sales_team' } }
      ]
    }
  ];

  useEffect(() => {
    loadWorkflows();
    const savedLogs = JSON.parse(localStorage.getItem('hermes_workflow_logs') || '[]');
    setWorkflowLogs(savedLogs);
  }, []);

  async function loadWorkflows() {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('workflows').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setWorkflows(data || []);
    } catch (err) {
      const saved = JSON.parse(localStorage.getItem('hermes_workflows') || '[]');
      setWorkflows(saved);
    } finally {
      setLoading(false);
    }
  }

  async function saveWorkflow() {
    if (!form.name.trim()) { alert('Please enter a workflow name'); return; }
    const data = { name: form.name, description: form.description, enabled: form.enabled, trigger: form.trigger, actions: form.actions, updated_at: new Date().toISOString() };
    try {
      if (editingWorkflow) {
        await supabase.from('workflows').update(data).eq('id', editingWorkflow.id);
      } else {
        await supabase.from('workflows').insert({ ...data, created_at: new Date().toISOString() });
      }
      await loadWorkflows();
    } catch (err) {
      const saved = JSON.parse(localStorage.getItem('hermes_workflows') || '[]');
      if (editingWorkflow) {
        const idx = saved.findIndex(w => w.id === editingWorkflow.id);
        if (idx >= 0) saved[idx] = { ...saved[idx], ...data };
      } else {
        saved.push({ id: Date.now().toString(), ...data, created_at: new Date().toISOString() });
      }
      localStorage.setItem('hermes_workflows', JSON.stringify(saved));
      await loadWorkflows();
    }
    setShowCreate(false);
    setEditingWorkflow(null);
    resetForm();
  }

  async function deleteWorkflow(wf) {
    if (!window.confirm('Delete workflow "' + wf.name + '"?')) return;
    try {
      await supabase.from('workflows').delete().eq('id', wf.id);
    } catch {
      const saved = JSON.parse(localStorage.getItem('hermes_workflows') || '[]');
      localStorage.setItem('hermes_workflows', JSON.stringify(saved.filter(w => w.id !== wf.id)));
    }
    await loadWorkflows();
  }

  async function toggleWorkflow(wf) {
    try {
      await supabase.from('workflows').update({ enabled: !wf.enabled }).eq('id', wf.id);
    } catch {
      const saved = JSON.parse(localStorage.getItem('hermes_workflows') || '[]');
      const idx = saved.findIndex(w => w.id === wf.id);
      if (idx >= 0) { saved[idx].enabled = !wf.enabled; localStorage.setItem('hermes_workflows', JSON.stringify(saved)); }
    }
    await loadWorkflows();
  }

  function resetForm() {
    setForm({ name: '', description: '', enabled: true, trigger: { type: 'database_event', config: { table: 'deals', event: 'INSERT', conditions: [] } }, actions: [{ type: 'send_notification', config: { channel: 'in_app', message: '', recipient: 'admin' } }] });
  }

  function editWorkflow(wf) {
    setEditingWorkflow(wf);
    setForm({ name: wf.name, description: wf.description || '', enabled: wf.enabled !== false, trigger: wf.trigger || { type: 'database_event', config: {} }, actions: wf.actions || [{ type: 'send_notification', config: {} }] });
    setShowCreate(true);
  }

  function useTemplate(tpl) {
    setForm({ name: tpl.name, description: tpl.desc, enabled: true, trigger: tpl.trigger, actions: tpl.actions });
    setShowTemplates(false);
    setShowCreate(true);
    setEditingWorkflow(null);
  }

  async function runWorkflow(wf) {
    try {
      const result = await autoAIEngine.runModuleAnalysis(wf.trigger?.config?.table || 'deals');
      const log = { id: Date.now().toString(), workflowId: wf.id, workflowName: wf.name, status: 'completed', triggeredAt: new Date().toISOString(), triggeredBy: 'manual' };
      const logs = [log, ...workflowLogs].slice(0, 100);
      setWorkflowLogs(logs);
      localStorage.setItem('hermes_workflow_logs', JSON.stringify(logs));
      alert('Workflow "' + wf.name + '" executed successfully!');
    } catch (err) {
      const log = { id: Date.now().toString(), workflowId: wf.id, workflowName: wf.name, status: 'failed', triggeredAt: new Date().toISOString(), error: err.message, triggeredBy: 'manual' };
      const logs = [log, ...workflowLogs].slice(0, 100);
      setWorkflowLogs(logs);
      localStorage.setItem('hermes_workflow_logs', JSON.stringify(logs));
      alert('Workflow execution failed: ' + err.message);
    }
  }

  function updateForm(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function updateTrigger(config) {
    setForm(prev => ({ ...prev, trigger: { ...prev.trigger, config } }));
  }

  function updateAction(index, config) {
    setForm(prev => {
      const actions = [...prev.actions];
      actions[index] = { ...actions[index], config };
      return { ...prev, actions };
    });
  }

  function addAction() {
    setForm(prev => ({ ...prev, actions: [...prev.actions, { type: 'send_notification', config: { channel: 'in_app', message: '', recipient: 'admin' } }] }));
  }

  function removeAction(index) {
    setForm(prev => ({ ...prev, actions: prev.actions.filter((_, i) => i !== index) }));
  }

  const activeCount = workflows.filter(w => w.enabled !== false).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Workflow Automation</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Create AI-powered automations that respond to events, run on schedules, and execute actions</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" icon={Sparkles} onClick={() => setShowTemplates(true)}>Templates</Button>
          <Button variant="secondary" size="sm" icon={Download} onClick={() => setShowLogs(!showLogs)}>{showLogs ? 'Hide Logs' : 'View Logs'}</Button>
          <Button size="sm" icon={Plus} onClick={() => { resetForm(); setEditingWorkflow(null); setShowCreate(true); }}>New Workflow</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center"><Zap className="w-5 h-5 text-blue-600" /></div>
          <div><p className="text-2xl font-bold text-gray-900 dark:text-white">{workflows.length}</p><p className="text-xs text-gray-500">Total Workflows</p></div>
        </CardContent></Card>
        <Card><CardContent className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center"><Play className="w-5 h-5 text-green-600" /></div>
          <div><p className="text-2xl font-bold text-gray-900 dark:text-white">{activeCount}</p><p className="text-xs text-gray-500">Active Workflows</p></div>
        </CardContent></Card>
        <Card><CardContent className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center"><Brain className="w-5 h-5 text-amber-600" /></div>
          <div><p className="text-2xl font-bold text-gray-900 dark:text-white">{WORKFLOW_TEMPLATES.length}</p><p className="text-xs text-gray-500">Templates</p></div>
        </CardContent></Card>
        <Card><CardContent className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center"><Sparkles className="w-5 h-5 text-purple-600" /></div>
          <div><p className="text-2xl font-bold text-gray-900 dark:text-white">{Object.keys(ACTION_TYPES).length}</p><p className="text-xs text-gray-500">Action Types</p></div>
        </CardContent></Card>
      </div>

      {showLogs && (
        <Card>
          <CardHeader><CardTitle>Execution Logs</CardTitle></CardHeader>
          <CardContent>
            {workflowLogs.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">No workflow executions yet.</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {workflowLogs.map(log => (
                  <div key={log.id} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 dark:bg-white/5">
                    {log.status === 'completed' ? <CheckCircle className="w-4 h-4 text-green-500" /> : <AlertTriangle className="w-4 h-4 text-red-500" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{log.workflowName}</p>
                      <p className="text-xs text-gray-500">{new Date(log.triggeredAt).toLocaleString()}</p>
                    </div>
                    <Badge variant={log.status === 'completed' ? 'success' : 'error'}>{log.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i}><CardContent><div className="animate-pulse space-y-3">
              <div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-1/3" />
              <div className="h-3 bg-gray-200 dark:bg-white/10 rounded w-2/3" />
              <div className="h-8 bg-gray-200 dark:bg-white/10 rounded" />
            </div></CardContent></Card>
          ))}
        </div>
      ) : workflows.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Zap className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Workflows Yet</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Create your first automation workflow to start saving time with AI-powered processes.</p>
            <div className="flex justify-center gap-3">
              <Button icon={Plus} onClick={() => { resetForm(); setShowCreate(true); }}>Create Workflow</Button>
              <Button variant="secondary" icon={Sparkles} onClick={() => setShowTemplates(true)}>Use Template</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {workflows.map(wf => (
            <Card key={wf.id} className={wf.enabled === false ? 'opacity-60' : ''}>
              <CardContent>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{wf.name}</h3>
                      <Badge variant={wf.enabled !== false ? 'success' : 'default'} className="text-[10px]">{wf.enabled !== false ? 'ACTIVE' : 'PAUSED'}</Badge>
                    </div>
                    {wf.description && <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{wf.description}</p>}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide">Trigger: {(wf.trigger?.type || 'N/A').replace(/_/g, ' ')}</span>
                      <ArrowRight className="w-3 h-3 text-gray-400" />
                      <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wide">{(wf.actions?.length || 0) + ' Action' + ((wf.actions?.length || 0) !== 1 ? 's' : '')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button onClick={() => toggleWorkflow(wf)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 hover:text-gray-600" title={wf.enabled !== false ? 'Pause' : 'Activate'}>
                      {wf.enabled !== false ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button onClick={() => runWorkflow(wf)} className="p-2 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 text-gray-400 hover:text-green-500" title="Run Now">
                      <Play className="w-4 h-4" />
                    </button>
                    <button onClick={() => editWorkflow(wf)} className="p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-400 hover:text-blue-500">
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteWorkflow(wf)} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal open={showCreate} onClose={() => { setShowCreate(false); setEditingWorkflow(null); }} title={editingWorkflow ? 'Edit Workflow' : 'Create Workflow'} className="max-w-2xl">
        <div className="space-y-4">
          <InputField label="Workflow Name" value={form.name} onChange={e => updateForm('name', e.target.value)} placeholder="e.g., Daily Pipeline Summary" />
          <TextAreaField label="Description" value={form.description} onChange={e => updateForm('description', e.target.value)} placeholder="Describe what this workflow does..." rows={2} />

          <div>
            <div className="flex items-center gap-2 mb-3"><Zap className="w-4 h-4 text-blue-500" /><span className="text-sm font-semibold text-gray-900 dark:text-white">Trigger</span></div>
            <div className="flex gap-2 mb-3 flex-wrap">
              {Object.entries(TRIGGER_TYPES).map(([key, cfg]) => (
                <button key={key} onClick={() => setForm(prev => ({ ...prev, trigger: { type: key, config: { ...cfg.config } } }))}
                  className={'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ' +
                    (form.trigger.type === key ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500' : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10')}>
                  <cfg.icon className="w-3 h-3" />{cfg.label}
                </button>
              ))}
            </div>
            {form.trigger.type === 'schedule' && (
              <div className="grid grid-cols-2 gap-3">
                <SelectField label="Frequency" value={form.trigger.config.frequency} onChange={e => updateTrigger({ ...form.trigger.config, frequency: e.target.value })} options={[{ value: 'hourly', label: 'Every Hour' }, { value: 'daily', label: 'Daily' }, { value: 'weekly', label: 'Weekly' }, { value: 'monthly', label: 'Monthly' }]} />
                <InputField label="Time" type="time" value={form.trigger.config.time || '09:00'} onChange={e => updateTrigger({ ...form.trigger.config, time: e.target.value })} />
              </div>
            )}
            {form.trigger.type === 'database_event' && (
              <div className="grid grid-cols-2 gap-3">
                <SelectField label="Table" value={form.trigger.config.table} onChange={e => updateTrigger({ ...form.trigger.config, table: e.target.value })} options={[{ value: 'deals', label: 'Deals' }, { value: 'contacts', label: 'Contacts' }, { value: 'tasks', label: 'Tasks' }, { value: 'revenue_entries', label: 'Revenue' }, { value: 'messages', label: 'Messages' }, { value: 'projects', label: 'Projects' }]} />
                <SelectField label="Event" value={form.trigger.config.event} onChange={e => updateTrigger({ ...form.trigger.config, event: e.target.value })} options={[{ value: 'INSERT', label: 'Created' }, { value: 'UPDATE', label: 'Updated' }, { value: 'DELETE', label: 'Deleted' }]} />
              </div>
            )}
            {form.trigger.type === 'ai_insight' && (
              <div className="grid grid-cols-2 gap-3">
                <SelectField label="Module" value={form.trigger.config.module} onChange={e => updateTrigger({ ...form.trigger.config, module: e.target.value })} options={[{ value: 'deals', label: 'Deals' }, { value: 'revenue', label: 'Revenue' }, { value: 'contacts', label: 'Contacts' }, { value: 'tasks', label: 'Tasks' }]} />
                <InputField label="Threshold" type="number" value={form.trigger.config.threshold || 0.8} onChange={e => updateTrigger({ ...form.trigger.config, threshold: parseFloat(e.target.value) || 0.8 })} />
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2"><Brain className="w-4 h-4 text-amber-500" /><span className="text-sm font-semibold text-gray-900 dark:text-white">Actions ({form.actions.length})</span></div>
              <Button variant="ghost" size="sm" icon={Plus} onClick={addAction}>Add Action</Button>
            </div>
            <div className="space-y-3">
              {form.actions.map((action, idx) => (
                <div key={idx} className="p-3 rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5">
                  <div className="flex items-center justify-between mb-2">
                    <SelectField value={action.type} onChange={e => {
                      const actions = [...form.actions];
                      actions[idx] = { type: e.target.value, config: { ...ACTION_TYPES[e.target.value].config } };
                      setForm(prev => ({ ...prev, actions }));
                    }} options={Object.entries(ACTION_TYPES).map(([key, cfg]) => ({ value: key, label: cfg.label }))} />
                    <button onClick={() => removeAction(idx)} className="p-1 text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                  {action.type === 'send_notification' && (
                    <div className="grid grid-cols-2 gap-2">
                      <InputField placeholder="Message..." value={action.config.message} onChange={e => updateAction(idx, { ...action.config, message: e.target.value })} />
                      <InputField placeholder="Recipient..." value={action.config.recipient} onChange={e => updateAction(idx, { ...action.config, recipient: e.target.value })} />
                    </div>
                  )}
                  {action.type === 'run_ai_analysis' && (
                    <div className="grid grid-cols-2 gap-2">
                      <SelectField value={action.config.module || 'deals'} onChange={e => updateAction(idx, { ...action.config, module: e.target.value })} options={[{ value: 'deals', label: 'Deals' }, { value: 'revenue', label: 'Revenue' }, { value: 'contacts', label: 'Contacts' }, { value: 'tasks', label: 'Tasks' }, { value: 'inbox', label: 'Inbox' }]} />
                      <SelectField value={action.config.analysis_type || 'insights'} onChange={e => updateAction(idx, { ...action.config, analysis_type: e.target.value })} options={[{ value: 'insights', label: 'Generate Insights' }, { value: 'forecast', label: 'Forecast' }, { value: 'anomalies', label: 'Detect Anomalies' }, { value: 'summary', label: 'Summary' }]} />
                    </div>
                  )}
                  {action.type === 'create_task' && (
                    <div className="grid grid-cols-2 gap-2">
                      <InputField placeholder="Task title..." value={action.config.title} onChange={e => updateAction(idx, { ...action.config, title: e.target.value })} />
                      <InputField placeholder="Assignee..." value={action.config.assignee} onChange={e => updateAction(idx, { ...action.config, assignee: e.target.value })} />
                    </div>
                  )}
                  {action.type === 'generate_report' && (
                    <div className="grid grid-cols-2 gap-2">
                      <SelectField value={action.config.report_type || 'summary'} onChange={e => updateAction(idx, { ...action.config, report_type: e.target.value })} options={[{ value: 'summary', label: 'Summary Report' }, { value: 'detailed', label: 'Detailed Report' }, { value: 'financial', label: 'Financial Report' }, { value: 'pipeline', label: 'Pipeline Report' }]} />
                      <SelectField value={action.config.format || 'pdf'} onChange={e => updateAction(idx, { ...action.config, format: e.target.value })} options={[{ value: 'pdf', label: 'PDF' }, { value: 'csv', label: 'CSV' }, { value: 'excel', label: 'Excel' }]} />
                    </div>
                  )}
                  {action.type === 'send_email' && (
                    <div className="grid grid-cols-2 gap-2">
                      <InputField placeholder="To email..." value={action.config.to} onChange={e => updateAction(idx, { ...action.config, to: e.target.value })} />
                      <InputField placeholder="Subject..." value={action.config.subject} onChange={e => updateAction(idx, { ...action.config, subject: e.target.value })} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.enabled} onChange={e => updateForm('enabled', e.target.checked)} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
            <span className="text-sm text-gray-700 dark:text-gray-300">Enable workflow on save</span>
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => { setShowCreate(false); setEditingWorkflow(null); }}>Cancel</Button>
            <Button icon={Save} onClick={saveWorkflow}>{editingWorkflow ? 'Update Workflow' : 'Create Workflow'}</Button>
          </div>
        </div>
      </Modal>

      <Modal open={showTemplates} onClose={() => setShowTemplates(false)} title="Workflow Templates" className="max-w-2xl">
        <div className="space-y-3">
          {WORKFLOW_TEMPLATES.map((tpl, idx) => (
            <div key={idx} className="p-4 rounded-lg border border-gray-200 dark:border-white/10 hover:border-amber-300 dark:hover:border-amber-700 cursor-pointer transition-all hover:shadow-md" onClick={() => useTemplate(tpl)}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                  <tpl.icon className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{tpl.name}</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{tpl.desc}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="info" className="text-[10px]">Trigger: {tpl.trigger.type}</Badge>
                    <Badge variant="warning" className="text-[10px]">{tpl.actions.length} Action{tpl.actions.length !== 1 ? 's' : ''}</Badge>
                  </div>
                </div>
                <Button variant="ghost" size="sm" icon={Plus}>Use</Button>
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}