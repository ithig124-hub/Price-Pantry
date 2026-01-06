import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { debounce } from "@/lib/utils";

export const SearchBar = ({ initialQuery = "", onSearch, large = false }) => {
  const [query, setQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);
  const navigate = useNavigate();

  // Debounced fetch suggestions
  const fetchSuggestions = useCallback(
    debounce(async (searchQuery) => {
      if (searchQuery.length < 2) {
        setSuggestions([]);
        return;
      }
      setLoading(true);
      try {
        const results = await api.getSuggestions(searchQuery);
        setSuggestions(results);
      } catch (error) {
        console.error("Error fetching suggestions:", error);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 300),
    []
  );

  useEffect(() => {
    fetchSuggestions(query);
  }, [query, fetchSuggestions]);

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target) &&
        !inputRef.current.contains(event.target)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      setShowSuggestions(false);
      if (onSearch) {
        onSearch(query.trim());
      } else {
        navigate(`/search?q=${encodeURIComponent(query.trim())}`);
      }
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setQuery(suggestion.name);
    setShowSuggestions(false);
    if (onSearch) {
      onSearch(suggestion.name);
    } else {
      navigate(`/search?q=${encodeURIComponent(suggestion.name)}`);
    }
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        if (selectedIndex >= 0) {
          e.preventDefault();
          handleSuggestionClick(suggestions[selectedIndex]);
        }
        break;
      case "Escape":
        setShowSuggestions(false);
        break;
      default:
        break;
    }
  };

  const clearQuery = () => {
    setQuery("");
    setSuggestions([]);
    inputRef.current?.focus();
  };

  return (
    <div className={`relative w-full ${large ? "max-w-2xl" : "max-w-xl"}`} data-testid="search-bar">
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowSuggestions(true);
              setSelectedIndex(-1);
            }}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={handleKeyDown}
            placeholder="Search for groceries..."
            className={`pl-12 pr-24 ${
              large
                ? "h-16 text-lg border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]"
                : "h-12 border-2 border-black"
            } rounded-xl focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[#00E676]`}
            data-testid="search-input"
          />
          {query && (
            <button
              type="button"
              onClick={clearQuery}
              className="absolute right-20 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full"
              data-testid="clear-search"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
          <Button
            type="submit"
            className={`absolute right-2 top-1/2 -translate-y-1/2 bg-[#00E676] text-black font-bold border-2 border-black hover:bg-[#00E676]/90 ${
              large ? "px-6 py-2" : "px-4 py-1"
            }`}
            data-testid="search-submit"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
          </Button>
        </div>
      </form>

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-black rounded-xl overflow-hidden z-50 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]"
          data-testid="search-suggestions"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.id}
              onClick={() => handleSuggestionClick(suggestion)}
              className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors border-b border-gray-100 last:border-0 ${
                index === selectedIndex ? "bg-[#00E676]/10" : "hover:bg-gray-50"
              }`}
              data-testid={`suggestion-${index}`}
            >
              <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-black truncate">{suggestion.name}</p>
                <p className="text-sm text-gray-500 truncate">
                  {suggestion.brand} · {suggestion.category}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
