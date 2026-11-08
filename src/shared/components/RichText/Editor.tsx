import { CKEditor } from '@ckeditor/ckeditor5-react';
import {
   AutoImage,
   Autoformat,
   AutoLink,
   BlockQuote,
   Bold,
   ClassicEditor,
   type Editor as CoreEditor,
   type EditorConfig,
   Essentials,
   FileRepository,
   Heading,
   HorizontalLine,
   Image,
   ImageCaption,
   ImageInsert,
   ImageTextAlternative,
   ImageToolbar,
   Italic,
   Link,
   List,
   MediaEmbed,
   Paragraph,
   PasteFromOffice,
   Table,
   TableToolbar,
   Underline,
} from 'ckeditor5';
import 'ckeditor5/ckeditor5.css';
import ru from 'ckeditor5/translations/ru.js';
import uz from 'ckeditor5/translations/uz.js';
import { useTranslation } from 'react-i18next';

export interface EditorProps {
   value: string; // HTML
   label: string; // for screen readers
   onChange: (html: string) => void;
   /* An article of the website: headings, quotes, pictures, video, tables
      and a line, the pictures stored by `onUpload` (their address). */
   article?: { onUpload: (file: File) => Promise<string> };
}

const NOTE: EditorConfig = {
   plugins: [Essentials, Paragraph, Bold, Italic, Underline, Link, List, Autoformat],
   toolbar: [
      'bold',
      'italic',
      'underline',
      '|',
      'bulletedList',
      'numberedList',
      '|',
      'link',
      '|',
      'undo',
      'redo',
   ],
};

const ARTICLE: EditorConfig = {
   plugins: [
      Essentials,
      Paragraph,
      Heading,
      Bold,
      Italic,
      Underline,
      Link,
      AutoLink,
      List,
      BlockQuote,
      Autoformat,
      Image,
      ImageCaption,
      ImageTextAlternative,
      ImageToolbar,
      ImageInsert,
      AutoImage,
      MediaEmbed,
      Table,
      TableToolbar,
      HorizontalLine,
      PasteFromOffice,
   ],
   toolbar: {
      items: [
         'heading',
         '|',
         'bold',
         'italic',
         'underline',
         'link',
         '|',
         'bulletedList',
         'numberedList',
         'blockQuote',
         '|',
         'insertImage',
         'mediaEmbed',
         'insertTable',
         'horizontalLine',
         '|',
         'undo',
         'redo',
      ],
      shouldNotGroupWhenFull: false,
   },
   // the site's article: a paragraph, and headings under the title (h1)
   heading: {
      options: [
         { model: 'paragraph', title: 'Paragraph', class: 'ck-heading_paragraph' },
         { model: 'heading2', view: 'h2', title: 'Heading 2', class: 'ck-heading_heading2' },
         { model: 'heading3', view: 'h3', title: 'Heading 3', class: 'ck-heading_heading3' },
      ],
   },
   image: { toolbar: ['toggleImageCaption', 'imageTextAlternative'] },
   table: { contentToolbar: ['tableColumn', 'tableRow', 'mergeTableCells'] },
   // the video's player in the HTML itself, so the site shows it as is
   mediaEmbed: { previewsInData: true },
};

/* A picture put into the article is stored at once; the text keeps its
   address. CKEditor builds every plugin with `new`, so this one is a plain
   function, as its docs write a custom upload adapter (an arrow would throw). */
const uploadPlugin = (onUpload: (file: File) => Promise<string>) =>
   function UploadAdapter(editor: CoreEditor) {
      editor.plugins.get(FileRepository).createUploadAdapter = (loader) => ({
         upload: async () => {
            const file = await loader.file;
            if (!file) throw new Error('no file');
            return { default: await onUpload(file) };
         },
         abort: () => undefined,
      });
   };

/* CKEditor 5 in the interface language: for a task's note bold, italic,
   underline, links and lists; for an article of the website more (ARTICLE).
   Loaded on demand (RichTextEditor): it is heavy. Used under CKEditor's GPL
   licence key. */
const Editor = ({ value, label, onChange, article }: EditorProps) => {
   const { i18n } = useTranslation();
   const language = (i18n.resolvedLanguage ?? 'ru') as 'ru' | 'uz' | 'en';

   return (
      <CKEditor
         config={{
            ...(article ? ARTICLE : NOTE),
            licenseKey: 'GPL',
            language: { ui: language, content: language },
            translations: [ru, uz],
            extraPlugins: article ? [uploadPlugin(article.onUpload)] : [],
            link: {
               defaultProtocol: 'https://',
               addTargetToExternalLinks: true,
            },
            label,
         }}
         data={value}
         editor={ClassicEditor}
         onChange={(_, editor) => onChange(editor.getData())}
      />
   );
};

export default Editor;
