'use client';
import { t } from '@/lib/i18n';
import { memo } from 'react';
import { useLocale } from './language-picker';
import Markdown, { defaultUrlTransform } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { normalizeMath } from '../lib/math';
function RichTextContent({
  text,
  className = '',
}: {
  text: string;
  className?: string;
}) {
  useLocale();
  return (
    <div className={`rich-text ${className}`}>
      <Markdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[
          [rehypeKatex, { strict: false, throwOnError: false, trust: false }],
        ]}
        urlTransform={(url) =>
          /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=\r\n]+$/.test(
            url,
          )
            ? url
            : defaultUrlTransform(url)
        }
        components={{
          a: ({ children, href, title }) => (
            <a
              href={href}
              title={title}
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
          img: ({ src, alt }) => (
            <img src={src} alt={alt || t('题目配图')} loading="eager" />
          ),
        }}
      >
        {normalizeMath(text)}
      </Markdown>
    </div>
  );
}

export const RichText = memo(RichTextContent);
