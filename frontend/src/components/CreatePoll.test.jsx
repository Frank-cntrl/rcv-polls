import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import CreatePoll from "./CreatePoll";
import axios from "axios";
import { useNavigate } from "react-router-dom";

jest.mock("axios");
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: jest.fn(),
}));

describe("CreatePoll", () => {
  const mockNavigate = jest.fn();

  beforeEach(() => {
    useNavigate.mockReturnValue(mockNavigate);
    axios.post.mockClear();
    mockNavigate.mockClear();
  });

  it("renders create poll form for authenticated user", () => {
    render(
      <BrowserRouter>
        <CreatePoll user={{ id: 1, username: "testuser" }} />
      </BrowserRouter>
    );

    expect(screen.getByText("Create a New Poll")).toBeInTheDocument();
    expect(screen.getByLabelText("Poll Title *")).toBeInTheDocument();
  });

  it("shows login message for unauthenticated user", () => {
    render(
      <BrowserRouter>
        <CreatePoll user={null} />
      </BrowserRouter>
    );

    expect(
      screen.getByText("Please log in to create a poll.")
    ).toBeInTheDocument();
  });

  it("allows adding and removing options", () => {
    render(
      <BrowserRouter>
        <CreatePoll user={{ id: 1, username: "testuser" }} />
      </BrowserRouter>
    );

    const addButton = screen.getByText("+ Add Option");
    fireEvent.click(addButton);

    const optionInputs = screen.getAllByPlaceholderText(/Option \d+/);
    expect(optionInputs.length).toBeGreaterThan(2);

    const removeButtons = screen.getAllByText("Remove");
    if (removeButtons.length > 0) {
      fireEvent.click(removeButtons[0]);
    }
  });

  it("validates required fields", async () => {
    render(
      <BrowserRouter>
        <CreatePoll user={{ id: 1, username: "testuser" }} />
      </BrowserRouter>
    );

    const submitButton = screen.getByText("Create Poll");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Title is required")).toBeInTheDocument();
    });
  });

  it("submits poll successfully", async () => {
    const mockPoll = {
      id: 1,
      title: "Test Poll",
      shareId: "abc123",
    };

    axios.post.mockResolvedValue({ data: { poll: mockPoll } });

    render(
      <BrowserRouter>
        <CreatePoll user={{ id: 1, username: "testuser" }} />
      </BrowserRouter>
    );

    fireEvent.change(screen.getByLabelText("Poll Title *"), {
      target: { value: "Test Poll" },
    });

    const optionInputs = screen.getAllByPlaceholderText(/Option \d+/);
    fireEvent.change(optionInputs[0], { target: { value: "Option 1" } });
    fireEvent.change(optionInputs[1], { target: { value: "Option 2" } });

    fireEvent.click(screen.getByText("Create Poll"));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining("/api/polls"),
        expect.objectContaining({
          title: "Test Poll",
          options: ["Option 1", "Option 2"],
        }),
        expect.any(Object)
      );
    });
  });
});
