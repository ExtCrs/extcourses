// hooks/common/usePagination.js
// Pagination utilities for SWR hooks

import { useState, useMemo } from 'react'

/**
 * Pagination hook for data tables
 * Provides pagination state management and utilities
 */
export function usePagination(options = {}) {
  const {
    initialPage = 1,
    pageSize = 12,
    total = 0
  } = options

  const [page, setPage] = useState(initialPage)

  // Calculate pagination values
  const pagination = useMemo(() => {
    const totalPages = Math.ceil(total / pageSize)
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    const hasNext = page < totalPages
    const hasPrev = page > 1

    return {
      page,
      pageSize,
      total,
      totalPages,
      from,
      to,
      hasNext,
      hasPrev,
      range: { from, to }
    }
  }, [page, pageSize, total])

  // Navigation functions
  const goToPage = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPage(newPage)
    }
  }

  const nextPage = () => {
    if (pagination.hasNext) {
      setPage(page + 1)
    }
  }

  const prevPage = () => {
    if (pagination.hasPrev) {
      setPage(page - 1)
    }
  }

  const firstPage = () => setPage(1)

  const lastPage = () => setPage(pagination.totalPages)

  const reset = () => setPage(initialPage)

  return {
    ...pagination,
    setPage,
    goToPage,
    nextPage,
    prevPage,
    firstPage,
    lastPage,
    reset
  }
}

/**
 * Generate pagination range for UI components
 */
export function generatePaginationRange(currentPage, totalPages, maxVisible = 5) {
  if (totalPages <= maxVisible) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }

  const half = Math.floor(maxVisible / 2)
  let start = Math.max(currentPage - half, 1)
  let end = Math.min(start + maxVisible - 1, totalPages)

  if (end - start + 1 < maxVisible) {
    start = Math.max(end - maxVisible + 1, 1)
  }

  const range = []
  
  // Add first page if not in range
  if (start > 1) {
    range.push(1)
    if (start > 2) {
      range.push('...')
    }
  }

  // Add middle range
  for (let i = start; i <= end; i++) {
    range.push(i)
  }

  // Add last page if not in range
  if (end < totalPages) {
    if (end < totalPages - 1) {
      range.push('...')
    }
    range.push(totalPages)
  }

  return range
}

/**
 * Search state management for filtered lists
 */
export function useSearch(options = {}) {
  const {
    initialSearch = '',
    minLength = 3,
    debounceMs = 300
  } = options

  const [search, setSearch] = useState(initialSearch)
  const [activeSearch, setActiveSearch] = useState(initialSearch)

  // Debounce search to avoid too many API calls
  const [debounceTimer, setDebounceTimer] = useState(null)

  const updateSearch = (newSearch) => {
    setSearch(newSearch)

    // Clear existing timer
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }

    // Set new timer
    const timer = setTimeout(() => {
      if (newSearch.length === 0 || newSearch.length >= minLength) {
        setActiveSearch(newSearch)
      }
    }, debounceMs)

    setDebounceTimer(timer)
  }

  const clearSearch = () => {
    setSearch('')
    setActiveSearch('')
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }
  }

  return {
    search,
    activeSearch,
    setSearch: updateSearch,
    clearSearch,
    isActive: activeSearch.length >= minLength
  }
}

/**
 * Filter state management for data tables
 */
export function useFilters(initialFilters = {}) {
  const [filters, setFilters] = useState(initialFilters)

  const updateFilter = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const removeFilter = (key) => {
    setFilters(prev => {
      const { [key]: removed, ...rest } = prev
      return rest
    })
  }

  const clearFilters = () => {
    setFilters(initialFilters)
  }

  const hasActiveFilters = useMemo(() => {
    return Object.values(filters).some(value => 
      value !== null && value !== undefined && value !== '' && value !== 'all'
    )
  }, [filters])

  return {
    filters,
    setFilters,
    updateFilter,
    removeFilter,
    clearFilters,
    hasActiveFilters
  }
}

/**
 * Selection state management for data tables
 */
export function useSelection() {
  const [selected, setSelected] = useState([])
  const [allSelected, setAllSelected] = useState(false)

  const isSelected = (id) => selected.includes(id)

  const toggleSelection = (id) => {
    setSelected(prev => {
      if (prev.includes(id)) {
        return prev.filter(item => item !== id)
      } else {
        return [...prev, id]
      }
    })
  }

  const selectAll = (items) => {
    const allIds = items.map(item => item.id)
    setSelected(allIds)
    setAllSelected(true)
  }

  const clearSelection = () => {
    setSelected([])
    setAllSelected(false)
  }

  const toggleSelectAll = (items) => {
    if (allSelected) {
      clearSelection()
    } else {
      selectAll(items)
    }
  }

  return {
    selected,
    allSelected,
    isSelected,
    toggleSelection,
    selectAll,
    clearSelection,
    toggleSelectAll,
    hasSelection: selected.length > 0,
    selectedCount: selected.length
  }
}

/**
 * Sorting state management
 */
export function useSorting(initialSort = { column: 'created_at', ascending: false }) {
  const [sort, setSort] = useState(initialSort)

  const updateSort = (column) => {
    setSort(prev => ({
      column,
      ascending: prev.column === column ? !prev.ascending : false
    }))
  }

  const resetSort = () => setSort(initialSort)

  return {
    sort,
    updateSort,
    resetSort
  }
}