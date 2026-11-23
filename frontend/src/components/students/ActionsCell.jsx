import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Ellipsis, Loader2 } from 'lucide-react';

const MENU_TONES = {
  default: 'text-gray-700 hover:bg-gray-50',
  warn: 'text-orange-600 hover:bg-orange-50',
  good: 'text-green-600 hover:bg-green-50',
  danger: 'text-red-600 hover:bg-red-50',
};

/**
 * One row's actions: a clear primary button, and a "more" menu for the rest, so the common action
 * is obvious and the risky ones (deactivate, reset, delete) are one deliberate click away.
 * The menu is drawn in a portal so the table's horizontal scrolling cannot clip it.
 *
 * @param {{ primary: { label: string, icon: any, onClick: () => void },
 *           items: Array<{ key: string, label: string, icon: any, onClick: () => void, tone?: string,
 *                          disabled?: boolean, hint?: string, separatorBefore?: boolean }>,
 *           label: string, busy?: boolean }} props
 */
export default function ActionsCell({ primary, items, label, busy = false, sticky = false }) {
  const [menu, setMenu] = useState(null); // { top, right } in viewport pixels
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const close = useCallback(() => setMenu(null), []);

  const toggle = () => {
    if (menu) {
      close();
      return;
    }
    const rect = buttonRef.current.getBoundingClientRect();
    const menuHeight = items.length * 40 + 16;
    const flip = rect.bottom + menuHeight > window.innerHeight;
    setMenu({
      right: Math.max(8, window.innerWidth - rect.right),
      top: flip ? Math.max(8, rect.top - menuHeight - 4) : rect.bottom + 4,
    });
  };

  useEffect(() => {
    if (!menu) return undefined;
    const onDown = (e) => {
      if (!menuRef.current?.contains(e.target) && !buttonRef.current?.contains(e.target)) close();
    };
    const onKey = (e) => e.key === 'Escape' && close();
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [menu, close]);

  const PrimaryIcon = primary.icon;
  return (
    <div
      className={`flex items-center justify-end gap-2 ${sticky ? 'sticky right-0 bg-white group-hover:bg-gray-50 pl-2' : ''}`}
    >
      <button
        type="button"
        onClick={primary.onClick}
        disabled={busy}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 text-xs font-semibold hover:bg-blue-100 transition-colors disabled:opacity-50"
      >
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PrimaryIcon className="w-3.5 h-3.5" />}
        {primary.label}
      </button>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        disabled={busy}
        aria-haspopup="menu"
        aria-expanded={Boolean(menu)}
        aria-label={`More actions for ${label}`}
        className={`p-1.5 rounded-lg border transition-colors disabled:opacity-50 ${
          menu ? 'border-gray-300 bg-gray-100 text-gray-800' : 'border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-gray-800'
        }`}
      >
        <Ellipsis className="w-4 h-4" />
      </button>
      {menu && createPortal(
        <div
          ref={menuRef}
          role="menu"
          aria-label={`Actions for ${label}`}
          style={{ position: 'fixed', top: menu.top, right: menu.right }}
          className="z-50 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-1.5"
        >
          {items.map((item) => {
            const ItemIcon = item.icon;
            return (
              <div key={item.key}>
                {item.separatorBefore && <div className="my-1.5 border-t border-gray-100" role="separator" />}
                <button
                  type="button"
                  role="menuitem"
                  disabled={item.disabled}
                  title={item.hint}
                  onClick={() => { close(); item.onClick(); }}
                  className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-left transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${MENU_TONES[item.tone || 'default']}`}
                >
                  <ItemIcon className="w-4 h-4 shrink-0" />
                  {item.label}
                </button>
              </div>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
}
