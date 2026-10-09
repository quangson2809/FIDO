export function AccessChangePreview({ before, after, items, label }: { before: readonly number[]; after: readonly number[]; items: readonly { id: number; name: string }[]; label: string }) {
  const added = items.filter((item) => after.includes(item.id) && !before.includes(item.id));
  const removed = items.filter((item) => before.includes(item.id) && !after.includes(item.id));
  return <section aria-label={`Thay đổi ${label}`} className="mt-4 rounded-lg border border-[#E2E5DE] bg-[#FFFDF5] p-3 text-sm"><h3 className="font-semibold">Thay đổi {label} khi lưu</h3>{!added.length && !removed.length ? <p>Không thay đổi.</p> : <><p>Thêm: {added.map((item) => item.name).join(', ') || 'Không có'}</p><p>Gỡ: {removed.map((item) => item.name).join(', ') || 'Không có'}</p></>}</section>;
}
