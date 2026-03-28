import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ToolInvocationBadge } from "../ToolInvocationBadge";

afterEach(() => {
  cleanup();
});

// --- str_replace_editor labels ---

test("shows 'Creating {file}' for str_replace_editor create command", () => {
  render(
    <ToolInvocationBadge
      toolName="str_replace_editor"
      args={{ command: "create", path: "/src/components/App.jsx" }}
      state="result"
      result="Success"
    />
  );
  expect(screen.getByText("Creating App.jsx")).toBeDefined();
});

test("shows 'Editing {file}' for str_replace_editor str_replace command", () => {
  render(
    <ToolInvocationBadge
      toolName="str_replace_editor"
      args={{ command: "str_replace", path: "/src/components/Button.tsx" }}
      state="result"
      result="Success"
    />
  );
  expect(screen.getByText("Editing Button.tsx")).toBeDefined();
});

test("shows 'Editing {file}' for str_replace_editor insert command", () => {
  render(
    <ToolInvocationBadge
      toolName="str_replace_editor"
      args={{ command: "insert", path: "/src/components/Component.tsx" }}
      state="result"
      result="Success"
    />
  );
  expect(screen.getByText("Editing Component.tsx")).toBeDefined();
});

test("shows 'Reading {file}' for str_replace_editor view command", () => {
  render(
    <ToolInvocationBadge
      toolName="str_replace_editor"
      args={{ command: "view", path: "/src/lib/index.ts" }}
      state="result"
      result="Success"
    />
  );
  expect(screen.getByText("Reading index.ts")).toBeDefined();
});

test("shows 'Undoing edit in {file}' for str_replace_editor undo_edit command", () => {
  render(
    <ToolInvocationBadge
      toolName="str_replace_editor"
      args={{ command: "undo_edit", path: "/src/components/App.jsx" }}
      state="result"
      result="Success"
    />
  );
  expect(screen.getByText("Undoing edit in App.jsx")).toBeDefined();
});

// --- file_manager labels ---

test("shows 'Renaming {file}' for file_manager rename command", () => {
  render(
    <ToolInvocationBadge
      toolName="file_manager"
      args={{ command: "rename", path: "/src/components/old.tsx", new_path: "/src/components/new.tsx" }}
      state="result"
      result={{ success: true }}
    />
  );
  expect(screen.getByText("Renaming old.tsx")).toBeDefined();
});

test("shows 'Deleting {file}' for file_manager delete command", () => {
  render(
    <ToolInvocationBadge
      toolName="file_manager"
      args={{ command: "delete", path: "/src/components/App.tsx" }}
      state="result"
      result={{ success: true }}
    />
  );
  expect(screen.getByText("Deleting App.tsx")).toBeDefined();
});

// --- fallback ---

test("falls back to raw tool name when tool is unknown", () => {
  render(
    <ToolInvocationBadge
      toolName="some_unknown_tool"
      args={{}}
      state="result"
      result="done"
    />
  );
  expect(screen.getByText("some_unknown_tool")).toBeDefined();
});

test("falls back to raw tool name when args have no path", () => {
  render(
    <ToolInvocationBadge
      toolName="str_replace_editor"
      args={{ command: "create" }}
      state="result"
      result="Success"
    />
  );
  expect(screen.getByText("str_replace_editor")).toBeDefined();
});

// --- state: pending vs result ---

test("shows green dot when state is result and result is present", () => {
  const { container } = render(
    <ToolInvocationBadge
      toolName="str_replace_editor"
      args={{ command: "create", path: "/src/App.jsx" }}
      state="result"
      result="Success"
    />
  );
  expect(container.querySelector(".bg-emerald-500")).toBeDefined();
  expect(container.querySelector(".animate-spin")).toBeNull();
});

test("shows spinner when state is call (pending)", () => {
  const { container } = render(
    <ToolInvocationBadge
      toolName="str_replace_editor"
      args={{ command: "create", path: "/src/App.jsx" }}
      state="call"
      result={undefined}
    />
  );
  expect(container.querySelector(".animate-spin")).toBeDefined();
  expect(container.querySelector(".bg-emerald-500")).toBeNull();
});

test("shows spinner when state is result but result is undefined", () => {
  const { container } = render(
    <ToolInvocationBadge
      toolName="str_replace_editor"
      args={{ command: "create", path: "/src/App.jsx" }}
      state="result"
      result={undefined}
    />
  );
  expect(container.querySelector(".animate-spin")).toBeDefined();
  expect(container.querySelector(".bg-emerald-500")).toBeNull();
});
