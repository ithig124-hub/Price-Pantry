import React, { useState, useEffect } from "react";
import { Filter, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { STORE_INFO } from "@/lib/utils";

const CATEGORIES = [
  "Fruit & Veg",
  "Dairy & Eggs",
  "Meat & Seafood",
  "Bakery",
  "Pantry",
  "Frozen",
  "Beverages",
  "Snacks",
  "Household",
  "Personal Care",
];

export const FilterPanel = ({ filters, onFilterChange, onReset }) => {
  const [priceRange, setPriceRange] = useState([0, 50]);
  const [openSections, setOpenSections] = useState({
    category: true,
    store: true,
    price: false,
  });

  const toggleSection = (section) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const handleCategoryChange = (category) => {
    onFilterChange({
      ...filters,
      category: filters.category === category ? null : category,
    });
  };

  const handleStoreChange = (store) => {
    onFilterChange({
      ...filters,
      store: filters.store === store ? null : store,
    });
  };

  const handlePriceChange = (values) => {
    setPriceRange(values);
    onFilterChange({
      ...filters,
      min_price: values[0] > 0 ? values[0] : null,
      max_price: values[1] < 50 ? values[1] : null,
    });
  };

  const FilterContent = () => (
    <div className="space-y-6" data-testid="filter-content">
      {/* Category Filter */}
      <Collapsible
        open={openSections.category}
        onOpenChange={() => toggleSection("category")}
      >
        <CollapsibleTrigger className="flex items-center justify-between w-full py-2 font-bold text-lg dark:text-white">
          Category
          <ChevronDown
            className={`w-5 h-5 transition-transform ${
              openSections.category ? "rotate-180" : ""
            }`}
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2 pt-2">
          {CATEGORIES.map((category) => (
            <label
              key={category}
              className="flex items-center gap-3 cursor-pointer py-1"
            >
              <Checkbox
                checked={filters.category === category}
                onCheckedChange={() => handleCategoryChange(category)}
                data-testid={`filter-category-${category.toLowerCase().replace(/\s+/g, "-")}`}
              />
              <span className="text-sm dark:text-gray-300">{category}</span>
            </label>
          ))}
        </CollapsibleContent>
      </Collapsible>

      {/* Store Filter */}
      <Collapsible
        open={openSections.store}
        onOpenChange={() => toggleSection("store")}
      >
        <CollapsibleTrigger className="flex items-center justify-between w-full py-2 font-bold text-lg dark:text-white">
          Store
          <ChevronDown
            className={`w-5 h-5 transition-transform ${
              openSections.store ? "rotate-180" : ""
            }`}
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2 pt-2">
          {Object.entries(STORE_INFO).map(([key, store]) => (
            <label
              key={key}
              className="flex items-center gap-3 cursor-pointer py-1"
            >
              <Checkbox
                checked={filters.store === key}
                onCheckedChange={() => handleStoreChange(key)}
                data-testid={`filter-store-${key}`}
              />
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: store.color }}
                />
                <span className="text-sm dark:text-gray-300">{store.name}</span>
              </div>
            </label>
          ))}
        </CollapsibleContent>
      </Collapsible>

      {/* Price Range Filter */}
      <Collapsible
        open={openSections.price}
        onOpenChange={() => toggleSection("price")}
      >
        <CollapsibleTrigger className="flex items-center justify-between w-full py-2 font-bold text-lg dark:text-white">
          Price Range
          <ChevronDown
            className={`w-5 h-5 transition-transform ${
              openSections.price ? "rotate-180" : ""
            }`}
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-4 px-1">
          <Slider
            value={priceRange}
            onValueChange={handlePriceChange}
            max={50}
            step={1}
            className="w-full"
            data-testid="price-range-slider"
          />
          <div className="flex justify-between mt-2 text-sm text-gray-600 dark:text-gray-400">
            <span>${priceRange[0]}</span>
            <span>${priceRange[1]}+</span>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Reset Filters */}
      <Button
        variant="outline"
        onClick={onReset}
        className="w-full border-2 border-black dark:border-gray-600 dark:text-white font-bold"
        data-testid="reset-filters-btn"
      >
        Reset Filters
      </Button>
    </div>
  );

  return (
    <>
      {/* Desktop Filter Panel */}
      <div className="hidden lg:block w-64 flex-shrink-0">
        <div className="sticky top-24 bg-white dark:bg-gray-800 border-2 border-black dark:border-gray-600 rounded-xl p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] transition-colors">
          <h2 className="font-bold text-xl mb-4 flex items-center gap-2 dark:text-white">
            <Filter className="w-5 h-5" />
            Filters
          </h2>
          <FilterContent />
        </div>
      </div>

      {/* Mobile Filter Sheet */}
      <div className="lg:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              className="border-2 border-black dark:border-gray-600 dark:text-white font-bold flex items-center gap-2"
              data-testid="mobile-filter-trigger"
            >
              <Filter className="w-4 h-4" />
              Filters
              {(filters.category || filters.store || filters.min_price || filters.max_price) && (
                <span className="bg-[#00E676] text-black text-xs px-2 py-0.5 rounded-full">
                  Active
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[300px] p-0 dark:bg-gray-900">
            <div className="p-4 border-b-2 border-black dark:border-gray-700 flex items-center justify-between">
              <h2 className="font-bold text-xl flex items-center gap-2 dark:text-white">
                <Filter className="w-5 h-5" />
                Filters
              </h2>
              <SheetClose asChild>
                <Button variant="ghost" size="icon" className="dark:text-white">
                  <X className="w-5 h-5" />
                </Button>
              </SheetClose>
            </div>
            <div className="p-4 overflow-y-auto max-h-[calc(100vh-80px)]">
              <FilterContent />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
};

export default FilterPanel;
