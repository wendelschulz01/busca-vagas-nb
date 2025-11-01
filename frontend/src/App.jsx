import React, { useState, useEffect } from "react";

import { runSearch } from "./api.js";

import Header from "./components/Header.jsx";
import SearchForm from "./components/SearchForm.jsx";
import PaginationBar from "./components/PaginationBar.jsx";
import ResultsSection from "./components/ResultsSection.jsx";

export default function App() {

  const [q, setQ] = useState("");
  const [prefersRemote, setPrefersRemote] = useState(true);
  const [days, setDays] = useState(90);
  const [pageSize, setPageSize] = useState(20);

  const [page, setPage] = useState(1);

  // dados vindos da API
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function fetchResults({ resetPage = false } = {}) {
    try {
      const nextPage = resetPage ? 1 : page;
      if (resetPage) setPage(1);

      setLoading(true);
      setErr("");

      const json = await runSearch({
        q,
        prefersRemote,
        days,
        page: nextPage,
        pageSize,
      });

      setData(json);
    } catch (e) {
      setErr(e.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e) {
    e.preventDefault();
    fetchResults({ resetPage: true });
  }

  function onPrev() {
    if (page > 1) {
      setPage((p) => p - 1);
    }
  }

  function onNext() {
    setPage((p) => p + 1);
  }

  useEffect(() => {
    fetchResults();
  }, [page]);

  const meta = data?.meta;
  const items = data?.items || [];

  return (
    <div className="container">
      <Header meta={meta} />

      <SearchForm
        q={q}
        setQ={setQ}
        prefersRemote={prefersRemote}
        setPrefersRemote={setPrefersRemote}
        days={days}
        setDays={setDays}
        pageSize={pageSize}
        setPageSize={setPageSize}
        loading={loading}
        onSubmit={onSubmit}
      />

      <section className="results">
        <PaginationBar
          page={page}
          onPrev={onPrev}
          onNext={onNext}
          loading={loading}
          meta={meta}
          itemsCount={items.length}
        />

        <ResultsSection loading={loading} err={err} items={items} />
      </section>
    </div>
  );
}
