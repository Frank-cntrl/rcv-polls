import React, { useState, useEffect } from "react";
import "./HomeStyles.css";

const Home = ({ user }) => {
  const [polls, setPolls] = useState([]);

  // Mock data for now - will be replaced with API call
  const mockPolls = [
    {
      id: 1,
      name: "Best Programming Language",
      image: "https://via.placeholder.com/300x200/4CAF50/white?text=Programming",
      status: "open",
      createdAt: "2026-01-03T10:30:00Z",
      responses: 15
    },
    {
      id: 2,
      name: "Favorite Coffee Shop",
      image: "https://via.placeholder.com/300x200/FF9800/white?text=Coffee",
      status: "pending",
      createdAt: "2026-01-02T14:20:00Z",
      responses: 3
    },
    {
      id: 3,
      name: "Team Building Activity",
      image: "https://via.placeholder.com/300x200/2196F3/white?text=Team+Building",
      status: "closed",
      createdAt: "2026-01-01T09:15:00Z",
      responses: 42
    },
    {
      id: 4,
      name: "Weekend Plans",
      image: "https://via.placeholder.com/300x200/9C27B0/white?text=Weekend",
      status: "open",
      createdAt: "2026-01-04T16:45:00Z",
      responses: 8
    }
  ];

  useEffect(() => {
    // TODO: Replace with actual API call to fetch user's polls
    setPolls(mockPolls);
  }, []);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'open':
        return '🟢'; // Green circle for open
      case 'pending':
        return '🟡'; // Yellow circle for pending
      case 'closed':
        return '🔴'; // Red circle for closed
      default:
        return '⚪'; // White circle for unknown
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusText = (status) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  if (!user) {
    return (
      <div className="home">
        <div className="welcome-section">
          <h1>Welcome to RCV Polls!</h1>
          <p>Create and manage ranked choice voting polls with ease.</p>
          <p>Please log in to view your polls.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="home">
      <div className="header-section">
        <h1>My Polls</h1>
        <button className="create-poll-btn">+ Create New Poll</button>
      </div>
      
      {polls.length === 0 ? (
        <div className="empty-state">
          <h2>No polls yet!</h2>
          <p>Create your first ranked choice voting poll to get started.</p>
          <button className="create-poll-btn primary">Create Your First Poll</button>
        </div>
      ) : (
        <div className="polls-grid">
          {polls.map((poll) => (
            <div key={poll.id} className="poll-card">
              <div className="poll-image">
                <img src={poll.image} alt={poll.name} />
                <div className="poll-status">
                  <span className="status-icon">{getStatusIcon(poll.status)}</span>
                  <span className="status-text">{getStatusText(poll.status)}</span>
                </div>
              </div>
              <div className="poll-info">
                <h3 className="poll-name">{poll.name}</h3>
                <div className="poll-meta">
                  <span className="poll-date">{formatDate(poll.createdAt)}</span>
                  <span className="poll-responses">{poll.responses} responses</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Home;
