import React, { useState, useEffect } from "react";
import axios from "axios";
import API_URL from "../api";

export default function SyncProgressBar({ token, isSyncing, onFinish }) {
  const [progress, setProgress] = useState({ current: 0, total: 0, status: "idle" });

  useEffect(() => {
    let interval = null;
    if (isSyncing) {
      interval = setInterval(async () => {
        const res = await axios.get(`${API_URL}/sync_progress`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setProgress(res.data);
        if (res.data.status === "done") {
          clearInterval(interval);
          if (onFinish) onFinish();
        }
      }, 1200);
    } else {
      setProgress({ current: 0, total: 0, status: "idle" });
    }
    return () => clearInterval(interval);
  }, [isSyncing, token, onFinish]);

  if (progress.status === "idle") return null;

  return (
    <div className="my-2 w-full max-w-md mx-auto">
      <div className="text-center mb-1 text-green-700 font-semibold">
        Syncing Rounds: {progress.current} / {progress.total}
      </div>
      <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="bg-green-400 h-4 transition-all"
          style={{
            width:
              progress.total > 0
                ? `${(progress.current / progress.total) * 100}%`
                : "0%",
          }}
        />
      </div>
    </div>
  );
}
