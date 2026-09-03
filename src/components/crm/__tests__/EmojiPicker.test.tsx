import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EmojiPicker } from "../EmojiPicker";

describe("EmojiPicker", () => {
  it("abre o popover e dispara onSelect com o emoji clicado", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<EmojiPicker onSelect={onSelect} />);

    await user.click(screen.getByRole("button", { name: /inserir emoji/i }));
    const option = await screen.findByRole("option", { name: "😀" });
    await user.click(option);

    expect(onSelect).toHaveBeenCalledWith("😀");
  });
});
