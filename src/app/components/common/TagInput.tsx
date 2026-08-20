import React, { useState, KeyboardEvent } from 'react';
import { X } from 'lucide-react';
import { P } from '../../utils/palette';

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  variant?: 'default' | 'allergy';
}

export function TagInput({ value, onChange, placeholder = 'Type and press Enter...', variant = 'default' }: TagInputProps) {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = inputValue.trim();
      if (val && !value.includes(val)) {
        onChange([...value, val]);
      }
      setInputValue('');
    } else if (e.key === 'Backspace' && inputValue === '' && value.length > 0) {
      e.preventDefault();
      onChange(value.slice(0, -1));
    }
  };

  const removeTag = (indexToRemove: number) => {
    onChange(value.filter((_, idx) => idx !== indexToRemove));
  };

  const isAllergy = variant === 'allergy';
  const tagBg = isAllergy ? P.siennaLight : P.slateLight;
  const tagColor = isAllergy ? P.sienna : P.slate;
  const tagBorder = isAllergy ? P.sienna : P.slate;

  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 6,
      minHeight: 36,
      padding: '4px 8px',
      background: P.bgSunken,
      border: `1.5px solid ${P.border}`,
      borderRadius: 8,
      fontFamily: 'inherit',
    }}>
      {value.map((tag, idx) => (
        <div key={idx} style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          background: tagBg,
          color: tagColor,
          padding: '2px 8px',
          borderRadius: 999,
          fontSize: 11,
          fontWeight: 500,
        }}>
          {tag}
          <button
            type="button"
            onClick={() => removeTag(idx)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: tagColor,
              display: 'flex',
              padding: 0,
            }}
          >
            <X size={10} />
          </button>
        </div>
      ))}
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={value.length === 0 ? placeholder : ''}
        style={{
          flex: 1,
          minWidth: 120,
          background: 'transparent',
          border: 'none',
          outline: 'none',
          fontSize: 13,
          color: P.textPrimary,
          fontFamily: 'inherit',
          height: 24,
        }}
      />
    </div>
  );
}
