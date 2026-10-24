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
