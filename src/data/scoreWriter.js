// Serialize writes and coalesce rapid edits to the same set. Keep failed edits
// queued so a retry cannot lose a later tap or overwrite it with an older score.
export function createScoreWriter(write, listeners = {}) {
  const pending = new Map()
  let running = false
  return {
    setCallbacks(next) { listeners = next },
    enqueue(score) {
      if (score.rewind) for (const key of pending.keys()) if (key > score.setNumber) pending.delete(key)
      const rewind = score.rewind || pending.get(score.setNumber)?.rewind
      pending.set(score.setNumber, { ...score, ...(rewind ? { rewind: true } : {}) })
    },
    async flush() {
      if (running) return
      running = true
      try {
        while (pending.size) {
          const [key, score] = pending.entries().next().value
          await write(score)
          if (pending.get(key) === score) pending.delete(key)
        }
        listeners.onIdle?.()
      } catch (error) { listeners.onError?.(error) }
      finally { running = false }
    },
  }
}
