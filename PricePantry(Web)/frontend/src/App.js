import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import HomePage from "@/pages/HomePage";
import SearchResultsPage from "@/pages/SearchResultsPage";
import FavoritesPage from "@/pages/FavoritesPage";
import AlertsPage from "@/pages/AlertsPage";
import ShoppingListPage from "@/pages/ShoppingListPage";

function App() {
  return (
    <div className="app-container">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<SearchResultsPage />} />
          <Route path="/favorites" element={<FavoritesPage />} />
          <Route path="/alerts" element={<AlertsPage />} />
          <Route path="/shopping-list" element={<ShoppingListPage />} />
        </Routes>
        <Toaster position="bottom-right" />
      </BrowserRouter>
    </div>
  );
}

export default App;
