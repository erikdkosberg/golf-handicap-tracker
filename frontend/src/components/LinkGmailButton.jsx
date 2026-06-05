import React, { useState } from "react";
import { getGoogleAuthUrl } from "../api";

export default function LinkGmailButton({ token }) {
  const [loading, setLoading] = useState(false);

  const handleLink = async () => {
    setLoading(true);
    const { auth_url } = await getGoogleAuthUrl(token);
    window.location.href = auth_url;
  };

  return (
    <button
      onClick={handleLink}
      disabled={loading}
      className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg shadow font-semibold transition disabled:bg-gray-300"
    >
      {loading ? "Redirecting..." : "Link Gmail"}
    </button>
  );
}
