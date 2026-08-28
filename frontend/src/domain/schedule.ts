export function weeklySlots(first: Date, count: number, until?: Date | null) {
  const slots: Date[] = []
  const current = new Date(first.getTime())

  while (slots.length < count) {
    if (until && current.getTime() >= until.getTime()) {
      break
    }
    slots.push(new Date(current.getTime()))
    current.setDate(current.getDate() + 7)
  }

  return slots
}
