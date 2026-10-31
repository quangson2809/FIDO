import React from 'react';

// Build React nodes from a strict allowlist: never inject raw merchant HTML.
// Scripts, styles, event handlers, embedded content and inline CSS are discarded.
const BLOCKED = new Set([
  'script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'button',
  'video', 'audio', 'svg', 'math', 'template', 'noscript', 'base', 'meta', 'link',
]);
const ALLOWED = new Set([
  'div', 'section', 'p', 'h2', 'h3', 'h4', 'h5', 'ul', 'ol', 'li',
  'strong', 'b', 'em', 'i', 'small', 'blockquote', 'figure', 'figcaption',
  'span', 'br', 'hr', 'a',
]);
const HTML = /<\/?[a-z][\s/>]/i;
const safeUrl = (raw: string | null): string | null => {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (/^https:\/\//i.test(trimmed) || /^\/(?!\/)/.test(trimmed)) return trimmed;
  return null;
};
const displayClass = (element: Element, tag: string): string => {
  const classes = element.classList;
  if (classes.contains('features') || classes.contains('icons')
    || classes.contains('icons-end')) return 'grid gap-5 md:grid-cols-3';
  if (classes.contains('feature') || classes.contains('icon-bottom')) return 'space-y-2';
  if (classes.contains('boxy-container') || classes.contains('top-section'))
    return 'grid items-center gap-6 md:grid-cols-2';
  if (classes.contains('material') || classes.contains('product-info-new'))
    return 'space-y-5';
  if (tag === 'p') return 'text-sm leading-8 text-[#4E5950]';
  if (tag === 'h2' || tag === 'h3') return 'font-serif text-2xl font-semibold leading-tight';
  if (tag === 'h4' || tag === 'h5') return 'text-base font-bold';
  if (tag === 'ul') return 'list-disc space-y-2 pl-6 text-sm leading-7';
  if (tag === 'ol') return 'list-decimal space-y-2 pl-6 text-sm leading-7';
  if (tag === 'blockquote') return 'border-l-2 border-[#0B2419] pl-4';
  if (tag === 'figure') return 'space-y-2';
  return '';
};

const buildNode = (node: ChildNode, key: string): React.ReactNode => {
  if (node.nodeType === 3) return node.textContent;
  if (node.nodeType !== 1) return null;
  const element = node as Element;
  const tag = element.tagName.toLowerCase();
  if (BLOCKED.has(tag)) return null;
  const children = Array.from(element.childNodes).map(
    (child, index) => buildNode(child, key + '-' + index),
  );
  if (tag === 'img') {
    const src = safeUrl(element.getAttribute('src'));
    if (!src) return null;
    return React.createElement('img', {
      key, src, alt: element.getAttribute('alt') ?? 'Ảnh mô tả sản phẩm',
      loading: 'lazy', className: 'mx-auto h-auto max-w-full rounded-sm object-contain',
    });
  }
  if (tag === 'a') {
    const href = safeUrl(element.getAttribute('href'));
    return href
      ? React.createElement('a', {
        key, href, rel: 'noopener noreferrer',
        className: 'underline underline-offset-4',
      }, ...children)
      : React.createElement(React.Fragment, { key }, ...children);
  }
  if (!ALLOWED.has(tag)) return React.createElement(React.Fragment, { key }, ...children);
  return React.createElement(tag, {
    key, className: displayClass(element, tag),
  }, ...children);
};

export const ProductLongDescription: React.FC<{ description: string | null }> = ({
  description,
}) => {
  if (!description?.trim()) return null;
  let content: React.ReactNode = description;
  if (HTML.test(description)) {
    if (typeof DOMParser !== 'undefined') {
      const document = new DOMParser().parseFromString(description, 'text/html');
      content = Array.from(document.body.childNodes).map(
        (child, index) => buildNode(child, 'description-' + index),
      );
    } else {
      // Safe static-render fallback; browsers use the allowlisted React structure.
      content = description
        .replace(/<(script|style|iframe|svg|object|template)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '')
        .replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    }
  }
  return (
    <section aria-label="Mô tả chi tiết sản phẩm"
      className="border-t border-[#E8E9E3] bg-[#FFFDF5]">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-8 lg:px-14">
        <h2 className="mb-8 font-serif text-3xl">Mô tả sản phẩm</h2>
        <div className="space-y-6 break-words whitespace-pre-line text-sm leading-8 text-[#4E5950]">
          {content}
        </div>
      </div>
    </section>
  );
};
