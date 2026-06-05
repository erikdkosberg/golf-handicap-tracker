import React, { useState } from "react";
import Modal from "./Modal";
import { previewGolfshotSync, doGolfshotSync } from "../api";

export default function SyncGolfshotButton({ token, onSync }) {
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [foundCount, setFoundCount] = useState(0);
  const [imported, setImported] = useState(null);
  const [error, setError] = useState(null);

  const handlePreview = async () => {
    setLoading(true);
    setImported(null);
    setError(null);
    const preview = await previewGolfshotSync(token);
    setLoading(false);
    if (preview.error) {
      setError(preview.error);
      return;
    }
    if (preview.found > 0) {
      setFoundCount(preview.found);
      setModalOpen(true);
    } else {
      setImported(0);
    }
  };

  const handleImport = async () => {
    setLoading(true);
    setModalOpen(false);
    const result = await doGolfshotSync(token);
    setLoading(false);
    setImported(result.imported);
    if (onSync) onSync();
  };

  return (
    <div className="my-4">
      <button
        onClick={handlePreview}
        disabled={loading}
        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg shadow font-semibold transition disabled:bg-gray-300"
      >
        {loading ? "Checking..." : "Sync Golfshot"}
      </button>
      {error && <div className="text-red-600 mt-2">{error}</div>}
      {imported !== null && (
        <div className="mt-2 text-green-700 font-medium">
          {imported === 0
            ? "No new rounds to import."
            : `Successfully imported ${imported} round${imported !== 1 ? "s" : ""}!`}
        </div>
      )}
      <Modal
        open={modalOpen}
        title="Import Golfshot Rounds"
        onClose={() => setModalOpen(false)}
      >
        <div className="mb-4">
          {foundCount} round{foundCount !== 1 ? "s" : ""} have been found. Would you like to import them?
        </div>
        <button
          onClick={handleImport}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-semibold mr-3"
        >
          Yes, Import
        </button>
      </Modal>
    </div>
  );
}
