import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { API_URL } from "../shared";
import "./HomeStyles.css";

const Home = ({ user }) => {
  const [polls, setPolls] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchMyPolls();
    }
  }, [user]);

  const fetchMyPolls = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/polls/my-polls`, {
        withCredentials: true,
      });
      setPolls(response.data.polls);
    } catch (error) {
      console.error("Error fetching polls:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="home">
      <div className="home-header">
        <h1>Ranked Choice Voting Polls</h1>
        <p>Create polls and let voters rank their choices!</p>
      </div>

      {user ? (
        <div className="user-home">
          <div className="home-actions">
            <Link to="/create-poll" className="create-poll-link">
              + Create New Poll
            </Link>
          </div>

          <div className="my-polls-section">
            <h2>My Polls</h2>
            {isLoading ? (
              <p>Loading...</p>
            ) : polls.length === 0 ? (
              <div className="no-polls">
                <p>You haven't created any polls yet.</p>
                <Link to="/create-poll" className="create-first-poll">
                  Create your first poll
                </Link>
              </div>
            ) : (
              <div className="polls-list">
                {polls.map((poll) => (
                  <div key={poll.id} className="poll-card">
                    <div className="poll-card-header">
                      <h3>{poll.title}</h3>
                      <span
                        className={`poll-status ${poll.isClosed ? "closed" : "open"}`}
                      >
                        {poll.isClosed ? "Closed" : "Open"}
                      </span>
                    </div>
                    {poll.description && (
                      <p className="poll-description">{poll.description}</p>
                    )}
                    <div className="poll-card-footer">
                      <Link
                        to={`/poll/${poll.shareId}`}
                        className="view-poll-link"
                      >
                        View Poll
                      </Link>
                      {poll.isClosed && (
                        <Link
                          to={`/poll/${poll.shareId}/results`}
                          className="view-results-link"
                        >
                          View Results
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="guest-home">
          <div className="welcome-message">
            <h2>Welcome!</h2>
            <p>Create an account to start creating ranked choice voting polls.</p>
            <div className="guest-actions">
              <Link to="/signup" className="signup-link">
                Sign Up
              </Link>
              <Link to="/login" className="login-link">
                Login
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
