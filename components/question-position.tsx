'use client';
import { memo } from 'react';
import { Grid2X2 } from 'lucide-react';
import { t } from '@/lib/i18n';
import { useLocale } from './language-picker';
export const QuestionPosition = memo(function QuestionPosition({
  current,
  total,
  answered,
  onOpen,
}: {
  current: number;
  total: number;
  answered: number;
  onOpen: () => void;
}) {
  useLocale();
  return (
    <button className="question-map-trigger" onClick={onOpen}>
      <Grid2X2 size={17} />
      <span className="position-label">
        {t('第 {0} / {1} 题', current, total)}
      </span>
      <span className="answered-label">{t('{0} 已答', answered)}</span>
    </button>
  );
});
