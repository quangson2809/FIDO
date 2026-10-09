import { createContext, useContext, useEffect, useId } from 'react';
export const DirtyFormContext = createContext<(id: string, dirty: boolean) => void>(() => undefined);
export const discardChanges = () => window.confirm('Có dữ liệu chưa lưu. Rời biểu mẫu và bỏ các thay đổi này?');
export function useDirtyForm(dirty: boolean) {
  const register = useContext(DirtyFormContext);
  const id = useId();
  useEffect(() => { register(id, dirty); return () => register(id, false); }, [dirty, id, register]);
  return () => !dirty || discardChanges();
}
