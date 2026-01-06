import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { API_URL } from "../shared";

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
    return (
      <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">
            {error}
          </div>
          <button
            onClick={() => navigate("/")}
            className="px-4 py-2 text-base font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  if (!poll || !results) {
    return (
      <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No results available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 sm:p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
              {poll.title}
            </h1>
            <h2 className="text-2xl font-semibold text-gray-700 mb-6">
              Poll Results
            </h2>
            <div className="bg-gray-50 rounded-lg p-6">
              <p className="text-lg text-gray-700 mb-4">
                Total Votes: <span className="font-semibold">{results.totalBallots}</span>
              </p>
              {results.winner && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h3 className="text-lg font-semibold text-green-700 mb-2">
                    Winner
                  </h3>
                  <div className="text-2xl font-bold text-green-700 bg-green-50 px-4 py-3 rounded-md text-center">
                    {results.winner.text}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Results Content */}
          {results.totalBallots === 0 ? (
            <div className="text-center py-12">
              <p className="text-lg text-gray-600">No votes have been cast yet.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {results.rounds.map((round, index) => (
                <div key={index} className="border-b border-gray-200 pb-8 last:border-b-0">
                  <h3 className="text-xl font-bold text-gray-900 mb-6">
                    Round {round.round}
                  </h3>

                  <div className="space-y-4 mb-4">
                    {poll.options.map((option) => {
                      const voteData = round.voteCounts[option.id];
                      const isWinner = round.winner?.id === option.id;
                      const isEliminated = round.eliminated?.some(
                        (e) => e.id === option.id
                      );
                      return (
                        <div key={option.id} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="font-medium text-gray-900">
                              {option.text}
                            </span>
                            <span className="text-sm text-gray-600">
                              {voteData.votes} votes ({voteData.percentage.toFixed(1)}%)
                            </span>
                          </div>
                          <div className="relative h-8 bg-gray-200 rounded-md overflow-hidden">
                            <div
                              className={`h-full flex items-center justify-end pr-2 transition-all duration-300 ${
                                isWinner
                                  ? "bg-green-600"
                                  : isEliminated
                                  ? "bg-red-600"
                                  : "bg-primary-600"
                              }`}
                              style={{ width: `${voteData.percentage}%` }}
                            >
                              {voteData.percentage > 10 && (
                                <span className="text-white text-sm font-medium">
                                  {voteData.percentage.toFixed(1)}%
                                </span>
                              )}
                            </div>
                            {voteData.percentage <= 10 && (
                              <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-sm text-gray-700">
                                {voteData.percentage.toFixed(1)}%
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {round.eliminated && round.eliminated.length > 0 && (
                    <div className="mt-4 p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                      <p className="text-sm text-yellow-800">
                        <span className="font-semibold">Eliminated:</span>{" "}
                        {round.eliminated.map((e) => e.text).join(", ")}
                      </p>
                    </div>
                  )}

                  {round.winner && (
                    <div className="mt-4 p-4 bg-green-50 border-l-4 border-green-500 rounded">
                      <p className="text-green-800">
                        <span className="font-bold">{round.winner.text}</span> wins
                        with majority support!
                      </p>
                    </div>
                  )}
                </div>
              ))}

              {results.eliminated && results.eliminated.length > 0 && (
                <div className="mt-8 p-6 bg-gray-50 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Eliminated Options
                  </h3>
                  <ul className="space-y-2">
                    {results.eliminated.map((opt) => (
                      <li key={opt.id} className="text-gray-700 border-b border-gray-200 pb-2 last:border-b-0">
                        {opt.text}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="mt-8 pt-6 border-t border-gray-200 flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate(`/poll/${shareId}`)}
              className="px-6 py-2 text-base font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md transition-colors"
            >
              Back to Poll
            </button>
            <button
              onClick={() => navigate("/")}
              className="px-6 py-2 text-base font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PollResults;
