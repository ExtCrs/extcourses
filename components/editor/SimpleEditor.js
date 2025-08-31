'use client';

import React, { useRef, useEffect } from 'react';
import ReactSimpleWYSIWYG from 'react-simple-wysiwyg';

export default function SimpleEditor({ value, onChange, placeholder = '', disabled = false }) {
  const wrapperRef = useRef();
  const editorRef = useRef();

  // Функция для очистки HTML от всех тегов и стилей - оставляем только чистый текст
  const cleanHtml = (html) => {
    if (!html) return '';
    
    // Создаем временный элемент для парсинга HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    // Получаем только текстовое содержимое, все теги будут удалены
    const textContent = tempDiv.textContent || tempDiv.innerText || '';
    
    // Убираем лишние пробелы и переносы строк
    return textContent.trim().replace(/\s+/g, ' ');
  };

  // Обработчик события вставки
  const handlePaste = (e) => {
    if (disabled) return;
    
    e.preventDefault();
    
    // Получаем данные из буфера обмена
    const clipboardData = e.clipboardData || window.clipboardData;
    const pastedData = clipboardData.getData('text/html') || clipboardData.getData('text/plain');
    
    if (pastedData) {
      // Очищаем вставленный контент от всех тегов
      const cleanedText = cleanHtml(pastedData);
      
      if (cleanedText) {
        // Вставляем чистый текст в текущую позицию курсора
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          range.deleteContents();
          
          // Вставляем только текст, без HTML
          const textNode = document.createTextNode(cleanedText);
          range.insertNode(textNode);
          
          // Устанавливаем курсор после вставленного текста
          range.setStartAfter(textNode);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
          
          // Триггерим событие input для обновления состояния react-simple-wysiwyg
          const editorElement = getEditorElement();
          if (editorElement) {
            const inputEvent = new Event('input', { bubbles: true });
            editorElement.dispatchEvent(inputEvent);
          }
        }
      }
    }
  };

  // Функция для получения ссылки на редактор
  const getEditorElement = () => {
    if (!wrapperRef.current) return null;
    return wrapperRef.current.querySelector('.rsw-ce');
  };

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

  // Добавляем обработчик события paste на элемент редактора
  useEffect(() => {
    const editorElement = getEditorElement();
    if (!editorElement || disabled) return;
    
    editorElement.addEventListener('paste', handlePaste);
    return () => {
      editorElement.removeEventListener('paste', handlePaste);
    };
  }, [disabled, value]); // Переподключаем при смене value

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