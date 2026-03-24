"use client";

import React, { useState } from "react";
import { User, Phone, Tag as TagIcon, MessageSquare, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ContactDetails() {
  const [marketingOptIn, setMarketingOptIn] = useState(true);
  const [tags, setTags] = useState(["Hot Lead", "Family Visa"]);
  const [customParams, setCustomParams] = useState([
    { key: "Source", value: "Facebook Ads" },
    { key: "Interest", value: "Real Estate" },
  ]);

  return (
    <div className="flex flex-col h-full w-[350px] bg-[#111b21] border-l border-[#222d34] overflow-y-auto flex-shrink-0">
      {/* Header Info */}
      <div className="p-6 border-b border-[#222d34] flex flex-col items-center justify-center text-center bg-[#111b21] pb-6">
        <div className="w-[180px] h-[180px] bg-[#607d8b] rounded-full flex items-center justify-center text-[#e9edef] text-5xl font-medium mb-4 overflow-hidden shadow-sm">
          JD
        </div>
        <h3 className="text-[22px] font-medium text-[#e9edef]">John Doe</h3>
        <p className="text-[15px] text-[#8696a0] mt-1 flex items-center justify-center gap-2">
          <Phone className="w-4 h-4" /> +1 234 567 890
        </p>
      </div>

      <div className="flex flex-col flex-1 divide-y divide-[#222d34]">
        {/* Contact info card style section */}
        <div className="p-5 bg-[#111b21]">
          <h4 className="text-[14px] text-[#8696a0] mb-3">About and phone number</h4>
          <div className="space-y-4">
            <div>
              <p className="text-[16px] text-[#e9edef]">Available</p>
              <p className="text-[14px] text-[#8696a0]">About</p>
            </div>
          </div>
        </div>

        <div className="p-5 bg-[#111b21] space-y-6">
          {/* Marketing Opt-In */}
          <div className="flex items-center justify-between">
            <span className="text-[16px] text-[#e9edef]">Marketing Opt-In</span>
            <button
              onClick={() => setMarketingOptIn(!marketingOptIn)}
              className={cn(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none",
                marketingOptIn ? "bg-[#00a884]" : "bg-[#8696a0]"
              )}
            >
              <span
                className={cn(
                  "inline-block h-4 w-4 transform rounded-full bg-[#111b21] transition-transform",
                  marketingOptIn ? "translate-x-6" : "translate-x-1"
                )}
              />
            </button>
          </div>

          {/* Tags */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h4 className="text-[15px] text-[#8696a0] flex items-center gap-2">
                <TagIcon className="w-4 h-4" /> Tags
              </h4>
              <button className="text-[#8696a0] hover:text-[#e9edef] transition-colors">
                <Plus className="w-5 h-5" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1.5 bg-[#202c33] text-[#e9edef] text-[13px] rounded-full flex items-center gap-1.5 hover:bg-[#2a3942] transition-colors"
                >
                  {tag}
                  <X className="w-3.5 h-3.5 cursor-pointer text-[#8696a0] hover:text-[#e9edef]" />
                </span>
              ))}
            </div>
          </div>

          {/* Custom Parameters */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h4 className="text-[15px] text-[#8696a0] flex items-center gap-2">
                <User className="w-4 h-4" /> Custom Parameters
              </h4>
              <button className="text-[#8696a0] hover:text-[#e9edef] transition-colors">
                <Plus className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2">
              {customParams.map((param, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={param.key}
                    readOnly
                    className="w-1/2 px-3 py-2 bg-[#202c33] border-none rounded-lg text-[13px] text-[#8696a0] focus:ring-0 outline-none"
                  />
                  <input
                    type="text"
                    value={param.value}
                    readOnly
                    className="w-1/2 px-3 py-2 bg-[#202c33] border-none rounded-lg text-[13px] text-[#e9edef] focus:ring-0 outline-none"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Comments */}
          <div className="flex flex-col gap-3 pt-2">
            <h4 className="text-[15px] text-[#8696a0] flex items-center gap-2">
              <MessageSquare className="w-4 h-4" /> Comments
            </h4>
            <textarea
              placeholder="Add a comment..."
              className="w-full p-3 bg-[#202c33] border-none rounded-lg text-[14px] text-[#e9edef] placeholder:text-[#8696a0] focus:ring-1 focus:ring-[#00a884] outline-none resize-none h-24"
            />
            <button className="w-full py-2.5 bg-[#00a884] text-[#111b21] text-[14px] font-medium rounded-full hover:bg-[#06cf9c] transition-colors shadow-sm">
              Add Comment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
