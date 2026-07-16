// Shared taxonomy constants used across composer, articles, search, and filters.
// Tags and regions here are the canonical list for the app — update here to reflect everywhere.

export const STORY_TAGS = [
  'CONFLICT', 'CYBER', 'GEOPOLITICS', 'MILITARY', 'HUMANITARIAN',
  'NUCLEAR', 'MARITIME', 'INTELLIGENCE', 'BREAKING', 'SECURITY',
  'ECONOMIC', 'ENERGY', 'OTHER',
]

export const COMPOSER_TAGS = [
  'MILITARY', 'CYBER', 'MARITIME', 'GEOPOLITICAL', 'HUMANITARIAN',
  'ECONOMIC', 'ENERGY', 'OTHER',
]

export const REGIONS_LIST = [
  'Global', 'Middle East', 'Europe', 'Asia Pacific',
  'North America', 'South America', 'Africa',
  'Central Asia', 'Eastern Europe', 'Arctic',
]

export const MAP_FILTERS = [
  'ALL', 'CONFLICT', 'MARITIME', 'CYBER',
  'MILITARY', 'GEOPOLITICS', 'NUCLEAR', 'SECURITY',
]

export const DATE_OPTIONS = [
  { id: 'all', label: 'All Time' },
  { id: '1h',  label: 'Past Hour' },
  { id: '24h', label: 'Past 24h' },
  { id: '7d',  label: 'Past Week' },
]
