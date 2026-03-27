"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { DetailedGroupResponse } from "@/src/types/group";
import GroupChatView from "./groupChatView";

type View = "feed" | "chat";

const GroupViewContext = createContext<{
  view: View;
  setView: (v: View) => void;
}>({ view: "feed", setView: () => {} });

export const useGroupView = () => useContext(GroupViewContext);

type Props = {
  group: DetailedGroupResponse | null;
  children: ReactNode;
};

const GroupDetailClient = ({ group, children }: Props) => {
  const [view, setView] = useState<View>("feed");

  return (
    <GroupViewContext value={{ view, setView }}>
      {view === "feed" ? (
        children
      ) : (
        <div className="xl:max-w-2xl xl:w-2xl pb-20 h-full md:px-10 xl:p-0">
          <div className="rounded-2xl border bg-card mt-1 h-full flex flex-col overflow-hidden">
            {/* Chat header with back */}
            <div className="flex items-center gap-2 px-3 py-2.5 border-b shrink-0">
              <button
                className="p-1.5 rounded-lg hover:bg-accent cursor-pointer"
                onClick={() => setView("feed")}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m15 18-6-6 6-6" />
                </svg>
              </button>
              <p className="font-semibold text-sm truncate">
                Chat · {group?.name ?? "Groupe"}
              </p>
            </div>
            <div className="flex-1 overflow-hidden">
              <GroupChatView
                groupId={group?.id ?? ""}
                groupName={group?.name ?? "Groupe"}
              />
            </div>
          </div>
        </div>
      )}
    </GroupViewContext>
  );
};

export default GroupDetailClient;
