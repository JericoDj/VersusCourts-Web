/**
 * Web counterpart of VersusCourts-Player's SocketService (socket_service.dart).
 *
 * Connects to the same NestJS QueuesGateway as the mobile app, joins rooms
 * for live queue updates, and emits DOM CustomEvents so React components
 * can subscribe via addEventListener / useEffect.
 *
 * Usage:
 *   import socketService from '../data/socketService'
 *   socketService.connect()                // call once after login
 *   socketService.joinQueueRoom(queueId)
 *   socketService.addEventListener('queue:update', handler)
 */
import { io } from 'socket.io-client'
import { authToken, API_BASE } from './apiClient'

const SERVER_URL = API_BASE.replace(/\/api\/?$/, '')

class SocketService extends EventTarget {
  constructor() {
    super()
    this._socket = null
    this._joinedQueueId = null
    this._connected = false
  }

  get isConnected() {
    return this._connected
  }

  connect() {
    const token = authToken()
    if (!token) {
      this.disconnect()
      return
    }

    // Already connected
    if (this._socket?.connected) return

    this._socket = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      auth: { token },
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: Infinity,
    })

    this._socket.on('connect', () => {
      this._connected = true
      console.log('⚡ WebSocket Connected:', this._socket.id)
      // Rejoin room if we were in one
      if (this._joinedQueueId) {
        this.joinQueueRoom(this._joinedQueueId)
      }
    })

    this._socket.on('disconnect', () => {
      this._connected = false
      console.log('⚡ WebSocket Disconnected')
    })

    this._socket.on('connect_error', (err) => {
      this._connected = false
      console.warn('⚡ WebSocket Connect Error:', err.message)
    })

    // Queue events — forward as DOM CustomEvents
    this._socket.on('queue:update', (data) => {
      this.dispatchEvent(new CustomEvent('queue:update', { detail: data }))
    })

    this._socket.on('queue:message', (data) => {
      this.dispatchEvent(new CustomEvent('queue:message', { detail: data }))
    })

    this._socket.on('queue:match_update', (data) => {
      this.dispatchEvent(new CustomEvent('queue:match_update', { detail: data }))
    })

    this._socket.on('notification:new', (data) => {
      this.dispatchEvent(new CustomEvent('notification:new', { detail: data }))
    })
  }

  joinQueueRoom(queueId) {
    this._joinedQueueId = queueId
    if (this._socket?.connected) {
      this._socket.emit('queue:join-room', { queueId })
      console.log('⚡ Joined Socket Room: queue:' + queueId)
    }
  }

  leaveQueueRoom(queueId) {
    if (this._joinedQueueId === queueId) {
      this._joinedQueueId = null
    }
    if (this._socket?.connected) {
      this._socket.emit('queue:leave-room', { queueId })
      console.log('⚡ Left Socket Room: queue:' + queueId)
    }
  }

  disconnect() {
    this._connected = false
    this._joinedQueueId = null
    if (this._socket) {
      this._socket.disconnect()
      this._socket = null
    }
  }
}

// Singleton — mirrors the Dart `SocketService.instance` pattern.
const socketService = new SocketService()
export default socketService
