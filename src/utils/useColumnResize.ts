import { useState, useCallback, useRef } from 'react';

/**
 * 通用列宽拖拽 hook
 * @param initialWidths 初始列宽映射 { colKey: px }
 * @returns widths, onResizeStart
 */
export function useColumnResize(initialWidths: Record<string, number>) {
  const [widths, setWidths] = useState<Record<string, number>>(initialWidths);
  const dragState = useRef<{ colKey: string; startX: number; startWidth: number } | null>(null);

  const onResizeStart = useCallback((colKey: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    dragState.current = { colKey, startX: e.clientX, startWidth: widths[colKey] ?? 80 };

    const onMouseMove = (ev: MouseEvent) => {
      if (!dragState.current) return;
      const delta = ev.clientX - dragState.current.startX;
      const newWidth = Math.max(40, Math.min(500, dragState.current.startWidth + delta));
      setWidths(prev => ({ ...prev, [dragState.current!.colKey]: newWidth }));
    };

    const onMouseUp = () => {
      dragState.current = null;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };

    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [widths]);

  return { widths, onResizeStart };
}

/** 列拖拽手柄样式 */
export const resizeHandleStyle: React.CSSProperties = {
  position: 'absolute',
  right: 0,
  top: 0,
  bottom: 0,
  width: 6,
  cursor: 'col-resize',
  zIndex: 5,
  background: 'transparent',
};
