'use client';
import { CheckCircle2 } from 'lucide-react';
import {
  ToastProvider,
  ToastPortal,
  ToastViewport,
  Toast,
  ToastContent,
  ToastTitle,
  ToastClose,
  useToastManager,
  toast,
} from '@/components/ui/toast';
function Notices() {
  const { toasts } = useToastManager();
  return (
    <ToastPortal>
      <ToastViewport className="notifications">
        {toasts.map((item) => (
          <Toast key={item.id} toast={item} className="notice-card">
            <ToastContent>
              <CheckCircle2 size={18} />
              <ToastTitle className="flex-1 text-sm" />
              <ToastClose aria-label="关闭通知" className="text-white" />
            </ToastContent>
          </Toast>
        ))}
      </ToastViewport>
    </ToastPortal>
  );
}
export function Notifications() {
  return (
    <ToastProvider toastManager={toast} timeout={5000}>
      <Notices />
    </ToastProvider>
  );
}
