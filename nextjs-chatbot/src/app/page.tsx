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
      role: MessageRole.USER,
      message: "Who are you?",
      userInfo: TEST_USER_INFO,
    },
    {
      id: "2",
      role: MessageRole.ASSISTANT,
      message: "I am a LLM ChatBoT..",
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
        return "Response error";
      }

      const reader = res.body?.getReader();
      if (!reader) {
        return;
      }

      const decoder = new TextDecoder();
      let accumulatedText = "";

      // Set a new conversation for the assistant before the stream starts
      setChatConversations((conversations) => [
        ...conversations,
        {
          id: (conversations.length + 1).toString(),
          role: MessageRole.ASSISTANT,
          message: "", // Start with an empty message for streaming
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

            accumulatedText += token; // Accumulate the streamed tokens

            // Update the conversation's last assistant message
            setChatConversations((conversations) => {
              const lastMessageIndex = conversations.length - 1;
              const updatedConversations = [...conversations];

              // Update the last assistant message with the accumulated text
              updatedConversations[lastMessageIndex] = {
                ...updatedConversations[lastMessageIndex],
                message: accumulatedText, // Update the message progressively
              };

              return updatedConversations;
            });
          }
        }
      }

      return accumulatedText;
    } catch (error) {
      console.error("Failed to get response from server", error);
      return "Failed to get response from server";
    }
  };




  const handleSubmit = useCallback((value: string) => {
    setIsQuerying(true);
    setChatConversations((conversations) => [
      ...conversations,
      {
        //userInfo: TEST_USER_INFO,
        id: (conversations.length + 1).toString(),
        role: MessageRole.USER,
        message: value,
      },
    ]);

    sendBtn(value).then((response) => {
      console.log(response)
      setIsQuerying(false);
      setChatConversations((conversations) => [
        ...conversations,
        {
          id: (conversations.length + 1).toString(),
          role: MessageRole.ASSISTANT,
          message: response || "", // Ensure message is always a string
        },
      ]);
    })

    /*setTimeout(() => {
      setIsQuerying(false);
      setChatConversations((conversations) => [
        ...conversations,
        {
          id: (conversations.length + 1).toString(),
          role: MessageRole.ASSISTANT,
          message: "This is a mocked sample LLM ChatBot response",
        },
      ]);
    }, 3000); */
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
