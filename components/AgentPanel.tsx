import React, { useState, useEffect, useRef } from 'react';
import { type ChatMessage } from '../types';
import { SendIcon } from './icons';

interface AgentPanelProps {
    messages: ChatMessage[];
    onAgentSendMessage: (input: string) => Promise<void>;
    isAgentLoading: boolean;
    isLoading: boolean;
    onAbortAgent: () => void;
    agentError: string | null;
    userInput: string;
    setUserInput: (value: string) => void;
    t: (key: string) => string;
}

const AgentPanel: React.FC<AgentPanelProps> = ({ messages, onAgentSendMessage, isAgentLoading, isLoading, onAbortAgent, agentError, userInput, setUserInput, t}) => {
    const chatEndRef = useRef<HTMLDivElement>(null);
    const isAgentWorking = isAgentLoading || isLoading;

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isAgentLoading]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userInput.trim() || isAgentWorking) return;
        await onAgentSendMessage(userInput);
    };

    return (
        <div className="flex flex-col h-full bg-background rounded-lg">
            <div className="flex-grow p-4 space-y-4 overflow-y-auto">
                {messages.filter(msg => msg.text).map((msg, index) => (
                    <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] p-3 rounded-lg ${msg.role === 'user' ? 'bg-primary text-white' : 'bg-surface'}`}>
                           {msg.text?.includes("Sorry, I encountered an error")
                             ? <p className="text-sm whitespace-pre-wrap text-red-400">{msg.text}</p>
                             : <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                           }
                        </div>
                    </div>
                ))}
                {isAgentLoading && (
                     <div className="flex justify-start">
                        <div className="max-w-[80%] p-3 rounded-lg bg-surface flex items-center justify-center">
                            <svg className="animate-spin h-5 w-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        </div>
                    </div>
                )}
                <div ref={chatEndRef} />
            </div>
            <div className="p-4 border-t border-border">
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                    <input
                        type="text"
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        placeholder={t('agentPlaceholder')}
                        className="w-full p-2 bg-surface border border-border rounded-lg text-text-secondary placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary"
                        disabled={isAgentWorking}
                    />
                    <button type="submit" disabled={isAgentWorking || !userInput.trim()} className="p-2 bg-primary text-white rounded-lg disabled:bg-gray-500 hover:bg-primary-hover transition-colors">
                        <SendIcon />
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AgentPanel;