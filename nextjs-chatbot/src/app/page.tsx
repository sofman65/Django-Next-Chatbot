'use client'
import { useCallback, useState } from "react";
import { MessageRole } from "../types/MessageRoles";
import { Conversations } from "../types";
import { ChatUI } from "../components/chat-ui/ChatUI";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMailReply } from "@fortawesome/free-solid-svg-icons";
import styles from "./page.module.css";


const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

const TEST_USER_INFO = { firstName: "First", lastName: "User" };

export default function Home() {
  const [isQuerying, setIsQuerying] = useState<boolean>(false);

  const [chatConversations, setChatConversations] = useState<Conversations>([
  
    {
      id: "1",
      role: MessageRole.ASSISTANT,
      message: "I am Nexus, your assistant in paytech. How can I help you today?",
    },
  ]);

  const sendBtn = async (data: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: data }),
      });
  
      if (!res.ok) {
        console.error("Response error");
        setChatConversations((conversations) => [
          ...conversations,
          {
            id: (conversations.length + 1).toString(),
            role: MessageRole.ASSISTANT,
            message: "An error occurred while fetching the response.",
          },
        ]);
        return "Response error";
      }
  
      const reader = res.body?.getReader();
      if (!reader) {
        return;
      }
  
      const decoder = new TextDecoder();
      let accumulatedText = "";
  
      setChatConversations((conversations) => [
        ...conversations,
        {
          id: (conversations.length + 1).toString(),
          role: MessageRole.ASSISTANT,
          message: "",
        },
      ]);
  
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
  
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.trim().split("\n");
  
        for (let line of lines) {
          if (line.startsWith("data: ")) {
            const jsonData = JSON.parse(line.substring(6));
            const token = jsonData.answer;
  
            accumulatedText += token;
  
            setChatConversations((conversations) => {
              const lastMessageIndex = conversations.length - 1;
              const updatedConversations = [...conversations];
  
              updatedConversations[lastMessageIndex] = {
                ...updatedConversations[lastMessageIndex],
                message: accumulatedText,
              };
  
              return updatedConversations;
            });
          }
        }
      }
  
      return accumulatedText;
    } catch (error) {
      console.error("Failed to get response from server", error);
      setChatConversations((conversations) => [
        ...conversations,
        {
          id: (conversations.length + 1).toString(),
          role: MessageRole.ASSISTANT,
          message: "An error occurred while processing your request.",
        },
      ]);
      return "Failed to get response from server";
    }
  };
  




  const handleSubmit = useCallback((value: string) => {
  setIsQuerying(true);
  setChatConversations((conversations) => [
    ...conversations,
    {
      id: (conversations.length + 1).toString(),
      role: MessageRole.USER,
      message: value,
    },
  ]);

  sendBtn(value).finally(() => {
    setIsQuerying(false); // Stop querying after streaming completes
  });
}, []);


  return (
    <ChatUI
      isQuerying={isQuerying}
      onSubmit={handleSubmit}
      placeholder="Type here to interact with LLM ChatBot"
      disabled={isQuerying}
      conversations={chatConversations}
      customSubmitIcon={<FontAwesomeIcon icon={faMailReply} />}
    />
  )
}
