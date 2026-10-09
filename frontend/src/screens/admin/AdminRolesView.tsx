import React, { useCallback, useEffect, useState } from 'react';
import { adminAccessService } from '../../features/adminAccess/api/service';
import { PermissionManagementPanel } from '../../features/adminAccess/components/PermissionManagementPanel';
import { RoleManagementPanel } from '../../features/adminAccess/components/RoleManagementPanel';
import type { AccessControlDto } from '../../features/adminAccess/types';
import { getApiErrorMessage } from '../../services/http/apiError';

export const AdminRolesView: React.FC<{ showToast: (msg: string) => void }> = ({ showToast }) => {
  const [access, setAccess] = useState<AccessControlDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadAccess = useCallback(async () => {
    try {
      setAccess(await adminAccessService.getAccessControl());
      setError(null);
    } catch (requestError: unknown) {
      setError(getApiErrorMessage(requestError, 'Không thể tải ma trận phân quyền.'));
    }
  }, []);

  useEffect(() => {
    let active = true;

    void adminAccessService.getAccessControl()
      .then((result) => {
        if (!active) return;
        setAccess(result);
        setError(null);
      })
      .catch((requestError: unknown) => {
        if (active) {
          setError(getApiErrorMessage(requestError, 'Không thể tải ma trận phân quyền.'));
        }
      });

    return () => {
      active = false;
    };
  }, []);

  if (error && !access) {
    return (
      <div className="border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error}<button type="button" onClick={() => void loadAccess()}>Thử lại</button>
      </div>
    );
  }

  if (!access) {
    return <div className="p-8 text-center text-sm text-[#687069]">Đang tải phân quyền...</div>;
  }

  return (
    <section className="space-y-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#1B5038]">RBAC</p>
        <h1 className="mt-1 font-serif text-3xl">Vai trò & quyền</h1>
        <p className="mt-2 max-w-3xl text-sm text-[#606863]">
          Quản lý vai trò và các quyền được gán. Kiểm tra kỹ thay đổi vì chúng ảnh hưởng đến tài khoản đang sử dụng.
        </p>
      </header>

      {error && (
        <div className="border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}<button type="button" onClick={() => void loadAccess()}>Thử lại</button>
        </div>
      )}

      <fieldset disabled={Boolean(error)} className="space-y-6">
      <RoleManagementPanel
        access={access}
        busy={busy}
        onBusyChange={setBusy}
        refreshAccess={loadAccess}
        showToast={showToast}
      />

      <PermissionManagementPanel
        access={access}
        busy={busy}
        onBusyChange={setBusy}
        refreshAccess={loadAccess}
        showToast={showToast}
      />
      </fieldset>
    </section>
  );
};
