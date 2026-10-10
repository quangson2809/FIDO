import { useState } from 'react';
interface Props { src?: string | null; alt: string; className?: string; loading?: 'lazy' | 'eager'; }
function ImageContent({ src, alt, className = '', loading = 'lazy' }: Props) {
  const [failed, setFailed] = useState(false);
  return src && !failed ? <img src={src} alt={alt} loading={loading} decoding="async" className={className} onError={() => setFailed(true)} />
    : <span role="img" aria-label={`${alt}: ảnh chưa khả dụng`} className={`flex items-center justify-center bg-surface-container-low p-3 text-center text-sm text-muted-grey ${className}`}>Ảnh chưa khả dụng</span>;
}
export function StorefrontImage(props: Props) { return <ImageContent key={props.src ?? ''} {...props} />; }
