import { Server as HttpServer } from 'http'
import { Server as SocketIOServer, Socket } from 'socket.io'

interface AuctionSocketData {
  customer_id?: string
  auction_id?: string
  party_id?: string
}

interface ServerToClientEvents {
  'bid-update': (data: any) => void
  'timer-update': (data: any) => void
  'party-change': (data: any) => void
  'party-started': (data: any) => void
  'party-ended': (data: any) => void
  'error': (data: any) => void
}

interface ClientToServerEvents {
  'join-auction': (data: { auction_id: string; party_id?: string }) => void
  'leave-auction': (data: { auction_id: string }) => void
  'ping': () => void
}

export class AuctionWebSocketServer {
  private io: SocketIOServer<ClientToServerEvents, ServerToClientEvents, {}, AuctionSocketData>
  private connectedClients: Map<string, Set<string>> = new Map()

  constructor(httpServer: HttpServer) {
    this.io = new SocketIOServer(httpServer, {
      path: process.env.WEBSOCKET_PATH || '/socket.io',
      cors: {
        origin: (process.env.WEBSOCKET_CORS_ORIGIN || 'http://localhost:3000').split(','),
        credentials: true,
      },
      transports: ['websocket', 'polling'],
      pingInterval: 25000,
      pingTimeout: 60000,
    })

    this.setupEventHandlers()
    console.log('🔌 WebSocket Server initialized')
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents, {}, AuctionSocketData>) => {
      console.log(`✅ Client connected: ${socket.id}`)

      socket.on('join-auction', (data) => {
        this.handleJoinAuction(socket, data)
      })

      socket.on('leave-auction', (data) => {
        this.handleLeaveAuction(socket, data)
      })

      socket.on('ping', () => {
        socket.emit('timer-update', { timestamp: Date.now() })
      })

      socket.on('disconnect', (reason) => {
        console.log(`❌ Client disconnected: ${socket.id}, reason: ${reason}`)
        this.handleDisconnect(socket)
      })

      socket.on('error', (error) => {
        console.error(`⚠️  Socket error for ${socket.id}:`, error)
      })
    })
  }

  private handleJoinAuction(
    socket: Socket<ClientToServerEvents, ServerToClientEvents, {}, AuctionSocketData>,
    data: { auction_id: string; party_id?: string }
  ) {
    const { auction_id, party_id } = data

    const roomName = party_id ? `party:${party_id}` : `auction:${auction_id}`
    socket.join(roomName)

    socket.data.auction_id = auction_id
    if (party_id) {
      socket.data.party_id = party_id
    }

    if (!this.connectedClients.has(roomName)) {
      this.connectedClients.set(roomName, new Set())
    }
    this.connectedClients.get(roomName)!.add(socket.id)

    console.log(`📥 Client ${socket.id} joined ${roomName}`)
    console.log(`   Clients in ${roomName}: ${this.connectedClients.get(roomName)!.size}`)
  }

  private handleLeaveAuction(
    socket: Socket<ClientToServerEvents, ServerToClientEvents, {}, AuctionSocketData>,
    data: { auction_id: string }
  ) {
    const { auction_id } = data
    const roomName = `auction:${auction_id}`
    
    socket.leave(roomName)

    if (this.connectedClients.has(roomName)) {
      this.connectedClients.get(roomName)!.delete(socket.id)
      if (this.connectedClients.get(roomName)!.size === 0) {
        this.connectedClients.delete(roomName)
      }
    }

    console.log(`📤 Client ${socket.id} left ${roomName}`)
  }

  private handleDisconnect(socket: Socket<ClientToServerEvents, ServerToClientEvents, {}, AuctionSocketData>) {
    this.connectedClients.forEach((clients, room) => {
      if (clients.has(socket.id)) {
        clients.delete(socket.id)
        if (clients.size === 0) {
          this.connectedClients.delete(room)
        }
      }
    })
  }

  public broadcastBidUpdate(partyId: string, data: any) {
    const roomName = `party:${partyId}`
    this.io.to(roomName).emit('bid-update', {
      ...data,
      timestamp: Date.now(),
    })
    console.log(`📢 Broadcast bid-update to ${roomName}`)
  }

  public broadcastTimerUpdate(partyId: string, data: any) {
    const roomName = `party:${partyId}`
    this.io.to(roomName).emit('timer-update', {
      ...data,
      timestamp: Date.now(),
    })
  }

  public broadcastPartyChange(auctionId: string, data: any) {
    const roomName = `auction:${auctionId}`
    this.io.to(roomName).emit('party-change', {
      ...data,
      timestamp: Date.now(),
    })
    console.log(`📢 Broadcast party-change to ${roomName}`)
  }

  public broadcastPartyStarted(partyId: string, auctionId: string, data: any) {
    this.io.to(`party:${partyId}`).emit('party-started', {
      ...data,
      timestamp: Date.now(),
    })
    this.io.to(`auction:${auctionId}`).emit('party-started', {
      ...data,
      timestamp: Date.now(),
    })
    console.log(`📢 Broadcast party-started to party:${partyId} and auction:${auctionId}`)
  }

  public broadcastPartyEnded(partyId: string, auctionId: string, data: any) {
    this.io.to(`party:${partyId}`).emit('party-ended', {
      ...data,
      timestamp: Date.now(),
    })
    this.io.to(`auction:${auctionId}`).emit('party-ended', {
      ...data,
      timestamp: Date.now(),
    })
    console.log(`📢 Broadcast party-ended to party:${partyId} and auction:${auctionId}`)
  }

  public sendErrorToClient(socketId: string, error: any) {
    this.io.to(socketId).emit('error', {
      message: error.message || 'An error occurred',
      timestamp: Date.now(),
    })
  }

  public getConnectedClientsCount(roomName: string): number {
    return this.connectedClients.get(roomName)?.size || 0
  }

  public getAllRooms(): string[] {
    return Array.from(this.connectedClients.keys())
  }

  public close() {
    this.io.close()
    console.log('🔌 WebSocket Server closed')
  }
}

let wsServer: AuctionWebSocketServer | null = null

export function initializeWebSocketServer(httpServer: HttpServer): AuctionWebSocketServer {
  if (!wsServer) {
    wsServer = new AuctionWebSocketServer(httpServer)
  }
  return wsServer
}

export function getWebSocketServer(): AuctionWebSocketServer | null {
  return wsServer
}






