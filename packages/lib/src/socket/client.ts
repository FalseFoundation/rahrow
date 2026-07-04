import { io, type ManagerOptions, type Socket, type SocketOptions } from 'socket.io-client'

export interface CreateSocketClientProps {
	url: string
	options?: Partial<ManagerOptions & SocketOptions>
}

export const createSocketClient = ({ url, options }: CreateSocketClientProps): Socket => {
	return io(url, {
		transports: ['websocket'],
		withCredentials: true,
		autoConnect: false,
		...options,
	})
}
