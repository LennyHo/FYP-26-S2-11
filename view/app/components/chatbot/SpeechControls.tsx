"use client";
import React from 'react';
import styles from './ChatbotSidebar.module.css';

interface Props {
  isListening: boolean;
  isLoading: boolean;
  onMicClick: () => void;
  onSpeakClick: () => void;
  isSpeakMode?: boolean;
}

export default function SpeechControls({ isListening, isLoading, onMicClick, onSpeakClick, isSpeakMode }: Props) {
  return (
    <div className={styles.chatActionRow} aria-hidden="true">
      <button
        type="button"
        className={`${styles.micBtn} ${isListening ? styles.listening : ''}`}
        onClick={onMicClick}
        disabled={isLoading}
        title={isListening ? 'Listening... Click to stop' : 'Click to start voice input'}
        aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
          <path d="M17 11a5 5 0 0 1-10 0" />
          <path d="M12 16v4" />
        </svg>
      </button>

      <button
        type="button"
        className={`${styles.speakBtn} ${(isSpeakMode || isListening) ? styles.speakBtnListening : ''}`}
        onClick={onSpeakClick}
        disabled={isLoading}
        title={(isSpeakMode || isListening) ? 'Stop' : 'Speak to Avy'}
        aria-label={(isSpeakMode || isListening) ? 'Stop' : 'Speak to Avy'}
      >
        <span className={styles.speakWave} aria-hidden="true">
          <span className={styles.speakWaveBar}></span>
          <span className={styles.speakWaveBar}></span>
          <span className={styles.speakWaveBar}></span>
          <span className={styles.speakWaveBar}></span>
          <span className={styles.speakWaveBar}></span>
        </span>
        <span className={styles.speakBtnText}>{(isSpeakMode || isListening) ? 'Stop' : 'Speak'}</span>
      </button>
    </div>
  );
}
