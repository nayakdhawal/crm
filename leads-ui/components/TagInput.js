'use client';

import { useState } from 'react';

// A list of words or addresses shown as removable chips. Enter, comma or blur adds an entry.
export default function TagInput({ id, value, onChange, placeholder }) {
  const [text, setText] = useState('');

  function add(raw) {
    const parts = raw.split(',').map((p) => p.trim()).filter(Boolean);
    if (parts.length === 0) return;
    onChange([...new Set([...value, ...parts.map((p) => p.toLowerCase())])]);
    setText('');
  }

  function handleKey(e) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      add(text);
    } else if (e.key === 'Backspace' && !text && value.length) {
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div className="recipient-box">
      {value.map((item) => (
        <span key={item} className="recipient-chip">
          {item}
          <button
            type="button"
            className="recipient-remove"
            aria-label={`Remove ${item}`}
            onClick={() => onChange(value.filter((v) => v !== item))}
          >
            ✕
          </button>
        </span>
      ))}
      <input
        id={id}
        className="recipient-input"
        type="text"
        placeholder={value.length ? '' : placeholder}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKey}
        onBlur={() => add(text)}
      />
    </div>
  );
}
