import { useState } from "react";
import { EmojiPicker } from "@/components/crm/EmojiPicker";
export default function DevEmojiCheck() {
  const [v, setV] = useState("");
  return <div className="p-10"><input data-testid="out" value={v} readOnly /><EmojiPicker onSelect={(e) => setV((p) => p + e)} /></div>;
}
