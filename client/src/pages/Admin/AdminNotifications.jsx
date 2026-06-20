import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from '../../components/admin/ui';
import { Bell, CheckCheck, Settings, AlertCircle, Info, CheckCircle, AlertTriangle, X } from 'lucide-react';

export default function AdminNotifications() {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('hermes_notifications') || '[]');
    setNotifications(saved.length > 0 ? saved : [
      { id: '1', type: 'info', title: 'Welcome to Hermes Notifications', message: 'You will receive alerts about deals, tasks, and system updates here.', read: false, time: new Date().toISOString() },
      { id: '2', type: 'success', title: 'System Ready', message: 'All modules are operational and AI engine is running.', read: false, time: new Date().toISOString() },
    ]);
  }, []);

  const icons = { info: Info, success: CheckCircle, warning: AlertTriangle, error: AlertCircle };
  const colors = { info: 'bg-blue-100 text-blue-600', success: 'bg-green-100 text-green-600', warning: 'bg-amber-100 text-amber-600', error: 'bg-red-100 text-red-600' };

  function markRead(id) {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }

  function markAllRead() {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }

  function remove(id) {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Notifications</h1>
          {unreadCount > 0 && <Badge variant="error">{unreadCount} unread</Badge>}
        </div>
        {unreadCount > 0 && <Button variant="ghost" size="sm" icon={CheckCheck} onClick={markAllRead}>Mark All Read</Button>}
      </div>

      {notifications.length === 0 ? (
        <Card><CardContent className="text-center py-12">
          <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Notifications</h3>
          <p className="text-sm text-gray-500">You're all caught up! Notifications from the AI engine and system will appear here.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => {
            const Icon = icons[n.type] || Info;
            return (
              <div key={n.id} onClick={() => markRead(n.id)} className={'flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all hover:shadow-sm ' + (n.read ? 'bg-white dark:bg-white/5 border-gray-100 dark:border-white/10' : 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800')}>
                <div className={'w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ' + (colors[n.type] || colors.info)}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={'text-sm ' + (n.read ? 'text-gray-700 dark:text-gray-300' : 'text-gray-900 dark:text-white font-medium')}>{n.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{n.message}</p>
                  <p className="text-[10px] text-gray-400 mt-1">{new Date(n.time).toLocaleString()}</p>
                </div>
                <button onClick={e => { e.stopPropagation(); remove(n.id); }} className="p-1 text-gray-400 hover:text-gray-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}