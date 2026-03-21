import ChatWindow from '../components/ChatWindow'
import './HomePage.css'

function ChatPage() {
  return (
    <div className="home-page">
      <div className="home-container" style={{ padding: 0, height: '100%', width: '100%' }}>
        <ChatWindow />
      </div>
    </div>
  )
}

export default ChatPage

