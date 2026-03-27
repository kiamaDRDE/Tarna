"use client";

import { MessageCircle } from "lucide-react";
import { Button } from "../ui/button";
import { useGroupView } from "./groupDetailClient";

const GroupChatButton = () => {
  const { setView } = useGroupView();

  return (
    <Button
      variant="ghost"
      size="sm"
      className="gap-1.5 cursor-pointer rounded-lg h-8"
      onClick={() => setView("chat")}
    >
      <MessageCircle className="size-3.5" />
    </Button>
  );
};

export default GroupChatButton;
