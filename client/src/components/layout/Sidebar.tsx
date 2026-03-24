"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  MessageSquare,
  Users,
  Send,
  FileText,
  Bot,
  ShoppingBag,
  Share2,
  Instagram,
  BarChart3,
  Settings,
  CreditCard,
  Layers,
  PhoneCall,
} from "lucide-react";

const sidebarItems = [
  { icon: MessageSquare, label: "Chat", href: "/chat" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-screen w-64 bg-white border-r border-gray-200 shadow-sm fixed left-0 top-0 overflow-y-auto">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-emerald-600 flex items-center gap-2">
          <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
            <MessageSquare className="text-white w-5 h-5" />
          </div>
          CRM
        </h1>
      </div>
      <nav className="flex-1 px-4 space-y-1 pb-4">
        {sidebarItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-emerald-50 text-emerald-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <item.icon className={cn("w-5 h-5", isActive ? "text-emerald-600" : "text-gray-400")} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
