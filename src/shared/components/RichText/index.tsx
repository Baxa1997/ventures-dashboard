import DOMPurify from 'dompurify';
import { lazy, Suspense } from 'react';
import type { EditorProps } from './Editor';

const Editor = lazy(() => import('./Editor'));

// The rich editor, loaded when a form first shows it.
export const RichTextEditor = (props: EditorProps) => (
   <Suspense
      fallback={<div className='field-input bg-ground h-32 animate-pulse' />}
   >
      <Editor {...props} />
   </Suspense>
);

// Links written in the editor open in a new tab, without the page's access.
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
   if (node.tagName === 'A') {
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener noreferrer');
   }
});

interface RichTextProps {
   html: string;
   className?: string;
}

// Text written in the rich editor, cleaned of anything that could run.
export const RichText = ({ html, className }: RichTextProps) => (
   <div
      className={['rich-text', className].filter(Boolean).join(' ')}
      // DOMPurify keeps the formatting and drops scripts, handlers and frames
      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }}
   />
);

// The video players an article may hold (the editor's «Вставить видео»).
const PLAYERS =
   /^https:\/\/(www\.youtube\.com|www\.youtube-nocookie\.com|player\.vimeo\.com)\//;

// Frames are dropped unless they are one of those players (ArticleText only
// lets frames through at all).
DOMPurify.addHook('uponSanitizeElement', (node, data) => {
   if (
      data.tagName === 'iframe' &&
      !PLAYERS.test((node as Element).getAttribute('src') ?? '')
   )
      node.parentNode?.removeChild(node);
});

/* An article of the website as the site shows it (Сайт → Новости, the
   preview): headings, quotes, pictures, tables and the video players. */
export const ArticleText = ({ html, className }: RichTextProps) => (
   <div
      className={['article-text', className].filter(Boolean).join(' ')}
      dangerouslySetInnerHTML={{
         __html: DOMPurify.sanitize(html, {
            ADD_TAGS: ['iframe'],
            ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'data-oembed-url'],
         }),
      }}
   />
);
