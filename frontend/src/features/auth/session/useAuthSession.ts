import { useContext } from 'react';
import { AuthSessionContext, type AuthSessionContextValue } from './sessionContext';

export const useAuthSession = (): AuthSessionContextValue => {
  const context = useContext(AuthSessionContext);
  if (!context) throw new Error('useAuthSession must be used within AuthSessionProvider');
  return context;
};
