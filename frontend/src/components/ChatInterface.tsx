import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Message {
  id: string;
  content: string;
  type: "user" | "bot";
  timestamp: Date;
}

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
}

export const ChatInterface = ({ messages, onSendMessage, isLoading = false }: ChatInterfaceProps) => {
  const [inputValue, setInputValue] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll vers le bas quand de nouveaux messages arrivent
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !isLoading) {
      onSendMessage(inputValue.trim());
      setInputValue("");
    }
  };

  return (
    <div className="flex flex-col h-full bg-gradient-background relative">
      {/* Messages Container - Scrollable area */}
      <ScrollArea className="flex-1 p-4 pb-24 min-h-0" ref={scrollAreaRef}>
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-primary flex items-center justify-center mb-4 shadow-blue overflow-hidden">
                <img src="/brain.png" alt="Bot" className="w-10 h-10 object-contain" />
              </div>
              <h2 className="text-2xl font-semibold text-foreground mb-2">
                Bonjour! Comment puis-je vous aider?
              </h2>
              <p className="text-muted-foreground max-w-md">
                Posez-moi vos questions et je vous fournirai des réponses précises basées sur mes connaissances.
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3 items-start",
                  message.type === "user" ? "justify-end" : "justify-start"
                )}
              >
                {message.type === "bot" && (
                  <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center shadow-blue flex-shrink-0 overflow-hidden">
                    <img src="/brain.png" alt="Bot" className="w-5 h-5 object-contain" />
                  </div>
                )}
                
                <div
                  className={cn(
                    "max-w-2xl rounded-lg px-4 py-2 shadow-sm",
                    message.type === "user"
                      ? "bg-chat-user-bg text-chat-user-text ml-12"
                      : "bg-chat-bot-bg text-chat-bot-text mr-12"
                  )}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  <span className="text-xs opacity-70 mt-1 block">
                    {message.timestamp.toLocaleTimeString()}
                  </span>
                </div>

                {message.type === "user" && (
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-secondary-foreground" />
                  </div>
                )}
              </div>
            ))
          )}
          
          {isLoading && (
            <div className="flex gap-3 items-start justify-start">
              <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center shadow-blue flex-shrink-0 overflow-hidden">
                <img src="/brain.png" alt="Bot" className="w-5 h-5 object-contain" />
              </div>
              <div className="bg-chat-bot-bg text-chat-bot-text rounded-lg px-4 py-2 mr-12">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Container - Fixed at bottom */}
      <div className="absolute bottom-0 left-0 right-0 border-t border-border bg-card/95 backdrop-blur-md p-4 z-10">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
          <div className="flex gap-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Tapez votre message ici..."
              disabled={isLoading}
              className="flex-1 bg-background/90 backdrop-blur-sm border-border/50 focus:ring-2 focus:ring-primary/20"
              autoComplete="off"
            />
            <Button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className="bg-gradient-primary hover:bg-primary-hover shadow-blue transition-all duration-300 px-6"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};