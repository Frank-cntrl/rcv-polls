import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { API_URL, SOCKETS_URL, NODE_ENV } from "../shared";
import { io } from "socket.io-client";

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
  const [voters, setVoters] = useState([]);
  const [showVoters, setShowVoters] = useState(false);
  const [loadingVoters, setLoadingVoters] = useState(false);

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

  const fetchVoters = async () => {
    if (!poll || !isCreator || poll.isAnonymous) return;

    setLoadingVoters(true);
    try {
      const response = await axios.get(
        `${API_URL}/api/polls/${poll.id}/voters`,
        { withCredentials: true }
      );
      setVoters(response.data.voters);
      setShowVoters(true);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load voters");
    } finally {
      setLoadingVoters(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error && !poll) {
    return (
      <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {error}
          </div>
        </div>
      </div>
    );
  }

  if (!poll) {
    return (
      <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Poll not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 sm:p-8">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
              {poll.title}
            </h1>
            {poll.description && (
              <p className="text-lg text-gray-600 mb-4">{poll.description}</p>
            )}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2">
                <span
                  className={`px-3 py-1 text-sm font-medium rounded-full ${
                    poll.isClosed
                      ? "bg-red-100 text-red-800"
                      : "bg-green-100 text-green-800"
                  }`}
                >
                  {poll.isClosed ? "Closed" : "Open"}
                </span>
                {!poll.isClosed && voteCount > 0 && (
                  <span className="text-sm text-gray-600">
                    • {voteCount} vote{voteCount !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
              {isCreator && (
                <div className="flex gap-2 flex-wrap">
                  {!poll.isClosed && (
                    <button
                      onClick={handleClosePoll}
                      className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
                    >
                      Close Poll
                    </button>
                  )}
                  {!poll.isAnonymous && (
                    <button
                      onClick={fetchVoters}
                      disabled={loadingVoters}
                      className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-md transition-colors disabled:bg-gray-400"
                    >
                      {loadingVoters ? "Loading..." : "View Voters"}
                    </button>
                  )}
                  <button
                    onClick={handleViewResults}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md transition-colors"
                  >
                    View Results
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Closed Poll Message */}
          {poll.isClosed ? (
            <div className="bg-gray-50 rounded-lg p-6 text-center mb-6">
              <p className="text-gray-700 mb-4">This poll is closed. Results are available.</p>
              <button
                onClick={handleViewResults}
                className="px-6 py-2 text-base font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md transition-colors"
              >
                View Results
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                  {error}
                </div>
              )}

              <div>
                <label
                  htmlFor="voterName"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Your Name {!poll.isAnonymous && !user ? "(required)" : "(optional)"}
                </label>
                <input
                  type="text"
                  id="voterName"
                  value={voterName}
                  onChange={(e) => setVoterName(e.target.value)}
                  placeholder="Enter your name"
                  required={!poll.isAnonymous && !user}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                />
                {!poll.isAnonymous && !user && (
                  <p className="mt-1 text-xs text-gray-500">
                    Your name is required for non-anonymous polls
                  </p>
                )}
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Rank the options (1 = first choice, 2 = second choice, etc.)
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Click on the rank number to assign it to an option. Click again to
                  clear.
                </p>

                <div className="space-y-4">
                  {poll.options.map((option) => (
                    <div
                      key={option.id}
                      className="p-4 border-2 border-gray-200 rounded-lg bg-gray-50"
                    >
                      <div className="font-semibold text-gray-900 mb-3 text-lg">
                        {option.text}
                      </div>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
                          .slice(0, poll.options.length)
                          .map((rank) => (
                            <button
                              key={rank}
                              type="button"
                              className={`w-10 h-10 rounded-md font-medium transition-colors ${
                                rankings[option.id] === rank
                                  ? "bg-primary-600 text-white"
                                  : "bg-white border-2 border-gray-300 text-gray-700 hover:border-primary-500 hover:bg-primary-50"
                              }`}
                              onClick={() => handleRankChange(option.id, rank)}
                            >
                              {rank}
                            </button>
                          ))}
                      </div>
                      {rankings[option.id] && (
                        <div className="text-sm text-primary-600 font-medium">
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
                className="w-full px-4 py-3 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? "Submitting..." : "Submit Vote"}
              </button>
            </form>
          )}

          {/* Share Section */}
          {isCreator && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Share this poll
              </h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}/poll/${shareId}`}
                  onClick={(e) => e.target.select()}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `${window.location.origin}/poll/${shareId}`
                    );
                    alert("Link copied to clipboard!");
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md transition-colors"
                >
                  Copy Link
                </button>
              </div>
            </div>
          )}

          {/* Voter List (Non-Anonymous Polls Only) */}
          {isCreator && !poll.isAnonymous && showVoters && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Voters ({voters.length})
                </h3>
                <button
                  onClick={() => setShowVoters(false)}
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Hide
                </button>
              </div>
              {voters.length === 0 ? (
                <p className="text-gray-600">No votes yet.</p>
              ) : (
                <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                  <div className="space-y-2">
                    {voters.map((voter) => (
                      <div
                        key={voter.id}
                        className="bg-white p-3 rounded-md border border-gray-200"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            {voter.isLoggedIn ? (
                              <div>
                                <span className="font-medium text-gray-900">
                                  {voter.username}
                                </span>
                                {voter.email && (
                                  <span className="text-sm text-gray-500 ml-2">
                                    ({voter.email})
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div>
                                <span className="font-medium text-gray-900">
                                  {voter.voterName || "Anonymous Voter"}
                                </span>
                                <span className="text-xs text-gray-500 ml-2">
                                  (Not logged in)
                                </span>
                              </div>
                            )}
                          </div>
                          <span className="text-xs text-gray-500">
                            {new Date(voter.submittedAt).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PollView;
