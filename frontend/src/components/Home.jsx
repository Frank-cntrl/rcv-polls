import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { API_URL } from "../shared";

const Home = ({ user }) => {
  const [activeTab, setActiveTab] = useState("my-polls");
  const [myPolls, setMyPolls] = useState([]);
  const [allPolls, setAllPolls] = useState([]);
  const [isLoadingMy, setIsLoadingMy] = useState(false);
  const [isLoadingAll, setIsLoadingAll] = useState(false);

  useEffect(() => {
    if (user) {
      fetchMyPolls();
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === "all-polls") {
      fetchAllPolls();
    }
  }, [activeTab]);

  const fetchMyPolls = async () => {
    if (!user) return;
    setIsLoadingMy(true);
    try {
      const response = await axios.get(`${API_URL}/api/polls/my-polls`, {
        withCredentials: true,
      });
      setMyPolls(response.data.polls);
    } catch (error) {
      console.error("Error fetching my polls:", error);
    } finally {
      setIsLoadingMy(false);
    }
  };

  const fetchAllPolls = async () => {
    setIsLoadingAll(true);
    try {
      const response = await axios.get(`${API_URL}/api/polls?type=all`, {
        withCredentials: true,
      });
      setAllPolls(response.data.polls);
    } catch (error) {
      console.error("Error fetching all polls:", error);
    } finally {
      setIsLoadingAll(false);
    }
  };

  const TabButton = ({ tabId, label, isActive, onClick }) => (
    <button
      onClick={() => onClick(tabId)}
      className={`px-6 py-3 font-medium text-sm rounded-lg transition-colors ${
        isActive
          ? "bg-primary-600 text-white shadow-md"
          : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
      }`}
    >
      {label}
    </button>
  );

  const PollGrid = ({ polls, isLoading, emptyMessage }) => {
    if (isLoading) {
      return (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      );
    }

    if (polls.length === 0) {
      return (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            No polls yet
          </h3>
          <p className="mt-2 text-sm text-gray-500">{emptyMessage}</p>
          {activeTab === "my-polls" && user && (
            <div className="mt-6">
              <Link
                to="/create-poll"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
              >
                Create your first poll
              </Link>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {polls.map((poll) => (
          <div
            key={poll.id}
            className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden"
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex-1 mr-2">
                  {poll.title}
                </h3>
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full ${
                    poll.isClosed
                      ? "bg-red-100 text-red-800"
                      : "bg-green-100 text-green-800"
                  }`}
                >
                  {poll.isClosed ? "Closed" : "Open"}
                </span>
              </div>
              {poll.description && (
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {poll.description}
                </p>
              )}
              {activeTab === "all-polls" && poll.creator && (
                <p className="text-xs text-gray-500 mb-3">
                  Created by: {poll.creator.username}
                </p>
              )}
              <div className="flex space-x-2 mt-4">
                <Link
                  to={`/poll/${poll.shareId}`}
                  className="flex-1 text-center px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md transition-colors"
                >
                  View Poll
                </Link>
                {poll.isClosed && (
                  <Link
                    to={`/poll/${poll.shareId}/results`}
                    className="flex-1 text-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                  >
                    Results
                  </Link>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            Ranked Choice Voting Polls
          </h1>
          <p className="text-xl text-gray-600">
            Create polls and let voters rank their choices!
          </p>
        </div>

        {user ? (
          <div className="space-y-8">
            {/* Create Poll Button */}
            <div className="text-center">
              <Link
                to="/create-poll"
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors shadow-lg"
              >
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Create New Poll
              </Link>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex space-x-1 mb-8 bg-gray-100 p-1 rounded-lg">
                <TabButton
                  tabId="my-polls"
                  label="My Polls"
                  isActive={activeTab === "my-polls"}
                  onClick={setActiveTab}
                />
                <TabButton
                  tabId="all-polls"
                  label="All Polls"
                  isActive={activeTab === "all-polls"}
                  onClick={setActiveTab}
                />
              </div>

              {/* Tab Content */}
              {activeTab === "my-polls" && (
                <PollGrid
                  polls={myPolls}
                  isLoading={isLoadingMy}
                  emptyMessage="You haven't created any polls yet."
                />
              )}

              {activeTab === "all-polls" && (
                <PollGrid
                  polls={allPolls}
                  isLoading={isLoadingAll}
                  emptyMessage="No public polls available."
                />
              )}
            </div>
          </div>
        ) : (
          <div className="max-w-md mx-auto">
            <div className="bg-white rounded-lg shadow-lg p-8 text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Welcome!</h2>
              <p className="text-gray-600 mb-6">
                Create an account to start creating ranked choice voting polls.
              </p>
              <div className="space-y-3">
                <Link
                  to="/signup"
                  className="block w-full px-4 py-2 border border-transparent text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
                >
                  Sign Up
                </Link>
                <Link
                  to="/login"
                  className="block w-full px-4 py-2 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
                >
                  Login
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
