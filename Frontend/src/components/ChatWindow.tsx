import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useSocket } from '../contexts/SocketContext'
import type { ChatMessage } from '../contexts/SocketContext'
import { useAuth } from '../contexts/AuthContext'
import './ChatWindow.css'

function ChatWindow() {
  const { chatId: otherUserId } = useParams<{ chatId: string }>()
  const { socket } = useSocket()
  const { user } = useAuth()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [ended, setEnded] = useState(false)

  useEffect(() => {
    if (!socket || !otherUserId) return

    setEnded(false)
    setMessages([])

    socket.emit('getChatHistory', { otherUserId })

    const onHistory = (history: ChatMessage[]) => {
      setMessages(Array.isArray(history) ? history : [])
    }

    const onNewMessage = (msg: ChatMessage) => {
      // We only have peer-to-peer chats; append if it belongs to this pair
      const mine = user?.id
      if (!mine) return
      const belongs =
        (msg.senderId === mine && msg.receiverId === otherUserId) ||
        (msg.senderId === otherUserId && msg.receiverId === mine)
      if (belongs) setMessages(prev => [...prev, msg])
    }

    const onSent = (msg: ChatMessage) => onNewMessage(msg)

    const onChatDeleted = ({ roomId }: { roomId: string }) => {
      const mine = user?.id
      if (!mine) return
      const expectedRoomId = [mine, otherUserId].sort().join('_')
      if (roomId === expectedRoomId) {
        setEnded(true)
        setMessages([])
      }
    }

    socket.on('chat_history', onHistory)
    socket.on('new_message', onNewMessage)
    socket.on('message_sent', onSent)
    socket.on('chat_deleted', onChatDeleted)

    return () => {
      socket.off('chat_history', onHistory)
      socket.off('new_message', onNewMessage)
      socket.off('message_sent', onSent)
      socket.off('chat_deleted', onChatDeleted)
    }
  }, [socket, otherUserId, user?.id])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!socket || !otherUserId || !input.trim() || ended) return

    socket.emit('sendMessage', { receiverId: otherUserId, message: input.trim() })
    setInput('')
  }

  return (
    <div className="chat-window-root">
      {ended && (
        <div style={{ padding: '10px 12px', color: '#fff', background: 'rgba(255,255,255,0.08)' }}>
          Chat ended (someone went offline). No history is saved.
        </div>
      )}
      <div className="chat-messages">
        {messages.map(msg => (
          <div key={msg.id} className="chat-message">
            <div className="chat-message-text">{msg.message}</div>
          </div>
        ))}
      </div>
      <form className="chat-input-row" onSubmit={handleSubmit}>
        <input
          className="chat-input"
          placeholder="Type a message..."
          value={input}
          onChange={e => setInput(e.target.value)}
          disabled={ended}
        />
        <button type="submit" className="chat-send-btn">
          Send
        </button>
      </form>
    </div>
  )
}

export default ChatWindow

