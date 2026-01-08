import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Search, Heart, Bell, ShoppingCart, Menu, X, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { useTheme } from "@/lib/ThemeContext";

export const Header = () => {
  const location = useLocation();
  const { isDark, toggleTheme } = useTheme();

  const navLinks = [
    { path: "/", label: "Home", icon: Search },
    { path: "/shopping-list", label: "List", icon: ShoppingCart },
    { path: "/favorites", label: "Favorites", icon: Heart },
    { path: "/alerts", label: "Alerts", icon: Bell },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-gray-900 border-b-2 border-black dark:border-gray-700 transition-colors" data-testid="header">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2" data-testid="logo-link">
            <div className="w-10 h-10 bg-[#00E676] border-2 border-black dark:border-gray-700 flex items-center justify-center font-bold text-black text-xl">
              P
            </div>
            <span className="font-bold text-xl tracking-tight hidden sm:block dark:text-white">PricePantry</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6" data-testid="desktop-nav">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center gap-2 font-medium transition-colors ${
                    isActive ? "text-black dark:text-white" : "text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white"
                  }`}
                  data-testid={`nav-${link.label.toLowerCase()}`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? "text-[#00E676]" : ""}`} />
                  {link.label}
                </Link>
              );
            })}
            
            {/* Dark Mode Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="ml-2"
              data-testid="theme-toggle"
            >
              {isDark ? (
                <Sun className="w-5 h-5 text-yellow-500" />
              ) : (
                <Moon className="w-5 h-5 text-gray-600" />
              )}
            </Button>
          </nav>

          {/* Mobile Menu */}
          <div className="flex items-center gap-2 md:hidden">
            {/* Mobile Dark Mode Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              data-testid="mobile-theme-toggle"
            >
              {isDark ? (
                <Sun className="w-5 h-5 text-yellow-500" />
              ) : (
                <Moon className="w-5 h-5 text-gray-600" />
              )}
            </Button>
            
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="dark:text-white" data-testid="mobile-menu-trigger">
                  <Menu className="w-6 h-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] p-0 dark:bg-gray-900">
                <div className="flex flex-col h-full">
                  <div className="flex items-center justify-between p-4 border-b-2 border-black dark:border-gray-700">
                    <span className="font-bold text-xl dark:text-white">Menu</span>
                    <SheetClose asChild>
                      <Button variant="ghost" size="icon" className="dark:text-white">
                        <X className="w-5 h-5" />
                      </Button>
                    </SheetClose>
                  </div>
                  <nav className="flex flex-col p-4 gap-2" data-testid="mobile-nav">
                    {navLinks.map((link) => {
                      const Icon = link.icon;
                      const isActive = location.pathname === link.path;
                      return (
                        <SheetClose asChild key={link.path}>
                          <Link
                            to={link.path}
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
                              isActive
                                ? "bg-[#00E676] text-black"
                                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                            }`}
                            data-testid={`mobile-nav-${link.label.toLowerCase()}`}
                          >
                            <Icon className="w-5 h-5" />
                            {link.label}
                          </Link>
                        </SheetClose>
                      );
                    })}
                  </nav>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
