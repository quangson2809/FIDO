import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { useBlocker } from 'react-router-dom';
import { DirtyFormContext, discardChanges } from './dirtyFormContext';
export function DirtyFormProvider({ children }: { children: ReactNode }) {
  const forms = useRef(new Set<string>());
  const register = useCallback((id: string, dirty: boolean) => {
    if (dirty) forms.current.add(id); else forms.current.delete(id);
  }, []);
  const blocker = useBlocker(({ currentLocation, nextLocation }) => forms.current.size > 0 && (currentLocation.pathname !== nextLocation.pathname || currentLocation.search !== nextLocation.search));
  useEffect(() => {
    if (blocker.state === 'blocked') {
      if (discardChanges()) blocker.proceed(); else blocker.reset();
    }
  }, [blocker]);
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (forms.current.size) { event.preventDefault(); event.returnValue = ''; }
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, []);
  return <DirtyFormContext.Provider value={register}>{children}</DirtyFormContext.Provider>;
}
