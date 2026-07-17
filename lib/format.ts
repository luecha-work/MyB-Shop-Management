// ==========================================
// Shared formatters (logic เดิมจาก script.html)
// ==========================================

const _thbFormatter = new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' })

/** ฟอร์แมตเงินบาท เช่น ฿1,234.00 (คืน "-" เมื่อไม่ใช่ตัวเลข) */
export const thbFormat = (val: number | string) =>
  isNaN(Number(val)) ? '-' : _thbFormatter.format(Number(val))

/** ฟอร์แมตตัวเลขมี comma เช่น 1,234 (คืน "-" เมื่อไม่ใช่ตัวเลข) */
export const formatNum = (val: number | string) =>
  isNaN(Number(val)) ? '-' : Number(val).toLocaleString('th-TH')

/** แปลง Date เป็น YYYY-MM-DD ตามเวลาท้องถิ่น */
export const toLocalISODate = (d: Date) => {
  const z = (n: number) => ('0' + n).slice(-2)
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`
}

/** ช่วงวันที่ต้นเดือน–สิ้นเดือนปัจจุบัน (ค่าเริ่มต้นของทุกหน้า ตาม resetViewState เดิม) */
export const currentMonthRange = () => {
  const now = new Date()
  return {
    start: toLocalISODate(new Date(now.getFullYear(), now.getMonth(), 1)),
    end: toLocalISODate(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
  }
}
