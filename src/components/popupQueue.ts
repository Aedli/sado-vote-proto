import { useEffect } from 'react';
import { create } from 'zustand';

/** 자동으로 뜨는 팝업(공지·안내·설명)이 겹치지 않도록 한 번에 하나씩, 요청한 순서대로 띄운다 */
interface QueueState {
  queue: string[];
  request: (id: string) => void;
  release: (id: string) => void;
}

const useQueue = create<QueueState>((set) => ({
  queue: [],
  request: (id) => set((s) => (s.queue.includes(id) ? s : { queue: [...s.queue, id] })),
  release: (id) => set((s) => ({ queue: s.queue.filter((x) => x !== id) })),
}));

/**
 * wanted가 true인 동안 차례를 기다리고, 내 차례면 open = true.
 * 닫을 때 done()을 불러 다음 팝업에 차례를 넘긴다.
 */
export function useAutoPopup(id: string, wanted: boolean): { open: boolean; done: () => void } {
  const active = useQueue((s) => s.queue[0]);
  const request = useQueue((s) => s.request);
  const release = useQueue((s) => s.release);
  useEffect(() => {
    if (!wanted) return;
    request(id);
    return () => release(id);
  }, [id, wanted, request, release]);
  return { open: wanted && active === id, done: () => release(id) };
}
