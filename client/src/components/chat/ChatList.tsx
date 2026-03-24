"use client";

import React, { useState } from "react";
import { Search, Filter, MoreVertical, Plus, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useChat } from "@/context/ChatContext";
import { cn } from "@/lib/utils";

export default function ChatList() {
  const { chats, selectChat, selectedChat, status } = useChat();
  const [activeFilter, setActiveFilter] = useState("All");
  
  const filters = ["All", "Unread", "Favorites", "Groups"];

  return (
    <div className="flex flex-col h-full bg-[#111b21] border-r border-[#222d34] w-[400px] min-w-[400px] max-w-[400px] flex-shrink-0">
      {/* Added min-w and max-w to strictly fix the width */}
      <div className="flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3">
          <h2 className="text-[22px] font-bold text-[#e9edef]">Chats</h2>
          <div className="flex items-center gap-3 text-[#aebac1]">
            <button className="p-2 hover:bg-[#202c33] rounded-full transition-colors flex items-center justify-center">
              <Plus className="w-5 h-5" />
            </button>
            <button className="p-2 hover:bg-[#202c33] rounded-full transition-colors flex items-center justify-center">
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Search */}
        <div className="px-3 pb-2">
          <div className="relative flex items-center bg-[#202c33] rounded-lg border-b-2 border-transparent focus-within:bg-[#202c33] transition-colors h-9">
            <button className="absolute left-3 p-1 flex items-center justify-center text-[#8696a0]">
              <Search className="w-4 h-4" />
            </button>
            <input
              type="text"
              placeholder="Search or start a new chat"
              className="w-full pl-10 pr-4 bg-transparent border-none text-[15px] text-[#d1d7db] placeholder:text-[#8696a0] focus:ring-0 outline-none h-full"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-[#222d34] overflow-x-auto scrollbar-hide">
          {filters.map(filter => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={cn(
                "px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors",
                activeFilter === filter 
                  ? "bg-[#0a332c] text-[#00a884]" 
                  : "bg-[#202c33] text-[#8696a0] hover:bg-[#2a3942]"
              )}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Chat List OR Loading Screen */}
      {status === 'syncing' ? (
        <div className="flex-1 flex flex-col items-center justify-center text-[#8696a0] p-6 text-center">
          <Loader2 className="w-10 h-10 animate-spin text-[#00a884] mb-4" />
          <p className="text-[#e9edef] font-medium mb-1">Syncing Messages...</p>
          <p className="text-sm">Downloading history from your phone. This might take a moment.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {chats.map((chat) => {
            const isSelected = selectedChat?.id === chat.id;
            
            return (
              <div
                key={chat.id}
                onClick={() => selectChat(chat)}
                className={cn(
                  "flex items-center gap-3 px-3 py-0 cursor-pointer transition-colors group",
                  isSelected ? "bg-[#2a3942]" : "hover:bg-[#202c33]"
                )}
              >
                <div className="relative my-3 ml-1 mr-1 flex-shrink-0">
                  <div className="w-[49px] h-[49px] bg-[#607d8b] rounded-full flex items-center justify-center text-[#e9edef] text-xl font-medium overflow-hidden">
                    {chat.name ? chat.name[0].toUpperCase() : "?"}
                  </div>
                </div>
                
                <div className="flex-1 min-w-0 flex flex-col justify-center h-[72px] border-b border-[#222d34] pr-4 group-last:border-none">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <span className="text-[17px] text-[#e9edef] truncate">{chat.name || chat.phone}</span>
                    <span className={cn(
                      "text-xs whitespace-nowrap ml-4",
                      chat.unreadCount > 0 ? "text-[#00a884]" : "text-[#8696a0]"
                    )}>
                      {format(new Date(chat.lastMessageTime), "h:mm a")}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between gap-4">
                    <p className={cn(
                      "text-[14px] truncate flex-1",
                      chat.unreadCount > 0 ? "text-[#e9edef] font-medium" : "text-[#8696a0]"
                    )}>
                      {chat.lastMessage}
                    </p>
                    
                    {chat.unreadCount > 0 && (
                      <div className="w-[18px] h-[18px] bg-[#00a884] text-[#111b21] text-[11px] font-bold flex items-center justify-center rounded-full flex-shrink-0">
                        {chat.unreadCount}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
