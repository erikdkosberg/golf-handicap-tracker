// src/components/Dashboard.jsx

import React, { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import RoundRow from "./RoundRow";
import AddRoundForm from "./AddRoundForm";
import HandicapCalculator from "./HandicapCalculator";
import HandicapBreakdown from "./HandicapBreakdown";
import CourseViewer from "./CourseViewer";
import { ScoreHandicapChart } from "./ScoreHandicapChart";
import { StatCard, TrendCard } from "./StatCards";
import { formatDate } from "../utilities/utility";
import API_URL from "../api";
import SyncProgressBar from "./SyncProgressBar";
import LoadingSpinner from "./LoadingSpinner";

// --------- Modal Component -----------
function Modal({ open, title, children, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed z-40 inset-0 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">{title}</h2>
        {children}
        <button
          onClick={onClose}
          className="mt-6 bg-gray-200 px-4 py-2 rounded hover:bg-gray-300"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// --------- Link Gmail Button -----------
function LinkGmailButton({ token, disabled }) {
  const [loading, setLoading] = useState(false);

  const handleLink = async () => {
    setLoading(true);
    const res = await axios.get(`${API_URL}/auth/google`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    window.location.href = res.data.auth_url;
  };

  return (
    <button
      onClick={handleLink}
      disabled={loading || disabled}
      className={`${
        disabled ? "bg-gray-300 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"
      } text-white px-6 py-2 rounded-lg shadow font-semibold transition`}
    >
      {disabled ? "Gmail Linked" : loading ? "Redirecting..." : "Link Gmail"}
    </button>
  );
}


function SyncGolfshotButton({ token, onSync, disabled, defaultPlayerName }) {
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [foundCount, setFoundCount] = useState(0);
  const [imported, setImported] = useState(null);
  const [error, setError] = useState(null);
  const [playerName, setPlayerName] = useState(defaultPlayerName || "");
  const [isSyncing, setIsSyncing] = useState(false);
  const [totalCount, setTotalCount] = useState(null);
  const [askName, setAskName] = useState(false);

  const handlePreview = async () => {
    setAskName(true);
  };

  const doPreview = async () => {
    setLoading(true);
    setImported(null);
    setError(null);
    try {
      const res = await axios.post(
        `${API_URL}/gmail/sync?dry_run=1`,
        { player_name: playerName },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setFoundCount(res.data.found || 0);
      setTotalCount(res.data.total || null);
      setModalOpen(true);
      if (res.data.error) {
        setError(res.data.error);
      } else if (res.data.found > 0) {
        setFoundCount(res.data.found);
        setModalOpen(true);
      } else {
        setImported(0);
      }
    } catch (err) {
      setError("Sync failed.");
    }
    setLoading(false);
    setAskName(false);
  };

  const handleImport = async () => {
    setLoading(true);
    setModalOpen(false);
    try {
      setIsSyncing(true);

      const res = await axios.post(
        `${API_URL}/gmail/sync`,
        { player_name: playerName },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setIsSyncing(false);
      setImported(res.data.imported || 0);
      if (onSync) onSync();
    } catch (err) {
      setError("Import failed.");
    }
    setLoading(false);
  };

  return (
    <div className="my-1">
      <SyncProgressBar token={token} isSyncing={isSyncing} onFinish={() => setIsSyncing(false)} />

      <button
        onClick={handlePreview}
        disabled={loading || disabled}
        className={`${
          disabled
            ? "bg-gray-300 cursor-not-allowed"
            : "bg-blue-600 hover:bg-blue-700"
        } text-white px-6 py-2 rounded-lg shadow font-semibold transition`}
        title={disabled ? "Link Gmail first to enable sync." : ""}
      >
        {loading ? "Checking..." : "Sync Golfshot"}
      </button>
      {askName && (
        <div className="fixed z-50 inset-0 flex items-center justify-center bg-black bg-opacity-30">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Enter your name as it appears on the scorecard</h2>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="e.g. Erik"
              className="border p-2 rounded w-full mb-4"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={doPreview}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-semibold"
                disabled={!playerName}
              >
                Continue
              </button>
              <button
                onClick={() => setAskName(false)}
                className="bg-gray-200 px-4 py-2 rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      <Modal
        open={modalOpen}
        title="Import Golfshot Rounds"
        onClose={() => setModalOpen(false)}
      >
        <div className="mb-4">
          {foundCount} new round{foundCount !== 1 ? "s" : ""} found for "{playerName}"
          {totalCount !== null && (
            <> (out of {totalCount} Golfshot emails scanned)</>
          )}
          . Import them?
        </div>
        <button
          onClick={handleImport}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-semibold mr-3"
        >
          Yes, Import
        </button>
      </Modal>

      {disabled && (
        <div className="text-sm text-gray-500 mt-1">Link your Gmail account to enable syncing.</div>
      )}
      {!disabled && error && <div className="text-red-600 mt-2">{error}</div>}
      {!disabled && imported !== null && (
        <div className="mt-2 text-green-700 font-medium">
          {imported === 0
            ? "No new rounds to import."
            : `Successfully imported ${imported} round${imported !== 1 ? "s" : ""}!`}
        </div>
      )}
    </div>
  );
}


// --------- Main Dashboard -----------
const ROUNDS_PER_PAGE = 40;

export default function Dashboard({ token, onLogout }) {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [showCourseViewer, setShowCourseViewer] = useState(false);
  const [rounds, setRounds] = useState([]);
  const [handicapData, setHandicapData] = useState(null);
  const [handicapLoading, setHandicapLoading] = useState(true);
  const [username, setUsername] = useState("Golfer");
  const [sortField, setSortField] = useState("date");
  const [sortDirection, setSortDirection] = useState("desc");
  const [gmailLinked, setGmailLinked] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const initialHandicapLoad = useRef(true);

  const handleAuthError = useCallback(
    (err) => {
      if (err.response?.status === 401) {
        onLogout();
      }
    },
    [onLogout]
  );

  const fetchData = useCallback(async () => {
    if (!token) {
      onLogout();
      return;
    }

    const headers = { Authorization: `Bearer ${token}` };
    const showHandicapSpinner = initialHandicapLoad.current;
    if (showHandicapSpinner) {
      setHandicapLoading(true);
    }

    axios
      .get(`${API_URL}/me`, { headers })
      .then((res) => {
        setUsername(res.data.username || res.data.email || "Golfer");
        setGmailLinked(res.data.gmail_linked || false);
      })
      .catch(handleAuthError);

    axios
      .get(`${API_URL}/rounds`, { headers })
      .then((res) => setRounds(res.data))
      .catch(handleAuthError);

    axios
      .get(`${API_URL}/handicap`, { headers })
      .then((res) => setHandicapData(res.data))
      .catch(handleAuthError)
      .finally(() => {
        setHandicapLoading(false);
        initialHandicapLoad.current = false;
      });
  }, [token, onLogout, handleAuthError]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async (id) => {
    await axios.delete(`${API_URL}/rounds/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchData();
  };

  const handicap = handicapData?.handicap ?? null;
  const stats = handicapData?.stats ?? {};
  const statsLoading = handicapLoading && handicapData === null;
  const lowestRoundToPar = handicapData?.lowest_round_to_par;
  const chartData = (handicapData?.chart_data ?? []).map((d) => ({
    date: d.date,
    Score: d.score,
    Differential: d.differential,
    Handicap: d.handicap,
  }));
  const highlightRoundIds = new Set(handicapData?.highlighted_round_ids ?? []);
  const handleSort = (field) => {
    setCurrentPage(1);
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const sortedRounds = [...rounds].sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];
    if (
      [
        "score",
        "course_rating",
        "course_slope",
        "yardage",
        "par",
        "differential",
        "hole_count",
      ].includes(sortField)
    ) {
      aVal = Number(aVal);
      bVal = Number(bVal);
    }
    if (sortField === "has_hole_by_hole") {
      aVal = a.has_hole_by_hole ? 1 : 0;
      bVal = b.has_hole_by_hole ? 1 : 0;
    }
    if (aVal === undefined) aVal = "";
    if (bVal === undefined) bVal = "";
    if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
    if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  const totalPages = Math.max(1, Math.ceil(sortedRounds.length / ROUNDS_PER_PAGE));
  const pageStart = (currentPage - 1) * ROUNDS_PER_PAGE;
  const paginatedRounds = sortedRounds.slice(pageStart, pageStart + ROUNDS_PER_PAGE);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const formatToPar = (roundInfo) => {
    if (!roundInfo) return "N/A";
    const diff = roundInfo.to_par;
    if (diff === 0) return `${roundInfo.score} (E)`;
    return `${roundInfo.score} (${diff > 0 ? "+" : ""}${diff})`;
  };

  const openHandicapBreakdown = () => setShowBreakdown(true);

  if (showBreakdown) {
    return (
      <HandicapBreakdown
        token={token}
        onLogout={onLogout}
        onBack={() => setShowBreakdown(false)}
      />
    );
  }

  if (showCourseViewer) {
    return <CourseViewer onBack={() => setShowCourseViewer(false)} />;
  }

  return (
    <div className="max-w-6xl mx-auto px-2 sm:px-6 py-4 sm:py-8">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4 sm:gap-0">
        <h1 className="text-2xl font-bold text-indigo-900 text-center sm:text-left">
          Hello, {username}!
        </h1>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setShowCourseViewer(true)}
            className="flex-1 sm:flex-none bg-green-700 text-white rounded px-5 py-2 font-semibold hover:bg-green-800 transition"
          >
            Course Viewer
          </button>
          <button
            onClick={onLogout}
            className="flex-1 sm:flex-none bg-gray-200 rounded px-6 py-2 font-semibold hover:bg-gray-300"
          >
            Log Out
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-8 h-auto md:h-[460px] min-h-0">
        <div className="flex flex-col gap-4 min-w-[220px] md:w-[260px] h-full min-h-0">
          <button
            type="button"
            onClick={openHandicapBreakdown}
            className="bg-indigo-50 rounded-xl shadow-inner p-4 sm:p-6 flex flex-col items-center justify-center h-1/2 min-h-[120px] w-full hover:bg-indigo-100 hover:shadow-md transition cursor-pointer group"
            title="View handicap calculation breakdown"
          >
            <span className="text-base text-gray-600 mb-2 group-hover:text-indigo-700">
              Current Handicap
            </span>
            <span className="text-3xl font-bold min-h-[36px] flex items-center justify-center text-indigo-900">
              {statsLoading ? (
                <LoadingSpinner size="lg" />
              ) : handicap !== null ? (
                handicap
              ) : (
                "N/A"
              )}
            </span>
            <span className="text-xs text-indigo-500 mt-2">
              View calculation →
            </span>
          </button>
          <div className="bg-green-50 rounded-xl shadow-inner p-4 sm:p-6 flex flex-col items-center justify-center h-1/2 min-h-[120px]">
            <span className="text-base text-gray-600 mb-1">Lowest Round to Par</span>
            <span className="text-3xl font-bold mb-1 min-h-[36px] flex items-center justify-center">
              {statsLoading ? <LoadingSpinner size="lg" /> : formatToPar(lowestRoundToPar)}
            </span>
            {lowestRoundToPar && (
              <div className="text-xs text-gray-600 text-center mt-1">
                {lowestRoundToPar.date ? (
                  <>{formatDate(lowestRoundToPar.date)} &middot; </>
                ) : null}
                {lowestRoundToPar.course && (
                  <>
                    {lowestRoundToPar.course}
                    {lowestRoundToPar.tees ? ` (${lowestRoundToPar.tees})` : ""}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-4 flex-1 h-full min-h-0">
          <div className="bg-blue-50 rounded-xl shadow-inner p-4 flex-[3] flex flex-col min-h-0">
            <AddRoundForm
              token={token}
              onAdd={fetchData}
            />
          </div>
          <div className="bg-blue-50 rounded-xl shadow-inner p-4 flex-[2] flex flex-col min-h-0">
            <HandicapCalculator
              token={token}
              handicap={handicap}
              improvementCutoff={handicapData?.improvement_cutoff}
              maintainCutoff={handicapData?.maintain_cutoff}
              calculatorDefaults={handicapData?.calculator_defaults}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 my-8">
        <StatCard
          label="Total Rounds"
          value={statsLoading ? <LoadingSpinner /> : (stats.total_rounds ?? rounds.length)}
          colorClass="bg-orange-50"
        />
        <StatCard
          label="Lowest Differential"
          value={
            statsLoading ? (
              <LoadingSpinner />
            ) : stats.lowest_differential != null ? (
              stats.lowest_differential.toFixed(1)
            ) : (
              "N/A"
            )
          }
          colorClass="bg-blue-50"
        />
        <StatCard
          label="Average Differential (20)"
          value={
            statsLoading ? (
              <LoadingSpinner />
            ) : stats.average_differential_20 != null ? (
              stats.average_differential_20.toFixed(1)
            ) : (
              "N/A"
            )
          }
          colorClass="bg-yellow-50"
        />
        <TrendCard
          label="Handicap Trend (10)"
          loading={statsLoading}
          value={
            stats.handicap_trend_10 != null
              ? Math.abs(stats.handicap_trend_10).toFixed(2)
              : "N/A"
          }
          trend={stats.handicap_trend_10}
        />

        <StatCard
          label="Avg Birdies/Round"
          value={statsLoading ? <LoadingSpinner /> : (stats.avg_birdies ?? "N/A")}
          colorClass="bg-green-50"
        />
        <StatCard
          label="Avg Pars/Round"
          value={statsLoading ? <LoadingSpinner /> : (stats.avg_pars ?? "N/A")}
          colorClass="bg-indigo-50"
        />
        <StatCard
          label="Avg Bogeys/Round"
          value={statsLoading ? <LoadingSpinner /> : (stats.avg_bogeys ?? "N/A")}
          colorClass="bg-yellow-100"
        />
        <StatCard
          label="Avg Dbl+ Bogey/Round"
          value={statsLoading ? <LoadingSpinner /> : (stats.avg_double_or_worse ?? "N/A")}
          colorClass="bg-rose-50"
        />
      </div>

      <ScoreHandicapChart chartData={chartData} loading={statsLoading} />

      <div className="mb-12">
        <div className="text-lg font-semibold mb-2">Past Rounds</div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr>
                {[
                  { label: "Date", field: "date" },
                  { label: "Score", field: "score" },
                  { label: "Holes", field: "hole_count" },
                  { label: "Rating", field: "course_rating" },
                  { label: "Slope", field: "course_slope" },
                  { label: "Course", field: "course" },
                  { label: "Tees", field: "tees" },
                  { label: "Yardage", field: "yardage" },
                  { label: "Par", field: "par" },
                  { label: "Differential", field: "differential" },
                  { label: "Hole Data", field: "has_hole_by_hole" },
                ].map(({ label, field }) => (
                  <th
                    key={field}
                    className="text-center cursor-pointer select-none"
                    onClick={() => handleSort(field)}
                  >
                    {label}{" "}
                    {sortField === field &&
                      (sortDirection === "asc" ? "▲" : "▼")}
                  </th>
                ))}
                <th className="text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRounds.map((r, pageIdx) => {
                const idx = pageStart + pageIdx;
                const isTop20 = sortField === "date" && sortDirection === "desc" && idx < 20;
                const isHighlighted = isTop20 && highlightRoundIds.has(r.id);
                const isHandicapCutoff =
                  sortField === "date" &&
                  sortDirection === "desc" &&
                  idx === 19;

                return (
                  <React.Fragment key={r.id}>
                    <RoundRow
                      round={{ ...r, date: formatDate(r.date) }}
                      token={token}
                      onUpdate={fetchData}
                      onDelete={handleDelete}
                      differential={
                        typeof r.differential === "number" && !isNaN(r.differential)
                          ? r.differential
                          : "N/A"
                      }
                      highlight={isHighlighted}
                    />
                    {isHandicapCutoff && (
                      <tr>
                        <td colSpan={12}>
                          <div
                            style={{
                              borderTop: "2px dotted green",
                              margin: "0 0 0 0",
                              height: "0.5rem",
                            }}
                            title="Rounds above the line are used in your current handicap"
                          />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {sortedRounds.length > ROUNDS_PER_PAGE && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
            <span className="text-sm text-gray-600">
              Showing {pageStart + 1}–
              {Math.min(pageStart + ROUNDS_PER_PAGE, sortedRounds.length)} of{" "}
              {sortedRounds.length} rounds
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPage === 1}
                className="bg-gray-200 rounded px-4 py-1.5 font-semibold hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600 min-w-[7rem] text-center">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() =>
                  setCurrentPage((page) => Math.min(totalPages, page + 1))
                }
                disabled={currentPage === totalPages}
                className="bg-gray-200 rounded px-4 py-1.5 font-semibold hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-4 mt-6">
          <LinkGmailButton token={token} disabled={gmailLinked} />
          <SyncGolfshotButton
            token={token}
            disabled={!gmailLinked}
            onSync={fetchData}
          />
        </div>
      </div>
    </div>
  );
}
