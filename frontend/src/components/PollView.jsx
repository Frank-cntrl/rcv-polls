import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { API_URL, SOCKETS_URL, NODE_ENV } from "../shared";
import { io } from "socket.io-client";
import "./PollViewStyles.css";

const PollView = ({ user }) => {
  const { shareId } = useParams();
  const navigate = useNavigate();
  const [poll, setPoll] = useState(null);
  const [rankings, setRankings] = useState({});
  const [voterName, setVoterName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [isCreator, setIsCreator] = useState(false);
  const [voteCount, setVoteCount] = useState(0);

  useEffect(() => {
    fetchPoll();
  }, [shareId]);

  useEffect(() => {
    if (!shareId) return;

    const socket = io(SOCKETS_URL, {
      withCredentials: NODE_ENV === "production",
    });

    socket.on("connect", () => {
      socket.emit("join-poll", shareId);
    });

    socket.on("new-vote", (data) => {
      setVoteCount(data.voteCount);
    });

    socket.on("poll-closed", () => {
      fetchPoll();
    });

    return () => {
      socket.emit("leave-poll", shareId);
      socket.disconnect();
    };
  }, [shareId]);

  const fetchPoll = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/polls/share/${shareId}`);
      setPoll(response.data.poll);
      setVoteCount(response.data.voteCount || 0);

      // Check if user is the creator
      if (user && user.id === response.data.poll.creator.id) {
        setIsCreator(true);
      }

      // Initialize rankings
      const initialRankings = {};
      response.data.poll.options.forEach((option) => {
        initialRankings[option.id] = null;
      });
      setRankings(initialRankings);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load poll");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRankChange = (optionId, rank) => {
    const newRankings = { ...rankings };

    // If this rank is already assigned to another option, clear it
    Object.keys(newRankings).forEach((id) => {
      if (newRankings[id] === rank && id !== optionId) {
        newRankings[id] = null;
      }
    });

    // If clearing this option's rank
    if (newRankings[optionId] === rank) {
      newRankings[optionId] = null;
    } else {
      newRankings[optionId] = rank;
    }

    setRankings(newRankings);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (poll.isClosed) {
      setError("This poll is closed");
      return;
    }

    // Validate that all options are ranked
    const rankedOptions = Object.values(rankings).filter((r) => r !== null);
    if (rankedOptions.length !== poll.options.length) {
      setError("Please rank all options");
      return;
    }

    // Convert rankings to array format
    const rankingsArray = Object.entries(rankings)
      .map(([pollOptionId, rank]) => ({
        pollOptionId: parseInt(pollOptionId),
        rank,
      }))
      .filter((r) => r.rank !== null)
      .sort((a, b) => a.rank - b.rank);

    setIsSubmitting(true);
    setError(null);

    try {
      await axios.post(
        `${API_URL}/api/votes/${shareId}`,
        {
          rankings: rankingsArray,
          voterName: voterName.trim() || null,
        },
        { withCredentials: true }
      );

      alert("Your vote has been submitted successfully!");
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to submit vote");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClosePoll = async () => {
    if (!window.confirm("Are you sure you want to close this poll? This action cannot be undone.")) {
      return;
    }

    try {
      await axios.post(
        `${API_URL}/api/polls/${poll.id}/close`,
        {},
        { withCredentials: true }
      );
      fetchPoll();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to close poll");
    }
  };

  const handleViewResults = () => {
    navigate(`/poll/${shareId}/results`);
  };

  if (isLoading) {
    return <div className="poll-view-container">Loading...</div>;
  }

  if (error && !poll) {
    return (
      <div className="poll-view-container">
        <div className="error-message">{error}</div>
      </div>
    );
  }

  if (!poll) {
    return <div className="poll-view-container">Poll not found</div>;
  }

  return (
    <div className="poll-view-container">
      <div className="poll-view">
        <div className="poll-header">
          <h1>{poll.title}</h1>
          {poll.description && <p className="poll-description">{poll.description}</p>}
          <div className="poll-meta">
            <div>
              <span className={`poll-status ${poll.isClosed ? "closed" : "open"}`}>
                {poll.isClosed ? "Closed" : "Open"}
              </span>
              {!poll.isClosed && voteCount > 0 && (
                <span className="vote-count"> • {voteCount} vote{voteCount !== 1 ? 's' : ''}</span>
              )}
            </div>
            {isCreator && (
              <div className="creator-actions">
                {!poll.isClosed && (
                  <button onClick={handleClosePoll} className="close-poll-btn">
                    Close Poll
                  </button>
                )}
                <button onClick={handleViewResults} className="view-results-btn">
                  View Results
                </button>
              </div>
            )}
          </div>
        </div>

        {poll.isClosed ? (
          <div className="poll-closed-message">
            <p>This poll is closed. Results are available.</p>
            <button onClick={handleViewResults} className="view-results-btn">
              View Results
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="voting-form">
            {error && <div className="error-message">{error}</div>}

            <div className="form-group">
              <label htmlFor="voterName">Your Name (optional)</label>
              <input
                type="text"
                id="voterName"
                value={voterName}
                onChange={(e) => setVoterName(e.target.value)}
                placeholder="Enter your name"
              />
            </div>

            <div className="ranking-section">
              <h3>Rank the options (1 = first choice, 2 = second choice, etc.)</h3>
              <p className="instruction-text">
                Click on the rank number to assign it to an option. Click again to clear.
              </p>

              <div className="options-list">
                {poll.options.map((option) => (
                  <div key={option.id} className="option-item">
                    <div className="option-text">{option.text}</div>
                    <div className="rank-selector">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
                        .slice(0, poll.options.length)
                        .map((rank) => (
                          <button
                            key={rank}
                            type="button"
                            className={`rank-btn ${
                              rankings[option.id] === rank ? "selected" : ""
                            }`}
                            onClick={() => handleRankChange(option.id, rank)}
                          >
                            {rank}
                          </button>
                        ))}
                    </div>
                    {rankings[option.id] && (
                      <div className="selected-rank">
                        Rank: {rankings[option.id]}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="submit-vote-btn"
            >
              {isSubmitting ? "Submitting..." : "Submit Vote"}
            </button>
          </form>
        )}

        {isCreator && (
          <div className="share-section">
            <h3>Share this poll</h3>
            <div className="share-link">
              <input
                type="text"
                readOnly
                value={`${window.location.origin}/poll/${shareId}`}
                onClick={(e) => e.target.select()}
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(
                    `${window.location.origin}/poll/${shareId}`
                  );
                  alert("Link copied to clipboard!");
                }}
                className="copy-btn"
              >
                Copy Link
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PollView;
