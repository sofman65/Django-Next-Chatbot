"use client";
import { useState } from "react";
import { StreamingTextEffect } from "@/components/ui/streaming-text-effect";
import { TextGenerateEffect } from "@/components/ui/text-generate-effect";
import { Button } from "@/components/ui/button";

export default function TestStreamingPage() {
    const [text, setText] = useState("");
    const [isStreaming, setIsStreaming] = useState(false);

    const sampleTexts = [
        "Hello! I'm your AI assistant.",
        "Hello! I'm your AI assistant. I can help you with various tasks.",
        "Hello! I'm your AI assistant. I can help you with various tasks like answering questions, writing code, and providing information.",
        "Hello! I'm your AI assistant. I can help you with various tasks like answering questions, writing code, and providing information. What would you like to know today?"
    ];

    const simulateStreaming = () => {
        setIsStreaming(true);
        setText("");

        let currentIndex = 0;
        const interval = setInterval(() => {
            if (currentIndex < sampleTexts.length) {
                setText(sampleTexts[currentIndex]);
                currentIndex++;
            } else {
                setIsStreaming(false);
                clearInterval(interval);
            }
        }, 1500);
    };

    return (
        <div className="min-h-screen bg-black p-8">
            <div className="max-w-4xl mx-auto space-y-8">
                <h1 className="text-3xl font-bold text-white mb-8">Streaming Text Effects Demo</h1>

                {/* Demo Section */}
                <div className="bg-gray-900/50 border border-gray-700 rounded-2xl p-6">
                    <h2 className="text-xl font-semibold text-white mb-4">Chat Streaming Effect</h2>
                    <div className="bg-gray-800/50 border border-gray-600 rounded-xl p-4 mb-4 min-h-[100px]">
                        {text && (
                            <StreamingTextEffect
                                text={text}
                                isStreaming={isStreaming}
                                className="text-white"
                            />
                        )}
                    </div>
                    <Button
                        onClick={simulateStreaming}
                        className="bg-blue-600 hover:bg-blue-700"
                        disabled={isStreaming}
                    >
                        {isStreaming ? "Streaming..." : "Start Streaming Demo"}
                    </Button>
                </div>

                {/* Original Effect Demo */}
                <div className="bg-gray-900/50 border border-gray-700 rounded-2xl p-6">
                    <h2 className="text-xl font-semibold text-white mb-4">Original Text Generate Effect</h2>
                    <div className="bg-gray-800/50 border border-gray-600 rounded-xl p-4">
                        <TextGenerateEffect
                            words="This is the original text generation effect that animates all words at once."
                            className="text-white"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
