"use client";
import React from 'react';
import styles from './ChatbotSidebar.module.css';

interface Props {
  prompts: string[];
  onPromptClick: (prompt: string) => void;
  isLoading: boolean;
  hasTypedInput: boolean;
  hideQuickPrompts: boolean;
}

export default function QuickPrompts({ prompts, onPromptClick, isLoading, hasTypedInput, hideQuickPrompts }: Props) {
  return (
    <div
      className={`${styles.quickPromptsRow} ${hasTypedInput || hideQuickPrompts ? styles.quickPromptsHidden : ''}`}
      aria-label="Suggested prompts"
    >
      {prompts.map(prompt => (
        <button
          key={prompt}
          type="button"
          className={styles.quickPromptBtn}
          onClick={() => onPromptClick(prompt)}
          disabled={isLoading || hasTypedInput || hideQuickPrompts}
        >
          {prompt}
        </button>
      ))}
    </div>
  );
}
