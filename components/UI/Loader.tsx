export function Loader({ text = 'กำลังโหลดข้อมูล...' }: { text?: string }) {
  return (
    <div className="fixed inset-0 bg-white/80 z-[9999] flex flex-col justify-center items-center">
      <div className="w-10 h-10 border-4 border-black/10 border-l-black rounded-full animate-spin mb-4"></div>
      <p className="font-body-md text-on-surface-variant">{text}</p>
    </div>
  )
}
