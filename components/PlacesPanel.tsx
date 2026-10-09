'use client';

import React, { useState, useMemo } from 'react';
import { Place } from '@/lib/types';
import { Search, MapPin, Star, Tag } from 'lucide-react';

interface PlacesPanelProps {
  places: Place[];
  selectedPlace: Place | null;
  onSelectPlace: (place: Place) => void;
  onSetOrigin: (place: Place) => void;
  onSetDestination: (place: Place) => void;
}

export default function PlacesPanel({
  places,
  selectedPlace,
  onSelectPlace,
  onSetOrigin,
  onSetDestination,
}: PlacesPanelProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = useMemo(() => {
    const cats = new Set(places.map(p => p.category));
    return ['all', ...Array.from(cats)];
  }, [places]);

  const filteredPlaces = useMemo(() => {
    return places.filter(place => {
      const matchesSearch =
        place.name.toLowerCase().includes(search.toLowerCase()) ||
        place.tags.some(t => t.toLowerCase().includes(search.toLowerCase())) ||
        (place.shortDescription && place.shortDescription.toLowerCase().includes(search.toLowerCase()));

      const matchesCategory =
        selectedCategory === 'all' || place.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [places, search, selectedCategory]);

  return (
    <div className="flex flex-col h-full bg-slate-950/40 backdrop-blur-md">
      {/* Search & Filter Header */}
      <div className="p-4 border-b border-slate-800 space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Pune landmarks, cafes, gardens..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-lg capitalize whitespace-nowrap transition-colors text-[11px] font-medium ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                  : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800/80'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Places List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-400 px-1 mb-1">
          <span>{filteredPlaces.length} Curated Pune Spots</span>
          <span className="text-[10px] text-slate-500">Live Geo Index</span>
        </div>

        {filteredPlaces.map((place) => {
          const isSelected = selectedPlace?.id === place.id;

          return (
            <div
              key={place.id}
              onClick={() => onSelectPlace(place)}
              className={`group p-3.5 rounded-xl border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-slate-900 border-blue-500/60 shadow-lg shadow-blue-500/10'
                  : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-900/90 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div>
                  <h3 className="font-semibold text-sm text-white group-hover:text-blue-300 transition-colors flex items-center gap-1.5">
                    {place.name}
                  </h3>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                    <span className="capitalize text-blue-400 font-medium">
                      {place.category}
                    </span>
                    {place.rating && (
                      <span className="flex items-center gap-0.5 text-amber-400 font-medium">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        {place.rating}
                      </span>
                    )}
                    <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-800 text-slate-300 uppercase">
                      {place.accessibilityStatus}
                    </span>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectPlace(place);
                  }}
                  className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded-lg transition-colors"
                  title="Locate on Map"
                >
                  <MapPin className="w-4 h-4" />
                </button>
              </div>

              {place.shortDescription && (
                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-3">
                  {place.shortDescription}
                </p>
              )}

              {/* Tags & Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-xs">
                <div className="flex items-center gap-1 overflow-hidden">
                  <Tag className="w-3 h-3 text-slate-500 shrink-0" />
                  <span className="text-[10px] text-slate-400 truncate">
                    {place.tags.join(', ')}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSetOrigin(place);
                    }}
                    className="px-2 py-0.8 rounded text-[10px] font-medium bg-emerald-950/60 text-emerald-300 hover:bg-emerald-900/60 border border-emerald-500/30 transition-colors"
                    title="Set as Origin for Route"
                  >
                    Start
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSetDestination(place);
                    }}
                    className="px-2 py-0.8 rounded text-[10px] font-medium bg-blue-950/60 text-blue-300 hover:bg-blue-900/60 border border-blue-500/30 transition-colors"
                    title="Set as Destination for Route"
                  >
                    Destination
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filteredPlaces.length === 0 && (
          <div className="p-8 text-center text-slate-500 text-xs">
            No places found matching &ldquo;{search}&rdquo;.
          </div>
        )}
      </div>
    </div>
  );
}
