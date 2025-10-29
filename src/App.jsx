import React, { useEffect, useState, useRef } from "react";

export default function BookFinder() {
  const [query, setQuery] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchTrigger, setSearchTrigger] = useState(0);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [numFound, setNumFound] = useState(0);
  const [sortBy, setSortBy] = useState("relevance");
  const [favorites, setFavorites] = useState(() => {
    try { 
      return JSON.parse(localStorage.getItem("bf_favs") || "[]"); 
    } catch { 
      return []; 
    }
  });
  const [recent, setRecent] = useState(() => {
    try { 
      return JSON.parse(localStorage.getItem("bf_recent") || "[]"); 
    } catch { 
      return []; 
    }
  });
  const [favDrawerOpen, setFavDrawerOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("bf_darkMode") || "false");
    } catch {
      return false;
    }
  });

  const debounceRef = useRef(null);
  const RESULTS_PER_PAGE = 20;

  // Toggle dark mode
  const toggleDarkMode = () => {
    setDarkMode(prev => {
      const newMode = !prev;
      localStorage.setItem("bf_darkMode", JSON.stringify(newMode));
      return newMode;
    });
  };

  // Apply dark mode class to document
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Fix: Proper debounce implementation
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    if (query.trim()) {
      debounceRef.current = setTimeout(() => {
        setPage(1);
        setSearchTerm(query.trim());
        setSearchTrigger(prev => prev + 1);
      }, 450);
    } else {
      setResults([]);
      setNumFound(0);
      setError(null);
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query]);

  // Fix: Proper API call with error handling
  useEffect(() => {
    if (!searchTerm) {
      setResults([]);
      setNumFound(0);
      setError(null);
      return;
    }

    const controller = new AbortController();
    
    const fetchBooks = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const url = `https://openlibrary.org/search.json?title=${encodeURIComponent(searchTerm)}&page=${page}&limit=${RESULTS_PER_PAGE}`;
        const res = await fetch(url, { 
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
          }
        });
        
        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        const data = await res.json();
        
        setNumFound(data.numFound || 0);
        let docs = data.docs || [];
        
        // Fix: Proper sorting without mutating original array
        if (sortBy === "year-asc") {
          docs = [...docs].sort((a, b) => (a.first_publish_year || 0) - (b.first_publish_year || 0));
        } else if (sortBy === "year-desc") {
          docs = [...docs].sort((a, b) => (b.first_publish_year || 0) - (a.first_publish_year || 0));
        }
        
        setResults(docs);

        // Update recent searches
        setRecent(prev => {
          const updated = [searchTerm, ...prev.filter(x => x !== searchTerm)].slice(0, 8);
          localStorage.setItem("bf_recent", JSON.stringify(updated));
          return updated;
        });
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err.message || "Failed to fetch books");
        }
      } finally { 
        setLoading(false); 
      }
    };

    fetchBooks();

    return () => controller.abort();
  }, [searchTerm, page, sortBy, searchTrigger]);

  // Fix: Better favorite management
  const toggleFavorite = (book) => {
    setFavorites(prev => {
      const exists = prev.find(b => b.key === book.key);
      let updatedFavorites;
      
      if (exists) {
        updatedFavorites = prev.filter(b => b.key !== book.key);
      } else {
        updatedFavorites = [
          { 
            key: book.key, 
            title: book.title, 
            author_name: book.author_name, 
            cover_i: book.cover_i,
            first_publish_year: book.first_publish_year 
          }, 
          ...prev
        ];
      }
      
      localStorage.setItem("bf_favs", JSON.stringify(updatedFavorites));
      return updatedFavorites;
    });
  };

  const clearFavorites = () => { 
    setFavorites([]); 
    localStorage.removeItem('bf_favs'); 
  };

  const clearRecent = () => { 
    setRecent([]); 
    localStorage.removeItem('bf_recent'); 
  };

  const useRecent = (term) => { 
    setQuery(term); 
    setSearchTerm(term); 
    setPage(1); 
    setSearchTrigger(t => t + 1); 
  };

  const nextPage = () => { 
    if (page < Math.ceil(numFound / RESULTS_PER_PAGE)) setPage(p => p + 1); 
  };

  const prevPage = () => { 
    if (page > 1) setPage(p => p - 1); 
  };

  // Fix: Better cover image handling
  const coverFor = (doc, size = 'M') => {
    if (doc.cover_i) {
      return `https://covers.openlibrary.org/b/id/${doc.cover_i}-${size}.jpg`;
    }
    if (doc.isbn && doc.isbn.length) {
      return `https://covers.openlibrary.org/b/isbn/${doc.isbn[0]}-${size}.jpg`;
    }
    if (doc.cover_edition_key) {
      return `https://covers.openlibrary.org/b/olid/${doc.cover_edition_key}-${size}.jpg`;
    }
    return null;
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      darkMode 
        ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900' 
        : 'bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50'
    } p-4 md:p-8`}>
      <div className="max-w-7xl mx-auto">
        {/* Header - Modern glass morphism style */}
        <header className={`flex items-center justify-between gap-4 mb-8 p-6 backdrop-blur-lg rounded-2xl shadow-sm border transition-colors duration-300 ${
          darkMode 
            ? 'bg-gray-800/70 border-gray-700/50' 
            : 'bg-white/70 border-white/20'
        }`}>
          <div className="flex-1">
            <h1 className={`text-3xl sm:text-4xl font-bold bg-gradient-to-r ${
              darkMode 
                ? 'from-blue-400 to-purple-400' 
                : 'from-blue-600 to-purple-600'
            } bg-clip-text text-transparent`}>
              BookFinder
            </h1>
            <p className={`text-sm mt-2 transition-colors duration-300 ${
              darkMode ? 'text-gray-300' : 'text-slate-600'
            }`}>
              Discover millions of books using Open Library API
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              className={`p-2 rounded-xl transition-all duration-300 ${
                darkMode 
                  ? 'bg-yellow-400 text-gray-900 hover:bg-yellow-300' 
                  : 'bg-gray-800 text-yellow-400 hover:bg-gray-700'
              }`}
              aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
              {darkMode ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              )}
            </button>

            <button
              onClick={() => setFavDrawerOpen(true)}
              className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-200 hover:scale-105"
            >
              <span className="text-yellow-300">★</span>
              Favorites
              <span className="bg-white/20 px-2 py-1 rounded-full text-xs">
                {favorites.length}
              </span>
            </button>

            <button
              onClick={() => setFavDrawerOpen(true)}
              className="flex sm:hidden items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25"
            >
              <span className="text-yellow-300 text-lg">★</span>
            </button>
          </div>
        </header>

        {/* Search Section */}
        <section className={`backdrop-blur-sm rounded-2xl p-6 shadow-sm border transition-colors duration-300 ${
          darkMode 
            ? 'bg-gray-800/70 border-gray-700/50' 
            : 'bg-white/80 border-white/20'
        } mb-6`}>
          <div className="flex flex-col lg:flex-row gap-4 items-stretch">
            <div className="flex-1 relative">
              <div className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none ${
                darkMode ? 'text-gray-400' : 'text-gray-400'
              }`}>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                id="search"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search by title — try 'harry potter', 'Alex', or 'science'"
                className={`w-full pl-10 pr-4 py-3.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-300 text-sm ${
                  darkMode 
                    ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white/50 border-gray-200 text-gray-900'
                }`}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setSearchTerm(query.trim()); setPage(1); setSearchTrigger(t => t + 1); }}
                disabled={!query.trim()}
                className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Search
              </button>

              <button
                onClick={() => { setQuery(''); setSearchTerm(''); setResults([]); setNumFound(0); setError(null); }}
                className={`px-5 py-3.5 rounded-xl border font-medium transition-all duration-200 ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600' 
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Clear
              </button>
            </div>
          </div>

          {/* Recent Searches */}
          <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className={`text-sm font-medium flex items-center gap-2 transition-colors duration-300 ${
              darkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Recent Searches:
            </div>
            
            <div className="flex-1 overflow-hidden">
              <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
                {recent.length === 0 && (
                  <div className={`text-sm transition-colors duration-300 ${
                    darkMode ? 'text-gray-500' : 'text-gray-400'
                  }`}>
                    No recent searches
                  </div>
                )}
                {recent.map((r, index) => (
                  <button
                    key={`${r}-${index}`}
                    onClick={() => useRecent(r)}
                    className={`inline-flex items-center whitespace-nowrap px-4 py-2 rounded-full border text-sm font-medium hover:scale-105 transition-all duration-200 flex-shrink-0 ${
                      darkMode
                        ? 'bg-blue-900/50 border-blue-700 text-blue-300 hover:bg-blue-800/50'
                        : 'bg-blue-50 border-blue-100 text-blue-700 hover:bg-blue-100'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {recent.length > 0 && (
              <button 
                onClick={clearRecent}
                className={`text-sm px-3 py-2 rounded-lg hover:scale-105 transition-all duration-200 flex items-center gap-2 flex-shrink-0 ${
                  darkMode 
                    ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-700/50' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Clear
              </button>
            )}
          </div>

          {/* Sort Options */}
          <div className="mt-4 flex items-center gap-3">
            <label className={`text-sm font-medium transition-colors duration-300 ${
              darkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Sort by:
            </label>
            <select 
              value={sortBy} 
              onChange={e => setSortBy(e.target.value)}
              className={`text-sm rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-300 ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="relevance">Relevance</option>
              <option value="year-desc">Year (Newest First)</option>
              <option value="year-asc">Year (Oldest First)</option>
            </select>
          </div>
        </section>

        {/* Main Content */}
        <main className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Results Section */}
          <section className="xl:col-span-3">
            {/* Results Header */}
            <div className={`backdrop-blur-sm rounded-2xl p-6 shadow-sm border transition-colors duration-300 ${
              darkMode 
                ? 'bg-gray-800/70 border-gray-700/50' 
                : 'bg-white/80 border-white/20'
            } mb-6`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {loading ? (
                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <div className={`w-2 h-2 rounded-full ${
                      darkMode ? 'bg-green-400' : 'bg-green-500'
                    }`}></div>
                  )}
                  <div className={`text-sm transition-colors duration-300 ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    <strong className={`text-lg ${
                      darkMode ? 'text-white' : 'text-gray-900'
                    }`}>{numFound.toLocaleString()}</strong> results
                    {searchTerm && (
                      <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                        {" for "}<strong className={darkMode ? 'text-white' : 'text-gray-900'}>"{searchTerm}"</strong>
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className={`text-sm transition-colors duration-300 ${
                    darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Page <strong>{page}</strong> of <strong>{Math.max(1, Math.ceil(numFound / RESULTS_PER_PAGE))}</strong>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={prevPage} 
                      disabled={page === 1}
                      className={`px-4 py-2 rounded-lg border font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 ${
                        darkMode
                          ? 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                          : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      Prev
                    </button>
                    <button 
                      onClick={nextPage} 
                      disabled={page >= Math.ceil(numFound / RESULTS_PER_PAGE)}
                      className={`px-4 py-2 rounded-lg border font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 ${
                        darkMode
                          ? 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                          : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      Next
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className={`backdrop-blur-sm rounded-2xl p-4 shadow-sm border animate-pulse transition-colors duration-300 ${
                    darkMode 
                      ? 'bg-gray-800/70 border-gray-700/50' 
                      : 'bg-white/80 border-white/20'
                  }`}>
                    <div className={`w-full h-48 rounded-xl mb-4 ${
                      darkMode ? 'bg-gray-700' : 'bg-gray-200'
                    }`}></div>
                    <div className={`h-4 rounded mb-2 ${
                      darkMode ? 'bg-gray-700' : 'bg-gray-200'
                    }`}></div>
                    <div className={`h-3 rounded w-3/4 mb-3 ${
                      darkMode ? 'bg-gray-700' : 'bg-gray-200'
                    }`}></div>
                    <div className={`h-2 rounded w-1/2 ${
                      darkMode ? 'bg-gray-700' : 'bg-gray-200'
                    }`}></div>
                  </div>
                ))}
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className={`border rounded-2xl p-6 flex items-center gap-3 transition-colors duration-300 ${
                darkMode 
                  ? 'bg-red-900/20 border-red-800 text-red-300' 
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}>
                <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <strong className="font-semibold">Error:</strong> {error}
                </div>
              </div>
            )}

            {/* No Results */}
            {!loading && results.length === 0 && searchTerm && !error && (
              <div className={`backdrop-blur-sm rounded-2xl p-12 text-center shadow-sm border transition-colors duration-300 ${
                darkMode 
                  ? 'bg-gray-800/70 border-gray-700/50' 
                  : 'bg-white/80 border-white/20'
              }`}>
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                  darkMode ? 'bg-gray-700' : 'bg-gray-100'
                }`}>
                  <svg className={`w-8 h-8 ${
                    darkMode ? 'text-gray-400' : 'text-gray-400'
                  }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className={`text-lg font-semibold mb-2 transition-colors duration-300 ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  No books found
                </h3>
                <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                  Try adjusting your search terms or browse different categories
                </p>
              </div>
            )}

            {/* Results Grid */}
            {!loading && results.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {results.map(doc => (
                  <div key={doc.key} className={`backdrop-blur-sm rounded-2xl p-4 shadow-sm border hover:shadow-md transition-all duration-300 group ${
                    darkMode 
                      ? 'bg-gray-800/70 border-gray-700/50 hover:border-blue-400/50' 
                      : 'bg-white/80 border-white/20 hover:border-blue-200'
                  }`}>
                    {/* Book Cover */}
                    <div className="relative mb-4">
                      <div className={`w-full aspect-[3/4] rounded-xl overflow-hidden flex items-center justify-center ${
                        darkMode 
                          ? 'bg-gradient-to-br from-gray-700 to-gray-800' 
                          : 'bg-gradient-to-br from-gray-100 to-gray-200'
                      }`}>
                        {coverFor(doc, 'M') ? (
                          <img 
                            src={coverFor(doc, 'M')} 
                            alt={`${doc.title} cover`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                        ) : (
                          <div className={`text-center p-4 ${
                            darkMode ? 'text-gray-400' : 'text-gray-400'
                          }`}>
                            <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                            <span className="text-xs">No cover available</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Favorite Button */}
                      <button
                        onClick={() => toggleFavorite(doc)}
                        className={`absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${
                          favorites.some(f => f.key === doc.key) 
                            ? 'bg-yellow-500 text-white shadow-lg' 
                            : darkMode
                            ? 'bg-gray-700/90 text-gray-400 hover:bg-gray-600 hover:text-yellow-400 shadow-sm'
                            : 'bg-white/90 text-gray-400 hover:bg-white hover:text-yellow-500 shadow-sm'
                        }`}
                      >
                        {favorites.some(f => f.key === doc.key) ? '★' : '☆'}
                      </button>
                    </div>

                    {/* Book Info */}
                    <div className="space-y-3">
                      <h3 className={`font-semibold line-clamp-2 leading-tight group-hover:text-blue-500 transition-colors duration-200 ${
                        darkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                        {doc.title}
                      </h3>
                      
                      <div className={`text-sm ${
                        darkMode ? 'text-gray-300' : 'text-gray-600'
                      }`}>
                        by <span className="font-medium">{(doc.author_name || ['Unknown author']).slice(0, 2).join(', ')}</span>
                      </div>

                      <div className={`flex items-center justify-between text-xs ${
                        darkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        <span>Published: {doc.first_publish_year || 'Unknown'}</span>
                        <span>Editions: {doc.edition_count || 0}</span>
                      </div>

                      {/* Subjects */}
                      {doc.subject && doc.subject.length > 0 && (
                        <div className={`pt-2 border-t ${
                          darkMode ? 'border-gray-700' : 'border-gray-100'
                        }`}>
                          <div className={`text-xs mb-1 ${
                            darkMode ? 'text-gray-400' : 'text-gray-500'
                          }`}>
                            Subjects:
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {doc.subject.slice(0, 3).map((subject, idx) => (
                              <span 
                                key={idx}
                                className={`inline-block px-2 py-1 rounded-md text-xs ${
                                  darkMode
                                    ? 'bg-gray-700 text-gray-300'
                                    : 'bg-gray-100 text-gray-700'
                                }`}
                              >
                                {subject.length > 20 ? subject.substring(0, 20) + '...' : subject}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-2 pt-2">
                        <a 
                          href={`https://openlibrary.org${doc.key}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`flex-1 text-center px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                            darkMode
                              ? 'bg-blue-900/50 text-blue-300 hover:bg-blue-800/50'
                              : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                          }`}
                        >
                          View Details
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Sidebar */}
          <aside className="xl:col-span-1 space-y-6">
            {/* Favorites Panel */}
            <div className={`backdrop-blur-sm rounded-2xl p-6 shadow-sm border transition-colors duration-300 ${
              darkMode 
                ? 'bg-gray-800/70 border-gray-700/50' 
                : 'bg-white/80 border-white/20'
            } sticky top-6`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-lg font-semibold transition-colors duration-300 ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  Favorites
                </h3>
                <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                  darkMode 
                    ? 'bg-blue-900/50 text-blue-300' 
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  {favorites.length}
                </span>
              </div>

              {favorites.length === 0 ? (
                <div className="text-center py-8">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${
                    darkMode ? 'bg-gray-700' : 'bg-gray-100'
                  }`}>
                    <svg className={`w-6 h-6 ${
                      darkMode ? 'text-gray-400' : 'text-gray-400'
                    }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </div>
                  <p className={`text-sm transition-colors duration-300 ${
                    darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    No favorites yet. Click the star icon to add books.
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                    {favorites.map(fav => (
                      <div key={fav.key} className={`flex items-center gap-3 p-3 rounded-lg transition-colors duration-200 ${
                        darkMode 
                          ? 'bg-gray-700/50 hover:bg-gray-700' 
                          : 'bg-gray-50 hover:bg-gray-100'
                      }`}>
                        <div className={`w-12 h-16 rounded-lg overflow-hidden flex-shrink-0 ${
                          darkMode ? 'bg-gray-600' : 'bg-gray-200'
                        }`}>
                          {fav.cover_i ? (
                            <img 
                              src={`https://covers.openlibrary.org/b/id/${fav.cover_i}-S.jpg`} 
                              alt={fav.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className={`w-full h-full flex items-center justify-center ${
                              darkMode ? 'text-gray-400' : 'text-gray-400'
                            }`}>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className={`font-medium text-sm line-clamp-2 transition-colors duration-300 ${
                            darkMode ? 'text-white' : 'text-gray-900'
                          }`}>
                            {fav.title}
                          </h4>
                          <p className={`text-xs mt-1 transition-colors duration-300 ${
                            darkMode ? 'text-gray-400' : 'text-gray-600'
                          }`}>
                            {fav.author_name?.slice(0, 1).join(', ') || 'Unknown'}
                          </p>
                        </div>
                        <button
                          onClick={() => toggleFavorite(fav)}
                          className={`p-1 transition-colors duration-200 ${
                            darkMode 
                              ? 'text-red-400 hover:text-red-300' 
                              : 'text-red-500 hover:text-red-700'
                          }`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2 pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => navigator.clipboard?.writeText(JSON.stringify(favorites, null, 2))}
                      className={`flex-1 px-3 py-2 text-sm rounded-lg transition-colors duration-200 ${
                        darkMode
                          ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Copy JSON
                    </button>
                    <button
                      onClick={clearFavorites}
                      className={`flex-1 px-3 py-2 text-sm rounded-lg transition-colors duration-200 ${
                        darkMode
                          ? 'bg-red-900/50 text-red-300 hover:bg-red-800/50'
                          : 'bg-red-50 text-red-700 hover:bg-red-100'
                      }`}
                    >
                      Clear All
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Quick Help */}
            <div className={`backdrop-blur-sm rounded-2xl p-6 shadow-sm border transition-colors duration-300 ${
              darkMode 
                ? 'bg-gray-800/70 border-gray-700/50' 
                : 'bg-white/80 border-white/20'
            }`}>
              <h3 className={`text-lg font-semibold mb-3 transition-colors duration-300 ${
                darkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Quick Tips
              </h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className={`mt-0.5 ${
                    darkMode ? 'text-blue-400' : 'text-blue-500'
                  }`}>•</span>
                  <span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
                    Search by book title or partial names
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className={`mt-0.5 ${
                    darkMode ? 'text-blue-400' : 'text-blue-500'
                  }`}>•</span>
                  <span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
                    Click the star icon to save favorites
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className={`mt-0.5 ${
                    darkMode ? 'text-blue-400' : 'text-blue-500'
                  }`}>•</span>
                  <span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
                    Use sort options to organize results
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className={`mt-0.5 ${
                    darkMode ? 'text-blue-400' : 'text-blue-500'
                  }`}>•</span>
                  <span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
                    Click "View Details" for more information
                  </span>
                </li>
              </ul>
            </div>
          </aside>
        </main>

        {/* Mobile Favorites Drawer */}
        <div className={`fixed inset-0 z-50 transition-transform duration-300 ${
          favDrawerOpen ? 'translate-y-0' : 'translate-y-full'
        } lg:hidden`}>
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setFavDrawerOpen(false)}
          />
          <div className={`absolute bottom-0 left-0 right-0 rounded-t-3xl p-6 max-h-[85vh] overflow-auto shadow-2xl transition-colors duration-300 ${
            darkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className={`flex items-center justify-between mb-6 pb-4 border-b ${
              darkMode ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <h3 className={`text-xl font-bold ${
                darkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Your Favorites
              </h3>
              <button
                onClick={() => setFavDrawerOpen(false)}
                className={`p-2 rounded-lg transition-colors duration-200 ${
                  darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                }`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {favorites.length === 0 ? (
              <div className="text-center py-12">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                  darkMode ? 'bg-gray-700' : 'bg-gray-100'
                }`}>
                  <svg className={`w-8 h-8 ${
                    darkMode ? 'text-gray-400' : 'text-gray-400'
                  }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
                <p className={`mb-2 transition-colors duration-300 ${
                  darkMode ? 'text-gray-300' : 'text-gray-600'
                }`}>
                  No favorites yet
                </p>
                <p className={`text-sm ${
                  darkMode ? 'text-gray-500' : 'text-gray-500'
                }`}>
                  Tap the star icon on books to add them here
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {favorites.map(fav => (
                  <div key={fav.key} className={`flex items-center gap-4 p-4 rounded-xl transition-colors duration-300 ${
                    darkMode ? 'bg-gray-700/50' : 'bg-gray-50'
                  }`}>
                    <div className={`w-16 h-20 rounded-lg overflow-hidden flex-shrink-0 ${
                      darkMode ? 'bg-gray-600' : 'bg-gray-200'
                    }`}>
                      {fav.cover_i ? (
                        <img 
                          src={`https://covers.openlibrary.org/b/id/${fav.cover_i}-M.jpg`} 
                          alt={fav.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className={`w-full h-full flex items-center justify-center ${
                          darkMode ? 'text-gray-400' : 'text-gray-400'
                        }`}>
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className={`font-semibold line-clamp-2 ${
                        darkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                        {fav.title}
                      </h4>
                      <p className={`text-sm mt-1 ${
                        darkMode ? 'text-gray-300' : 'text-gray-600'
                      }`}>
                        {fav.author_name?.slice(0, 2).join(', ') || 'Unknown author'}
                      </p>
                      {fav.first_publish_year && (
                        <p className={`text-xs mt-1 ${
                          darkMode ? 'text-gray-500' : 'text-gray-500'
                        }`}>
                          Published: {fav.first_publish_year}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => toggleFavorite(fav)}
                      className={`p-2 rounded-lg transition-colors duration-200 ${
                        darkMode 
                          ? 'text-red-400 hover:bg-red-900/50' 
                          : 'text-red-500 hover:bg-red-50'
                      }`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {favorites.length > 0 && (
              <div className="flex gap-3 pt-6 mt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => navigator.clipboard?.writeText(JSON.stringify(favorites, null, 2))}
                  className={`flex-1 py-3 rounded-xl font-medium transition-colors duration-200 ${
                    darkMode
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Copy JSON
                </button>
                <button
                  onClick={clearFavorites}
                  className={`flex-1 py-3 rounded-xl font-medium transition-colors duration-200 ${
                    darkMode
                      ? 'bg-red-500 text-white hover:bg-red-600'
                      : 'bg-red-500 text-white hover:bg-red-600'
                  }`}
                >
                  Clear All
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className={`mt-12 pt-8 border-t transition-colors duration-300 ${
          darkMode ? 'border-gray-700/50' : 'border-gray-200/50'
        }`}>
          <div className="text-center text-sm transition-colors duration-300">
            <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
              Built with ❤️ for book lovers • Powered by Open Library API
            </p>
            <p className={`mt-2 text-xs transition-colors duration-300 ${
              darkMode ? 'text-gray-500' : 'text-gray-500'
            }`}>
              Discover, explore, and organize your literary journey
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}