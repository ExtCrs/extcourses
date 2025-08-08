'use client';

import React, { useRef, useEffect } from 'react';
import ReactSimpleWYSIWYG from 'react-simple-wysiwyg';

export default function SimpleEditor({ value, onChange, placeholder = '', disabled = false }) {
  const wrapperRef = useRef();

  // Функция для показа тулбара только при выделении (если не заблокировано)
  const checkSelection = () => {
    if (disabled) return;
    const selection = window.getSelection();
    if (
      selection &&
      selection.rangeCount > 0 &&
      selection.toString().length > 0 &&
      wrapperRef.current &&
      wrapperRef.current.contains(selection.anchorNode)
    ) {
      wrapperRef.current.classList.add('selection');
    } else {
      wrapperRef.current.classList.remove('selection');
    }
  };

  // Убираем .selection при клике вне редактора
  useEffect(() => {
    if (disabled) return;
    const handleClick = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        wrapperRef.current.classList.remove('selection');
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [disabled]);

  // Если редактор заблокирован — убираем selection всегда
  useEffect(() => {
    if (disabled && wrapperRef.current) {
      wrapperRef.current.classList.remove('selection');
    }
  }, [disabled]);

  return (
    <div
      ref={wrapperRef}
      className="rsw-editor prose prose-lg relative"
      onMouseUp={checkSelection}
      onKeyUp={checkSelection}
      onBlur={() => !disabled && wrapperRef.current.classList.remove('selection')}
      tabIndex={0}
    >
      <ReactSimpleWYSIWYG
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        // Сам редактор не поддерживает prop disabled, поэтому используем readOnly для contenteditable
        readOnly={disabled}
      />
      {disabled && (
        <div
          className="absolute inset-0 bg-base-200 bg-opacity-40 cursor-not-allowed flex items-center justify-center z-10 rounded-lg"
          style={{
            pointerEvents: 'all',
            minHeight: '96px'
          }}
        >
          <span className="text-base-content/60">
            {placeholder || "Редактирование недоступно"}
          </span>
        </div>
      )}
    </div>
  );
}