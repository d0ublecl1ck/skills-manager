import { invoke } from "@tauri-apps/api/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import App from "./App";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

describe("App", () => {
  it("renders and can call greet", async () => {
    vi.mocked(invoke).mockResolvedValueOnce("Hello, Alice!");

    render(<App />);
    const user = userEvent.setup();

    expect(
      screen.getByRole("heading", { name: "Tauri + React" }),
    ).toBeInTheDocument();

    const input = screen.getByPlaceholderText("Enter a name...");
    const button = screen.getByRole("button", { name: "Greet" });

    expect(button).toBeDisabled();

    const firstAccordionTrigger = screen.getByRole("button", {
      name: "What is shadcn/ui?",
    });
    expect(firstAccordionTrigger).toHaveAttribute("aria-expanded", "false");
    await user.click(firstAccordionTrigger);
    expect(firstAccordionTrigger).toHaveAttribute("aria-expanded", "true");

    await user.type(input, "Alice");
    expect(button).toBeEnabled();

    await user.click(button);

    expect(invoke).toHaveBeenCalledWith("greet", { name: "Alice" });
    expect(await screen.findByText("Hello, Alice!")).toBeInTheDocument();
  });
});
