import React from "react";
import { Link } from "react-router-dom";

const NotFound = () => {
  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">
          Page Not Found
        </h2>
        <img
          className="mx-auto max-w-md mb-6"
          src="/coyote-404.png"
          alt="Coyote 404"
        />
        <Link
          to="/"
          className="inline-block px-6 py-3 text-base font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md transition-colors"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
