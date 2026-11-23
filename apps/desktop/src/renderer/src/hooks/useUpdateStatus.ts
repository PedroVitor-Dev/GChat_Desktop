import { useEffect, useState } from 'react';
import type { UpdateStatus } from '../../../shared/updates';

/** Estado da atualização automática (push do main). */
export function useUpdateStatus(): UpdateStatus | null {
  const [status, setStatus] = useState<UpdateStatus | null>(null);
  useEffect(() => {
    let alive = true;
    void window.gchat.updates.status().then((s) => alive && setStatus(s));
    const off = window.gchat.updates.onStatus((s) => alive && setStatus(s));
    return () => {
      alive = false;
      off();
    };
  }, []);
  return status;
}
