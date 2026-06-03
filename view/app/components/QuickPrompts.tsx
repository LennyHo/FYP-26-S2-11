"use client";
import { useState } from 'react';
import styles from './ChatbotSidebar.module.css';

interface Props {
  prompts: string[];
  onPromptClick: (prompt: string) => void;
  isLoading: boolean;
  hasTypedInput: boolean;
  hideQuickPrompts: boolean;
}

export default function QuickPrompts({ prompts, onPromptClick, isLoading, hasTypedInput, hideQuickPrompts }: Props) {
  const [expanded, setExpanded] = useState(false);
  const hidden = hasTypedInput || hideQuickPrompts;

  return (
    <div className={`${styles.quickPromptsWrapper} ${hidden ? styles.quickPromptsHidden : ''}`}>
      <button
        type="button"
        className={`${styles.quickPromptsLabel} ${expanded ? styles.quickPromptsLabelOpen : ''}`}
        onClick={() => setExpanded(v => !v)}
        disabled={hidden}
        aria-expanded={expanded ? "true" : "false"}
      >
        Try asking
        <svg
          className={styles.quickPromptsChevron}
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {expanded && (
        <div className={styles.quickPromptsRow} aria-label="Suggested prompts">
          {prompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              className={styles.quickPromptBtn}
              onClick={() => { onPromptClick(prompt); setExpanded(false); }}
              disabled={isLoading || hidden}
            >
              <span className={styles.quickPromptText}>{prompt}</span>
              <svg
                className={styles.quickPromptArrow}
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
