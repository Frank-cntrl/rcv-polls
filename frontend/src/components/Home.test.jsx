import React from "react";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import Home from "./Home";
import axios from "axios";

jest.mock("axios");

describe("Home", () => {
  beforeEach(() => {
    axios.get.mockClear();
  });

  it("renders welcome message for guests", () => {
    render(
      <BrowserRouter>
        <Home user={null} />
      </BrowserRouter>
    );

    expect(
      screen.getByText("Ranked Choice Voting Polls")
    ).toBeInTheDocument();
    expect(screen.getByText("Welcome!")).toBeInTheDocument();
  });

  it("renders create poll link for authenticated users", async () => {
    axios.get.mockResolvedValue({ data: { polls: [] } });

    render(
      <BrowserRouter>
        <Home user={{ id: 1, username: "testuser" }} />
      </BrowserRouter>
    );

    expect(await screen.findByText("Create New Poll")).toBeInTheDocument();
  });

  it("displays user's polls when authenticated", async () => {
    const mockPolls = [
      {
        id: 1,
        title: "Test Poll",
        description: "Test Description",
        shareId: "abc123",
        isClosed: false,
      },
    ];

    axios.get.mockResolvedValue({ data: { polls: mockPolls } });

    render(
      <BrowserRouter>
        <Home user={{ id: 1, username: "testuser" }} />
      </BrowserRouter>
    );

    expect(await screen.findByText("Test Poll")).toBeInTheDocument();
    expect(await screen.findByText("Test Description")).toBeInTheDocument();
  });
});
