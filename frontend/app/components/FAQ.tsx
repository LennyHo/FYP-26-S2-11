"use client";

import React, { useState } from 'react';
import styles from './FAQ.module.css';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

const faqItems: FAQItem[] = [
  {
    id: '1',
    question: 'What are the main ingredients in your bubble tea?',
    answer: 'Our bubble tea is crafted with high-quality tea leaves, fresh milk, and natural flavoring. We use premium brown sugar and our signature tapioca pearls for the perfect texture.',
  },
  {
    id: '2',
    question: 'Do you offer sugar-free or low-sugar options?',
    answer: 'Yes! We offer customizable sweetness levels for all our drinks. You can choose from 0%, 25%, 50%, 75%, or 100% sugar levels to suit your preference.',
  },
  {
    id: '3',
    question: 'Are there any allergens I should be aware of?',
    answer: 'Our drinks may contain milk, soy, and nuts. Please let us know if you have any allergies, and we\'ll help you find the perfect drink option.',
  },
  {
    id: '4',
    question: 'How are your drinks prepared?',
    answer: 'Each drink is freshly made to order. We brew our tea fresh, add your selected toppings, and shake or blend depending on your choice.',
  },
  {
    id: '5',
    question: 'What payment methods do you accept?',
    answer: 'We accept all major credit and debit cards, digital wallets, and cash payments at our physical store locations.',
  },
  {
    id: '6',
    question: 'How can I track my order?',
    answer: 'Once you place an order through our website or app, you\'ll receive real-time updates about your order status and estimated delivery time.',
  },
];

export default function FAQ() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <section className={styles.faqSection}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>Frequently Asked Questions</h2>
        </div>

        <div className={styles.faqList}>
          {faqItems.map(item => (
            <div
              key={item.id}
              className={`${styles.faqItem} ${expandedId === item.id ? styles.expanded : ''}`}
            >
              <button
                className={styles.questionButton}
                onClick={() => toggleExpand(item.id)}
                aria-expanded={expandedId === item.id}
              >
                <span className={styles.questionText}>{item.question}</span>
                <span className={styles.toggleIcon}>
                  {expandedId === item.id ? '−' : '+'}
                </span>
              </button>
              {expandedId === item.id && (
                <div className={styles.answerContent}>
                  <p className={styles.answerText}>{item.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
