import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Loader2, Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const THEME_STORAGE_KEY = "theme";

type Theme = "light" | "dark";

function getInitialTheme(): Theme {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ? "dark" : "light";
}

function App() {
  const [name, setName] = useState("");
  const [greetMsg, setGreetMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "light";
    return getInitialTheme();
  });

  async function greet() {
    try {
      setIsLoading(true);
      setGreetMsg(await invoke<string>("greet", { name }));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-6">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">Tauri + React</h1>
          <p className="text-sm text-muted-foreground">
            shadcn/ui + Tailwind + lucide-react
          </p>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Toggle theme"
          onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
        >
          {theme === "dark" ? <Sun /> : <Moon />}
        </Button>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 px-6 pb-10">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Greeting</CardTitle>
            <CardDescription>Call a Rust command via Tauri.</CardDescription>
          </CardHeader>

          <CardContent>
            <form
              className="grid gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                void greet();
              }}
            >
              <Input
                id="greet-input"
                value={name}
                onChange={(e) => setName(e.currentTarget.value)}
                placeholder="Enter a name..."
              />
              <Button type="submit" disabled={isLoading || !name.trim()}>
                {isLoading ? <Loader2 className="animate-spin" /> : null}
                {isLoading ? "Greeting..." : "Greet"}
              </Button>
            </form>

            <div className="mt-6">
              <h2 className="mb-2 text-sm font-medium">FAQ</h2>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                  <AccordionTrigger>What is shadcn/ui?</AccordionTrigger>
                  <AccordionContent>
                    It ships components as source code, so you can customize them freely.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2">
                  <AccordionTrigger>Where are components stored?</AccordionTrigger>
                  <AccordionContent>
                    In <code className="font-mono text-xs">src/components/ui</code>.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-3">
                  <AccordionTrigger>How do I add more components?</AccordionTrigger>
                  <AccordionContent>
                    Run{" "}
                    <code className="font-mono text-xs">
                      bunx --bun shadcn@latest add &lt;component&gt;
                    </code>
                    .
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </CardContent>

          <CardFooter>
            <p className="text-sm text-muted-foreground">{greetMsg}</p>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}

export default App;
