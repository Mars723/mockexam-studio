'use client';
import Markdown, { defaultUrlTransform } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { normalizeMath } from '../lib/math';
export function RichText({
  text,
  className = '',
}: {
  text: string;
  className?: string;
}) {
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
            <img src={src} alt={alt || '题目配图'} loading="eager" />
          ),
        }}
      >
        {normalizeMath(text)}
      </Markdown>
    </div>
  );
}
