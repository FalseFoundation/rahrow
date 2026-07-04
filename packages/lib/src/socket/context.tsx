'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import type { Socket } from 'socket.io-client'
import { type CreateSocketClientProps, createSocketClient } from './client'

interface SocketProviderProps extends CreateSocketClientProps {
	children: React.ReactNode
}

const SocketContext = createContext<Socket | null>(null)

export const BaseSocketProvider = ({ url, options, children }: SocketProviderProps) => {
	const [socket] = useState(() => createSocketClient({ url, options }))

	useEffect(() => {
		socket.connect()

		return () => {
			socket.disconnect()
		}
	}, [])

	return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
}

export const useSocket = (): Socket => {
	const ctx = useContext(SocketContext)
	if (!ctx) throw new Error('useSocket must be used within a SocketProvider')
	return ctx
}
