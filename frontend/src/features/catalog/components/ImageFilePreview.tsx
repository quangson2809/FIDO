import { useEffect, useState } from 'react';
function FilePreview({ file }: { file: File }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    Promise.resolve().then(() => setUrl(objectUrl));
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);
  return (
    <figure className="min-w-0">
      <img
        src={url || undefined}
        alt={file.name}
        className="aspect-square w-20 rounded-lg object-cover"
      />
      <figcaption className="max-w-24 truncate text-xs">{file.name}</figcaption>
    </figure>
  );
}
export function ImageFilePreview({
  files,
  onChange,
  disabled = false,
  primaryFirst = false,
}: {
  files: readonly File[];
  onChange?: (files: File[]) => void;
  disabled?: boolean;
  primaryFirst?: boolean;
}) {
  const move = (from: number, to: number) => {
    const reordered = [...files];
    const [file] = reordered.splice(from, 1);
    reordered.splice(to, 0, file);
    onChange?.(reordered);
  };
  return (
    <div className="flex flex-wrap gap-3">
      {files.map((file, index) => (
        <div key={`${file.name}-${file.lastModified}-${index}`} className="space-y-1">
          <FilePreview file={file} />
          {primaryFirst && index === 0 && <p className="text-xs font-semibold">Ảnh chính</p>}
          {onChange && (
            <div className="flex flex-wrap gap-2 text-xs">
              <button
                type="button"
                aria-label={'Đưa ảnh ' + (index + 1) + ' lên trước'}
                disabled={disabled || index === 0}
                onClick={() => move(index, index - 1)}
              >
                ←
              </button>
              <button
                type="button"
                aria-label={'Đưa ảnh ' + (index + 1) + ' ra sau'}
                disabled={disabled || index === files.length - 1}
                onClick={() => move(index, index + 1)}
              >
                →
              </button>
              <button
                type="button"
                aria-label={'Bỏ ảnh ' + file.name}
                disabled={disabled}
                onClick={() => onChange(files.filter((_, i) => i !== index))}
              >
                Bỏ ảnh
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
