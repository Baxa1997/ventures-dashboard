import { CKEditor } from '@ckeditor/ckeditor5-react';
import {
   Autoformat,
   Bold,
   ClassicEditor,
   Essentials,
   Italic,
   Link,
   List,
   Paragraph,
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
}

/* CKEditor 5 with what a task's note needs: bold, italic, underline, links
   and lists, in the interface language. Loaded on demand (RichTextEditor):
   it is heavy. Used under CKEditor's GPL licence key. */
const Editor = ({ value, label, onChange }: EditorProps) => {
   const { i18n } = useTranslation();
   const language = (i18n.resolvedLanguage ?? 'ru') as 'ru' | 'uz' | 'en';

   return (
      <CKEditor
         config={{
            licenseKey: 'GPL',
            language: { ui: language, content: language },
            translations: [ru, uz],
            plugins: [
               Essentials,
               Paragraph,
               Bold,
               Italic,
               Underline,
               Link,
               List,
               Autoformat,
            ],
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
