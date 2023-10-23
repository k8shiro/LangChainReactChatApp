from langchain.chat_models import ChatOpenAI
from langchain.chains import ConversationChain
from langchain.memory import ConversationBufferMemory, ConversationBufferWindowMemory
from langchain.schema import messages_to_dict, messages_from_dict
from langchain.prompts.chat import (
    ChatPromptTemplate,
    MessagesPlaceholder, 
    SystemMessagePromptTemplate,
    HumanMessagePromptTemplate,
)
import json
from flask import current_app

from assistant.db import insert_message, get_messages_by_chatid

class Assistant:
    def __init__(self, chatid):
        self.chatid = chatid

        chat = ChatOpenAI(temperature=0.7)
        self.memory = ConversationBufferWindowMemory(k=3, return_messages=True)
        history_messages = get_messages_by_chatid(self.chatid)
        if history_messages is not None:
            self.memory.chat_memory.messages = messages_from_dict(history_messages)

        template = """
        以下は、人間とAIの会話です。
        AIはIT関連のベテランエンジニアで新人でもわかるように質問に答えます。
        AIは質問の答えを知らない場合、正直に「知らない」と答えます。
        """

        prompt = ChatPromptTemplate.from_messages([
            SystemMessagePromptTemplate.from_template(template),
            MessagesPlaceholder(variable_name="history"),
            HumanMessagePromptTemplate.from_template("{input}")
        ])

        self.conversation = ConversationChain(llm=chat, memory=self.memory, prompt=prompt)

    def generate_response(self, user_message):
        response = self.conversation.predict(input=user_message)

        # 履歴をDB保存
        history = self.memory.chat_memory
        history_messages = messages_to_dict(history.messages)
        insert_message(self.chatid, history_messages)

        # 回答に使用した過去のChat
        buffer = self.memory.load_memory_variables({})
        current_app.logger.info(f"load_memory_variables: ${buffer['history']}")

        return {
            'chatid': self.chatid,
            'type': 'ai',
            'message': response
        } 