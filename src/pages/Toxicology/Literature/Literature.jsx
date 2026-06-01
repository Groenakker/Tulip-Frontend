import React, { useState } from "react";
import { FaSearch, FaExternalLinkAlt } from "react-icons/fa";
import WhiteIsland from "../../../components/Whiteisland";
import Header from "../../../components/Header";
import { tox } from "../../../lib/toxApi";
import toast from "../../../components/Toaster/toast";
import styles from "./Literature.module.css";

/**
 * Literature search.
 *
 * Calls /literature/search which fans out across PubMed and the bio/
 * medRxiv preprint servers. Renders each article as a card with
 * authors, abstract, source pill, and a deep link.
 */
export default function Literature() {
  const [query, setQuery] = useState("");
  const [sources, setSources] = useState({
    pubmed: true,
    biorxiv: true,
    medrxiv: false,
  });
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    const enabled = Object.entries(sources)
      .filter(([, on]) => on)
      .map(([k]) => k);
    if (enabled.length === 0) {
      toast.error("Pick at least one source");
      return;
    }
    setLoading(true);
    try {
      const data = await tox.get("/literature/search", {
        query,
        sources: enabled.join(","),
        limit: 30,
      });
      setResults(data);
    } catch (err) {
      toast.error(err?.message || "Search failed");
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header title="Literature" />
      <WhiteIsland className="WhiteIsland">
        <form onSubmit={handleSearch} className={styles.searchRow}>
          <div className={styles.searchInputWrapper}>
            <FaSearch className={styles.icon} />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search literature (e.g. silver nanoparticle toxicity)"
              className={styles.searchInput}
            />
          </div>
          <button type="submit" className={styles.primaryButton} disabled={loading || !query.trim()}>
            {loading ? "Searching..." : "Search"}
          </button>
        </form>

        <div className={styles.sourceRow}>
          {(["pubmed", "biorxiv", "medrxiv"]).map((id) => (
            <label key={id} className={styles.sourceToggle}>
              <input
                type="checkbox"
                checked={sources[id]}
                onChange={(e) =>
                  setSources((s) => ({ ...s, [id]: e.target.checked }))
                }
              />
              <span>{id}</span>
            </label>
          ))}
        </div>

        <div className={styles.results}>
          {!results && !loading && (
            <p className={styles.empty}>
              Pick at least one source and run a search to see results.
            </p>
          )}
          {results && (
            <div className={styles.meta}>
              <strong>{results.total_results}</strong> total results — {results.pubmed_count}{" "}
              PubMed, {results.preprint_count} preprints.
            </div>
          )}
          {results?.results?.map((article) => (
            <article key={article.id} className={styles.card}>
              <div className={styles.cardHead}>
                <h4>{article.title}</h4>
                <span className={`${styles.sourcePill} ${styles[article.source]}`}>
                  {article.source}
                </span>
              </div>
              <p className={styles.authors}>
                {Array.isArray(article.authors)
                  ? article.authors.slice(0, 5).join(", ") +
                    (article.authors.length > 5 ? " et al." : "")
                  : article.authors}
                {article.publication_date ? ` • ${article.publication_date}` : ""}
              </p>
              {article.abstract && (
                <p className={styles.abstract}>{article.abstract}</p>
              )}
              {article.url && (
                <a
                  href={article.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className={styles.cardLink}
                >
                  <FaExternalLinkAlt />
                  <span>Open source</span>
                </a>
              )}
            </article>
          ))}
        </div>
      </WhiteIsland>
    </>
  );
}
