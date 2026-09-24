import { useCallback, useEffect, useState } from 'react';
import { classService } from '../../services/api';
import { Button } from '../ui/Button';
import { Card, CardContent } from '../ui/Card';
import { Check, Clock3, RefreshCw, UserRound, X } from 'lucide-react';
import toast from 'react-hot-toast';

export function EnrollmentRequestManager() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const loadRequests = useCallback(async () => {
    try {
      const result = await classService.getEnrollmentRequests();
      setRequests(result.requests || []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not load enrollment requests');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadRequests(); }, [loadRequests]);

  const review = async (request, decision) => {
    const key = `${request.class.id}:${request.student._id}`;
    setBusyId(key);
    try {
      const result = await classService.reviewEnrollmentRequest(request.class.id, request.student._id, decision);
      toast.success(result.message);
      await loadRequests();
    } catch (error) {
      toast.error(error.response?.data?.message || `Could not ${decision} this request`);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Card className="rounded-2xl border-slate-100 shadow-sm">
      <CardContent className="p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div><h3 className="font-bold text-slate-900">Enrollment requests</h3><p className="mt-1 text-xs text-slate-400">Review students who asked to join a class.</p></div>
          <Button variant="outline" size="sm" onClick={loadRequests} disabled={loading} className="gap-2 rounded-xl"><RefreshCw size={14} className={loading ? 'animate-spin' : ''} /><span className="hidden sm:inline">Refresh</span></Button>
        </div>
        {loading ? <div className="py-8 text-center text-sm text-slate-400">Loading requests…</div> : requests.length === 0 ? <div className="rounded-xl bg-slate-50 px-4 py-8 text-center"><Clock3 className="mx-auto mb-2 text-slate-300" size={23} /><p className="text-sm font-medium text-slate-600">No pending requests</p><p className="mt-1 text-xs text-slate-400">New student requests will appear here.</p></div> : <div className="space-y-3">{requests.map((request) => {
          const key = `${request.class.id}:${request.student._id}`;
          return <div key={key} className="flex flex-col gap-3 rounded-xl border border-slate-100 p-4 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-3"><div className="rounded-xl bg-violet-50 p-2.5 text-violet-600"><UserRound size={18} /></div><div className="min-w-0"><p className="truncate text-sm font-bold text-slate-800">{request.student.name}</p><p className="truncate text-xs text-slate-500">{request.student.email} · Roll {request.student.rollNumber}</p><p className="mt-1 text-xs text-slate-500">Requesting <span className="font-semibold text-slate-700">{request.class.name}</span> ({request.class.code}) · {new Date(request.requestedAt).toLocaleDateString()}</p></div></div>
            <div className="flex gap-2 sm:shrink-0"><Button size="sm" onClick={() => review(request, 'approve')} disabled={!!busyId} className="gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700">{busyId === key ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}Approve</Button><Button size="sm" variant="outline" onClick={() => review(request, 'reject')} disabled={!!busyId} className="gap-1.5 rounded-lg border-rose-200 text-rose-600 hover:bg-rose-50"><X size={14} />Reject</Button></div>
          </div>;
        })}</div>}
      </CardContent>
    </Card>
  );
}
