import React, { useEffect, useState } from 'react';
import { Col, Row, Typography, Input, Avatar, Button, Divider, Space, Tag } from 'antd';
import { UserOutlined, RobotOutlined, PlusOutlined, MessageOutlined, DeleteOutlined, SendOutlined } from '@ant-design/icons';
import { socket } from './socket';
import './App.css';

const { Text } = Typography;

type Message = {
  chatid: number;
  type: string;
  message: string;
}

type Chat = {
  id: number;
  createdAt: number;
  title: string;
}

const App:React.FC = () => {
  const [chatId, setChatId] = useState<number | null>(null);
  const [chatTitle, setChatTitle] = useState<string>('');
  const [chats, setChats] = useState<Chat[]>([]);
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [message, setMessage] = useState<Message | null>();
  const [messages, setMessages] = useState<Message[]>([]);

  const fetchMessages = async (): Promise<Message[]> => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_ENDPOINT}/chat-history/${chatId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch chat history');
      }
      const data = await response.json() as Message[];
      return data;
    } catch (error) {
      console.error('Error fetching chat history:', error);
      throw error;
    }
  }

  const fetchChat = async (): Promise<Chat> => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_ENDPOINT}/chat/${chatId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch chat history');
      }
      const data = await response.json() as Chat;
      return data;
    } catch (error) {
      console.error('Error fetching chat:', error);
      throw error;
    }
  }

  const deleteChat = async (deletedChatId: number) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_ENDPOINT}/chat/${deletedChatId}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        throw new Error('Failed to delete chat');
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
      throw error;
    }
  }

  const fetchChats = async (): Promise<Chat[]> => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_ENDPOINT}/chat`);
      if (!response.ok) {
        throw new Error('Failed to fetch chats history');
      }
      const data = await response.json() as Chat[];
      return data;
    } catch (error) {
      console.error('Error fetching chats:', error);
      throw error;
    }
  }

  const addNewChat = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_ENDPOINT}/chat`, {
        method: 'POST'
      });
      if (!response.ok) {
        throw new Error('Failed to add new chat');
      }
      const _chatid = await response.json() as number;
      setChatId(_chatid)
    } catch (error) {
      console.error('Error adding new chat:', error);
      throw error;
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (chatId !== null){
          const _chat = await fetchChat();
          setChatTitle(_chat.title);
          socket.emit('join', { room: chatId });
        }
        const _chats = await fetchChats();
        setChats(_chats)
        const _messages = await fetchMessages();
        setMessages(_messages);
      } catch (error) {
        console.log("historyの取得に失敗しました。")
        console.log(error)
      }
    }

    fetchData();

    return () => {
      socket.emit('leave', { room: chatId });
    };
  }, [chatId]);

  useEffect(() => {
    const onConnect = () => {
      setIsConnected(true);
      chatId && socket.emit('join', { room: chatId });
    }

    const onDisconnect = () => {
      setIsConnected(false);
      chatId && socket.emit('leave', { room: chatId });
    }

    const onMessageEvent = (value: Message)  => {
      setMessages(previous => [...previous, value]);
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('chat', onMessageEvent);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('chat', onMessageEvent);
    };
  }, []);

  const sendMessage = () => {
    socket.emit('chat', message);
    setMessage(null);
  }

  return (
    <div>
      <Row wrap={false}>
        <Col flex="250px" className='menu'>
          <Button 
            className="menu-item"
            type="text"
            onClick={addNewChat}
          >
            <PlusOutlined /> 新しいチャットを追加
          </Button>
          <Divider />
          {chats.map((c, index) => (
            <div key={index} className="menu-item">
              <Button
                className="menu-chat-button"
                type="text"
                onClick={() => setChatId(c.id)}
              >
                <MessageOutlined /> {c.title}
              </Button>
              <Button
                type="text"
                icon={<DeleteOutlined/>}
                onClick={async () =>  {
                  await deleteChat(c.id);
                  const _chats = await fetchChats();
                  setChats(_chats)
                }}
              />
            </div>
          ))}
        </Col>
        <Col flex="auto" className='content'>
          {chatId === null ? (
            <div className={'history-text history-human'}>
              <Space>
                <Avatar className="avatar-ai" icon={<RobotOutlined />} />
                <Text>
                  {' チャットが選択されていません。\n左メニューからチャットを追加、または、チャットを選択してください。'}
                </Text>
              </Space>
            </div>
          ) : (<>
            <div className="content-chat">
              <div className="content-header">
                <h2>{chatTitle} (id: {chatId})</h2>
                {isConnected ? (
                  <Tag bordered={false} color="success">接続済</Tag>
                ) : (
                  <Tag bordered={false} color="warning">未接続</Tag>
                )}
              </div>
              {messages.map((msg, index) => (
                msg.type === 'ai' ? (
                  <div key={index} className={'history-text history-ai'}>
                    <Space><Avatar className="avatar-ai" icon={<RobotOutlined />} /> <Text>{msg.message}</Text></Space>
                  </div>
                ) : (
                  <div key={index} className={'history-text history-human'}>
                    <Space><Avatar className="avatar-human" icon={<UserOutlined />} /> <Text>{msg.message}</Text></Space>
                  </div>
                )
              ))}
            </div>
            <div className="content-input">
              <Row align="bottom">
                <Col flex="auto">
                  <Input.TextArea
                    value={message ?  message.message : ''}
                    onChange={(e) => setMessage({
                      chatid: chatId,
                      type: 'human',
                      message: e.target.value
                    })}
                  />
                </Col>
                <Col flex="20px">
                  <Button size="large" shape="circle" type="text" onClick={sendMessage} icon={<SendOutlined />}></Button>
                </Col>
              </Row>
            </div>
          </>)}
        </Col>
      </Row>
    </div>
  )
}

export default App
