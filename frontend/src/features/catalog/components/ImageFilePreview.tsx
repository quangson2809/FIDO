import { useEffect, useState } from 'react';
function FilePreview({ file }: { file: File }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    Promise.resolve().then(() => setUrl(objectUrl));
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);
  return <figure className="min-w-0"><img src={url || undefined} alt={file.name} className="aspect-square w-20 rounded-lg object-cover" /><figcaption className="max-w-24 truncate text-xs">{file.name}</figcaption></figure>;
}
export function ImageFilePreview({ files }: { files: readonly File[] }) {
  return <div className="flex flex-wrap gap-3">{files.map((file, index) => <FilePreview key={`${file.name}-${file.lastModified}-${index}`} file={file} />)}</div>;
}
