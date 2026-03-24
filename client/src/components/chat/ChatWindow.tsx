"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, Image, Paperclip, Smile, MoreVertical, Phone, Video, FileText, Camera, Mic, User, MapPin, Search, Tag, ChevronDown, Check, CheckCheck, Download, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useChat } from "@/context/ChatContext";
import { format, isSameDay, isToday, isYesterday } from "date-fns";

// Programmatically download file from URL (cross origin safe)
const downloadMedia = async (url: string, filename: string) => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(objectUrl);
  } catch (error) {
    console.error("Failed to download media:", error);
  }
};

const renderDateSeparator = (date: Date) => {
  let dateText = format(date, "MM/dd/yyyy");
  if (isToday(date)) dateText = "TODAY";
  else if (isYesterday(date)) dateText = "YESTERDAY";
  else if (new Date().getTime() - date.getTime() < 7 * 24 * 60 * 60 * 1000) {
    dateText = format(date, "EEEE").toUpperCase(); // e.g. "THURSDAY"
  }

  return (
    <div className="flex justify-center mb-6 mt-6 relative z-10 w-full">
      <div className="bg-[#182229] text-[#8696a0] text-xs px-3 py-1.5 rounded-md uppercase font-medium shadow-sm">
        {dateText}
      </div>
    </div>
  );
};

const renderMessageContent = (msg: any) => {
  if (msg.mediaUrl) {
    const fullUrl = `http://localhost:3002${msg.mediaUrl}`;
    const isImage = msg.fileMimeType?.startsWith('image/');
    const isVideo = msg.fileMimeType?.startsWith('video/');
    const isAudio = msg.fileMimeType?.startsWith('audio/') || msg.type === 'ptt';
    const isPDF = msg.fileMimeType?.includes('pdf');

    let mediaNode = null;
    if (isImage) {
      mediaNode = (
        <div className="relative group/media inline-block object-cover w-full max-w-[300px]">
          <img src={fullUrl} alt={msg.fileName || 'Image'} className="w-full rounded-md object-cover" />
          <button 
            onClick={() => downloadMedia(fullUrl, msg.fileName || 'image.jpg')}
            className="absolute top-2 right-2 bg-black/60 p-2 rounded-full text-white opacity-0 group-hover/media:opacity-100 transition-opacity hover:bg-black/80"
            title="Download Image"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      );
    } else if (isVideo) {
      mediaNode = (
        <div className="relative group/media inline-block w-full max-w-[300px]">
          <video src={fullUrl} controls className="w-full rounded-md" />
          <button 
            onClick={() => downloadMedia(fullUrl, msg.fileName || 'video.mp4')}
            className="absolute top-2 right-2 bg-black/60 p-2 rounded-full text-white opacity-0 group-hover/media:opacity-100 transition-opacity hover:bg-black/80 z-10"
            title="Download Video"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      );
    } else if (isAudio) {
      mediaNode = <audio src={fullUrl} controls className="w-full pt-1" style={{ maxWidth: '240px' }} />;
    } else {
      // Document styling similar to WA Web
      mediaNode = (
        <a href={fullUrl} download={msg.fileName} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 bg-[#111b21] bg-opacity-50 rounded-md hover:bg-opacity-70 transition group mb-1 min-w-[240px]">
          <div className={cn(
            "w-10 h-10 flex items-center justify-center rounded text-white flex-shrink-0 relative overflow-hidden",
            isPDF ? "bg-[#f40f0f]" : "bg-[#4384f5]"
          )}>
            <FileText className="w-5 h-5 relative z-10" />
          </div>
          <div className="flex flex-col overflow-hidden max-w-[200px] flex-1">
            <span className="text-[15px] font-medium text-[#e9edef] truncate">{msg.fileName || 'Document'}</span>
            <span className="text-[13px] text-[#8696a0] mt-0.5 uppercase flex items-center gap-1">
              {msg.fileMimeType?.split('/')[1]?.split(';')[0] || 'FILE'} • Document
            </span>
          </div>
          <button 
            onClick={(e) => { e.preventDefault(); downloadMedia(fullUrl, msg.fileName || 'document'); }}
            className="p-2 text-[#aebac1] hover:text-[#e9edef] transition-colors rounded-full hover:bg-white/10"
          >
            <Download className="w-5 h-5" />
          </button>
        </a>
      );
    }

    return (
      <div className="flex flex-col gap-1 pr-1 pb-1 relative z-10 w-full">
        {mediaNode}
        {msg.body && <span className="text-[14.5px] leading-relaxed whitespace-pre-wrap break-words mt-1 pr-12">{msg.body}</span>}
      </div>
    );
  }
  
  return (
    <span className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">
      {msg.body}
    </span>
  );
};

export default function ChatWindow() {
  const { selectedChat, messages, sendMessage, syncChatHistory } = useChat();
  const [messageText, setMessageText] = useState("");
  const [showAttachments, setShowAttachments] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (!messageText.trim() || !selectedChat) return;
    sendMessage(selectedChat.phone, messageText);
    setMessageText("");
    setShowAttachments(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSync = async () => {
    if (!selectedChat) return;
    setIsSyncing(true);
    try {
      await syncChatHistory(selectedChat.id);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSyncing(false);
    }
  };

  if (!selectedChat) {
    return (
      <div className="flex flex-col h-full flex-1 min-w-0 bg-[#222d34] items-center justify-center border-l border-[#222d34]">
        <div className="text-center space-y-6">
          <div className="w-24 h-24 bg-[#2a3942] rounded-full flex items-center justify-center mx-auto">
            <Phone className="w-10 h-10 text-[#8696a0]" />
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-light text-[#e9edef]">WhatsApp Web</h2>
            <p className="text-[#8696a0] text-sm max-w-md mx-auto leading-relaxed">
              Send and receive messages without keeping your phone online.<br/>
              Use WhatsApp on up to 4 linked devices and 1 phone at the same time.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full flex-1 min-w-0 bg-[#0b141a] relative border-l border-[#222d34]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-[10px] bg-[#202c33] z-10 w-full flex-shrink-0 h-[60px]">
        <div className="flex items-center gap-4 cursor-pointer">
          <div className="w-10 h-10 bg-[#607d8b] rounded-full flex items-center justify-center text-[#e9edef] text-lg font-medium overflow-hidden">
            {selectedChat.name ? selectedChat.name[0].toUpperCase() : <User className="w-6 h-6 text-[#cfd9df]" />}
          </div>
          <div className="flex flex-col">
            <h3 className="text-[16px] text-[#e9edef] font-medium leading-tight">{selectedChat.name || selectedChat.phone}</h3>
            <p className="text-[13px] text-[#8696a0] mt-0.5 truncate max-w-[300px]">{selectedChat.phone}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 text-[#aebac1]">
          <button 
            onClick={handleSync}
            disabled={isSyncing}
            className="flex items-center gap-2 px-3 py-1.5 border border-[#8696a0] rounded-full hover:bg-[#2a3942] transition-colors mr-2 cursor-pointer"
            title="Fetch full chat history from WhatsApp"
          >
            <RefreshCw className={cn("w-4 h-4", isSyncing ? "animate-spin text-[#00a884]" : "text-[#aebac1]")} />
            <span className={cn("text-sm font-medium", isSyncing ? "text-[#00a884]" : "text-[#e9edef]")}>
              {isSyncing ? "Syncing..." : "Sync History"}
            </span>
          </button>
          <button className="p-2 hover:bg-[#2a3942] rounded-full transition-colors">
            <Video className="w-5 h-5" />
          </button>
          <button className="p-2 hover:bg-[#2a3942] rounded-full transition-colors ml-1">
            <Search className="w-5 h-5" />
          </button>
          <button className="p-2 hover:bg-[#2a3942] rounded-full transition-colors">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div 
        className="flex-1 overflow-y-auto px-[5%] py-4 space-y-[2px] bg-[#0b141a] bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat relative"
        style={{ backgroundBlendMode: 'overlay' }}
      >
        <div className="absolute inset-0 bg-[#0b141a] opacity-90 pointer-events-none z-0"></div>

        {messages.map((msg, idx) => {
          const isMe = !msg.isIncoming;
          const msgDate = new Date(msg.timestamp);
          const prevMsgDate = idx > 0 ? new Date(messages[idx - 1].timestamp) : null;
          
          const showDateSeparator = idx === 0 || (prevMsgDate && !isSameDay(prevMsgDate, msgDate));
          const showPointer = idx === 0 || messages[idx - 1]?.isIncoming !== msg.isIncoming || showDateSeparator;
          
          return (
            <React.Fragment key={msg.id}>
              {showDateSeparator && renderDateSeparator(msgDate)}
              <div
                className={cn("flex w-full relative z-10", isMe ? "justify-end" : "justify-start", showPointer ? "mt-1.5" : "mt-0.5")}
              >
              <div
                className={cn(
                  "max-w-[75%] rounded-lg px-2.5 py-1.5 shadow-sm relative group",
                  isMe ? "bg-[#005c4b] text-[#e9edef]" : "bg-[#202c33] text-[#e9edef]",
                  showPointer && isMe ? "rounded-tr-none" : "",
                  showPointer && !isMe ? "rounded-tl-none" : ""
                )}
              >
                {/* Pointer triangles for first message in sequence */}
                {showPointer && isMe && (
                  <span className="absolute top-0 -right-[8px] text-[#005c4b]">
                    <svg viewBox="0 0 8 13" width="8" height="13" className="">
                      <path opacity=".13" d="M5.188 1H0v11.193l6.467-8.625C7.526 2.156 6.958 1 5.188 1z"></path>
                      <path fill="currentColor" d="M5.188 0H0v11.193l6.467-8.625C7.526 1.156 6.958 0 5.188 0z"></path>
                    </svg>
                  </span>
                )}
                {showPointer && !isMe && (
                  <span className="absolute top-0 -left-[8px] text-[#202c33]">
                    <svg viewBox="0 0 8 13" width="8" height="13" className="">
                      <path opacity=".13" fill="#0000000" d="M1.533 3.568L8 12.193V1H2.812C1.042 1 .474 2.156 1.533 3.568z"></path>
                      <path fill="currentColor" d="M1.533 2.568L8 11.193V0H2.812C1.042 0 .474 1.156 1.533 2.568z"></path>
                    </svg>
                  </span>
                )}

                <div className={cn("relative", !msg.mediaUrl ? "pr-16" : "")}>
                   {renderMessageContent(msg)}
                   <div className={cn(
                     "flex items-center gap-1 z-20", 
                     !msg.mediaUrl ? "absolute bottom-0 right-0 translate-y-[2px]" : "justify-end mt-1"
                   )}>
                     <span className="text-[11px] text-[#8696a0]">
                       {format(new Date(msg.timestamp), "h:mm a")}
                     </span>
                     {isMe && (
                       <CheckCheck className="w-[15px] h-[15px] text-[#53bdeb] ml-0.5" />
                     )}
                   </div>
                </div>
              </div>
            </div>
          </React.Fragment>
        );
      })}
        <div ref={messagesEndRef} className="h-4" />
      </div>

      {/* Attachment Menu Overlay */}
      {showAttachments && (
        <div className="absolute bottom-[72px] left-4 bg-[#233138] rounded-2xl shadow-xl p-4 grid grid-cols-3 gap-6 z-30 animate-in fade-in slide-in-from-bottom-4">
          <button className="flex flex-col items-center gap-2 group">
            <div className="w-14 h-14 rounded-full bg-indigo-500 flex items-center justify-center text-white group-hover:-translate-y-1 transition-transform shadow-md">
              <FileText className="w-6 h-6" />
            </div>
            <span className="text-sm text-[#e9edef]">Document</span>
          </button>
          <button className="flex flex-col items-center gap-2 group">
            <div className="w-14 h-14 rounded-full bg-[#007bfc] flex items-center justify-center text-white group-hover:-translate-y-1 transition-transform shadow-md">
              <Image className="w-6 h-6" />
            </div>
            <span className="text-sm text-[#e9edef]">Photos</span>
          </button>
          <button className="flex flex-col items-center gap-2 group">
            <div className="w-14 h-14 rounded-full bg-[#ed4056] flex items-center justify-center text-white group-hover:-translate-y-1 transition-transform shadow-md">
              <Camera className="w-6 h-6" />
            </div>
            <span className="text-sm text-[#e9edef]">Camera</span>
          </button>
          <button className="flex flex-col items-center gap-2 group">
            <div className="w-14 h-14 rounded-full bg-[#009de2] flex items-center justify-center text-white group-hover:-translate-y-1 transition-transform shadow-md">
              <User className="w-6 h-6" />
            </div>
            <span className="text-sm text-[#e9edef]">Contact</span>
          </button>
          <button className="flex flex-col items-center gap-2 group">
            <div className="w-14 h-14 rounded-full bg-[#25d366] flex items-center justify-center text-white group-hover:-translate-y-1 transition-transform shadow-md">
              <MapPin className="w-6 h-6" />
            </div>
            <span className="text-sm text-[#e9edef]">Location</span>
          </button>
        </div>
      )}

      {/* Input */}
      <div className="px-4 py-3 bg-[#202c33] flex items-end gap-3 z-20 min-h-[62px]">
        <button className="p-2 text-[#8696a0] hover:text-[#e9edef] transition-colors mb-0.5">
          <Smile className="w-6 h-6" />
        </button>
        <button 
          onClick={() => setShowAttachments(!showAttachments)}
          className={cn("p-2 transition-colors mb-0.5", showAttachments ? "text-[#e9edef] bg-[#2a3942] rounded-full" : "text-[#8696a0] hover:text-[#e9edef]")}
        >
          <Paperclip className="w-6 h-6 transform -rotate-45" />
        </button>
        
        <div className="flex-1 bg-[#2a3942] rounded-lg border-none flex items-center px-4 mb-0.5">
          <textarea
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Type a message"
            className="w-full bg-transparent border-none text-[#e9edef] placeholder:text-[#8696a0] focus:ring-0 resize-none outline-none max-h-32 py-2.5 text-[15px]"
            rows={1}
            style={{ minHeight: '42px' }}
          />
        </div>
        
        {messageText.trim() ? (
          <button 
            onClick={handleSend}
            className="p-2.5 text-[#8696a0] hover:text-[#e9edef] transition-colors mb-0.5"
          >
            <Send className="w-6 h-6" />
          </button>
        ) : (
          <button className="p-2.5 text-[#8696a0] hover:text-[#e9edef] transition-colors mb-0.5">
            <Mic className="w-6 h-6" />
          </button>
        )}
      </div>
    </div>
  );
}
