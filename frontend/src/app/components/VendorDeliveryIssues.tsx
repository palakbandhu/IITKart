import React, { useEffect, useState } from 'react';
import { Truck, AlertTriangle, MessageSquare, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/app/components/ui/badge';
import api from '@/api/axios';

export function VendorDeliveryIssues() {
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchIssues = async () => {
    try {
      const res = await api.get('/vendors/me/delivery-issues');
      setIssues(res.data.data || []);
    } catch (error) {
      console.error('Failed to fetch delivery issues', error);
      toast.error('Failed to load delivery issues');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssues();
    const interval = setInterval(fetchIssues, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const handleStatusUpdate = async (issueId: string, status: string) => {
    try {
      await api.patch(`/vendors/me/delivery-issues/${issueId}/status`, { status });
      toast.success('Issue status updated');
      fetchIssues(); // Refresh list
    } catch (error) {
      console.error('Failed to update issue status', error);
      toast.error('Failed to update issue status');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 rounded-full border-4 border-[#1E3A8A] border-t-transparent animate-spin"></div>
      </div>
    );
  }

  if (issues.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center bg-white dark:bg-[#0F1E3A] rounded-2xl border border-blue-100 dark:border-blue-900/30 shadow-sm">
        <AlertTriangle className="w-12 h-12 text-blue-200 dark:text-blue-800 mb-4" />
        <h3 className="font-bold text-[#0F172A] dark:text-white mb-1">No Delivery Issues</h3>
        <p className="text-slate-400 text-sm">Everything is running smoothly! Riders haven't reported any issues.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0F172A] dark:text-white mb-0.5" style={{ fontFamily: 'Syne, sans-serif' }}>Delivery Issues</h1>
          <p className="text-slate-400 text-sm">Manage issues reported by delivery partners</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {issues.map(issue => (
          <div key={issue.id} className="bg-white dark:bg-[#0F1E3A] rounded-2xl border border-blue-100 dark:border-blue-900/30 shadow-sm overflow-hidden p-5">
            <div className="flex justify-between items-start mb-3">
              <div>
                <Badge className={`mb-2 font-bold ${issue.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' : issue.status === 'escalated' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                  {issue.status.toUpperCase()}
                </Badge>
                <div className="font-mono text-xs text-slate-400 mb-1">Order #{issue.order?.id}</div>
              </div>
              <span className="text-xs text-slate-400">{new Date(issue.createdAt || issue.date).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</span>
            </div>

            <div className="bg-red-50 dark:bg-red-900/10 rounded-xl p-3 mb-4">
              <h4 className="font-bold text-red-700 dark:text-red-400 text-sm flex items-center gap-1.5 mb-1"><AlertTriangle className="w-4 h-4" /> {(issue.issueType || 'Issue').replace('_', ' ').toUpperCase()}</h4>
              <p className="text-sm text-red-600/80 dark:text-red-300/80">{issue.description}</p>
            </div>

            {issue.order && (
              <div className="space-y-2 mb-4">
                <div className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <MapPin className="w-4 h-4 mt-0.5 text-slate-400 shrink-0" />
                  <span><span className="font-semibold">Delivery To:</span> {issue.order.deliveryAddress}</span>
                </div>
                {issue.order.courier && (
                  <div className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <Truck className="w-4 h-4 mt-0.5 text-slate-400 shrink-0" />
                    <span>
                      <span className="font-semibold">Rider:</span> {issue.order.courier.name} 
                      {issue.order.courier.phone && ` (${issue.order.courier.phone})`}
                    </span>
                  </div>
                )}
              </div>
            )}

            {issue.status === 'pending' && (
              <div className="flex gap-2 mt-4 pt-4 border-t border-blue-50 dark:border-blue-900/20">
                <button 
                  onClick={() => handleStatusUpdate(issue.id, 'resolved')}
                  className="flex-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 font-bold py-2 rounded-xl text-sm transition-colors cursor-pointer">
                  Mark Resolved
                </button>
                <button 
                  onClick={() => handleStatusUpdate(issue.id, 'escalated')}
                  className="flex-1 bg-red-100 hover:bg-red-200 text-red-700 font-bold py-2 rounded-xl text-sm transition-colors cursor-pointer">
                  Escalate
                </button>
              </div>
            )}
            
            {issue.status !== 'pending' && issue.resolutionNotes && (
              <div className="mt-3 pt-3 border-t border-blue-50 dark:border-blue-900/20 text-sm text-slate-500">
                <span className="font-semibold text-slate-600 dark:text-slate-300">Resolution Note: </span>
                {issue.resolutionNotes}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
