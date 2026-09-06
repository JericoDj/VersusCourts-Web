export function queuePlayerCount(queue) {
  const hostId = queue.hostId || queue.host?.id
  const joined = Array.isArray(queue.participants)
    ? queue.participants.filter((player) => {
      if (player.status && player.status !== 'JOINED') return false
      const isHost = player.isHost || (hostId && (player.userId === hostId || player.user?.id === hostId))
      return queue.hostIsPlaying !== false || !isHost
    }).length
    // List responses include the host's JOINED row in the aggregate count.
    : Math.max(0, Number(queue._count?.participants || 0) - (queue.hostIsPlaying === false ? 1 : 0))
  return joined + (Array.isArray(queue.localPlayers) ? queue.localPlayers.length : 0)
}
