import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { API_URL } from "../shared";
import "./PollResultsStyles.css";

const PollResults = () => {
  const { shareId } = useParams();
  const navigate = useNavigate();
  const [poll, setPoll] = useState(null);
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchResults();
  }, [shareId]);

  const fetchResults = async () => {
    try {
      const response = await axios.get(
        `${API_URL}/api/results/${shareId}`,
        { withCredentials: true }
      );
      setPoll(response.data.poll);
      setResults(response.data.results);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load results");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="poll-results-container">Loading...</div>;
  }

  if (error) {
    return (
      <div className="poll-results-container">
        <div className="error-message">{error}</div>
        <button onClick={() => navigate("/")} className="back-btn">
          Go Home
        </button>
      </div>
    );
  }

  if (!poll || !results) {
    return <div className="poll-results-container">No results available</div>;
  }

  return (
    <div className="poll-results-container">
      <div className="poll-results">
        <div className="results-header">
          <h1>{poll.title}</h1>
          <h2>Poll Results</h2>
          <div className="results-summary">
            <p>Total Votes: {results.totalBallots}</p>
            {results.winner && (
              <div className="winner-announcement">
                <h3>Winner</h3>
                <div className="winner-option">{results.winner.text}</div>
              </div>
            )}
          </div>
        </div>

        {results.totalBallots === 0 ? (
          <div className="no-votes-message">
            <p>No votes have been cast yet.</p>
          </div>
        ) : (
          <div className="results-content">
            {results.rounds.map((round, index) => (
              <div key={index} className="round-results">
                <h3>Round {round.round}</h3>

                <div className="vote-counts">
                  {poll.options.map((option) => {
                    const voteData = round.voteCounts[option.id];
                    return (
                      <div key={option.id} className="vote-count-item">
                        <div className="option-name">{option.text}</div>
                        <div className="vote-bar-container">
                          <div
                            className="vote-bar"
                            style={{
                              width: `${voteData.percentage}%`,
                              backgroundColor:
                                round.winner?.id === option.id
                                  ? "#27ae60"
                                  : round.eliminated?.some(
                                      (e) => e.id === option.id
                                    )
                                  ? "#e74c3c"
                                  : "#3498db",
                            }}
                          />
                          <span className="vote-count-text">
                            {voteData.votes} votes ({voteData.percentage.toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {round.eliminated && round.eliminated.length > 0 && (
                  <div className="eliminated-info">
                    <p>
                      Eliminated:{" "}
                      {round.eliminated.map((e) => e.text).join(", ")}
                    </p>
                  </div>
                )}

                {round.winner && (
                  <div className="round-winner">
                    <p>
                      <strong>{round.winner.text}</strong> wins with majority
                      support!
                    </p>
                  </div>
                )}
              </div>
            ))}

            {results.eliminated && results.eliminated.length > 0 && (
              <div className="eliminated-options">
                <h3>Eliminated Options</h3>
                <ul>
                  {results.eliminated.map((opt) => (
                    <li key={opt.id}>{opt.text}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="results-actions">
          <button onClick={() => navigate(`/poll/${shareId}`)} className="back-btn">
            Back to Poll
          </button>
          <button onClick={() => navigate("/")} className="home-btn">
            Go Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default PollResults;
