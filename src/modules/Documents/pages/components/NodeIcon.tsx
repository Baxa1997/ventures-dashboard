import { fileLook, type FileNode } from '@modules/Documents/helpers';
import clsx from 'clsx';
import { Folder } from 'lucide-react';

interface NodeIconProps {
   node: FileNode;
   large?: boolean; // a tile's
}

// A folder in the folders' gold (a module with its own sign), a file in the
// colour of its kind: a table green, a PDF red, a text blue, slides orange.
const NodeIcon = ({ node, large = false }: NodeIconProps) => {
   const { icon: Icon, tone } = node.folder
      ? { icon: node.folder.icon ?? Folder, tone: 'text-warning' }
      : fileLook(node.name);
   return (
      <Icon
         aria-hidden
         className={clsx('shrink-0', large ? 'size-8.5' : 'size-5', tone)}
      />
   );
};

export default NodeIcon;
