import { X } from 'lucide-react';
import { useEffect } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  fullScreen?: boolean;
  /** Use a wider max-width panel (e.g. for the "Add Meals" browse modal) */
  wide?: boolean;
  /**
   * When fullScreen=true and no title, a floating close button is shown by default.
   * Pass false to suppress it when the child provides its own back/close control.
   */
  showCloseButton?: boolean;
}

export function Modal({
  open,
  onClose,
  title,
  children,
  fullScreen = false,
  wide = false,
  showCloseButton = true,
}: ModalProps) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  // ── Full-screen (mobile) variant ──────────────────────────────────────────
  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 bg-white flex flex-col">
        {title && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>
        )}
        {!title && showCloseButton && (
          <button
            onClick={onClose}
            className="absolute right-4 z-10 p-2 rounded-full bg-white/90 text-gray-500 hover:text-gray-700 shadow-sm"
            style={{ top: 'max(1rem, env(safe-area-inset-top))' }}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        )}
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    );
  }

  // ── Centred dialog (tablet / desktop) variant ─────────────────────────────
  const panelWidth = wide ? 'max-w-4xl' : 'max-w-2xl';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white rounded-2xl shadow-2xl w-full ${panelWidth} max-h-[90vh] flex flex-col`}>
        {title ? (
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>
        ) : (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/90 text-gray-500 hover:text-gray-700 shadow-sm"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        )}
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
