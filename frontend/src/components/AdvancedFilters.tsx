import React, { useState } from 'react'
import {
  Box,
  Button,
  Collapse,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Typography,
  Card,
  CardContent,
  Autocomplete,
  Slider,
  Switch,
  FormControlLabel,
  Divider,
  Alert
} from '@mui/material'
import {
  FilterList as FilterIcon,
  Clear as ClearIcon,
  Save as SaveIcon,
  Tune as TuneIcon,
  DateRange as DateIcon,
  AttachMoney as MoneyIcon,
  Person as PersonIcon,
  Category as CategoryIcon
} from '@mui/icons-material'

interface FilterOption {
  label: string
  value: string
  type: 'text' | 'select' | 'date' | 'amount' | 'multiselect' | 'boolean' | 'range'
  options?: { label: string; value: string }[]
  placeholder?: string
  min?: number
  max?: number
}

interface AdvancedFiltersProps {
  filters: FilterOption[]
  values: Record<string, any>
  onChange: (values: Record<string, any>) => void
  onApply: () => void
  onClear: () => void
  savedFilters?: { name: string; filters: Record<string, any> }[]
  onSaveFilter?: (name: string, filters: Record<string, any>) => void
  resultCount?: number
}

export default function AdvancedFilters({
  filters,
  values,
  onChange,
  onApply,
  onClear,
  savedFilters = [],
  onSaveFilter,
  resultCount
}: AdvancedFiltersProps) {
  const [expanded, setExpanded] = useState(false)
  const [saveFilterName, setSaveFilterName] = useState('')
  const [showSaveDialog, setShowSaveDialog] = useState(false)

  const handleFilterChange = (key: string, value: any) => {
    onChange({
      ...values,
      [key]: value
    })
  }

  const handleApply = () => {
    onApply()
    setExpanded(false)
  }

  const handleClear = () => {
    onClear()
    setExpanded(false)
  }

  const handleSaveFilter = () => {
    if (saveFilterName.trim() && onSaveFilter) {
      onSaveFilter(saveFilterName.trim(), values)
      setSaveFilterName('')
      setShowSaveDialog(false)
    }
  }

  const handleLoadSavedFilter = (savedFilter: { name: string; filters: Record<string, any> }) => {
    onChange(savedFilter.filters)
    setExpanded(false)
  }

  const getActiveFilterCount = () => {
    return Object.values(values).filter(value => {
      if (Array.isArray(value)) return value.length > 0
      if (typeof value === 'string') return value.trim().length > 0
      if (typeof value === 'number') return value !== 0
      if (typeof value === 'boolean') return value
      return false
    }).length
  }

  const renderFilter = (filter: FilterOption) => {
    const value = values[filter.value] || ''

    switch (filter.type) {
      case 'text':
        return (
          <TextField
            fullWidth
            label={filter.label}
            value={value}
            onChange={(e) => handleFilterChange(filter.value, e.target.value)}
            placeholder={filter.placeholder}
            size="small"
          />
        )

      case 'select':
        return (
          <FormControl fullWidth size="small">
            <InputLabel>{filter.label}</InputLabel>
            <Select
              value={value}
              onChange={(e) => handleFilterChange(filter.value, e.target.value)}
            >
              <MenuItem value="">All</MenuItem>
              {filter.options?.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )

      case 'multiselect':
        return (
          <Autocomplete
            multiple
            options={filter.options || []}
            getOptionLabel={(option) => option.label}
            value={filter.options?.filter(option => (value || []).includes(option.value)) || []}
            onChange={(_, newValue) => handleFilterChange(filter.value, newValue.map(v => v.value))}
            renderTags={(selected, getTagProps) =>
              selected.map((option, index) => (
                <Chip
                  variant="outlined"
                  label={option.label}
                  size="small"
                  {...getTagProps({ index })}
                  key={option.value}
                />
              ))
            }
            renderInput={(params) => (
              <TextField
                {...params}
                label={filter.label}
                placeholder={filter.placeholder}
                size="small"
              />
            )}
          />
        )

      case 'date':
        return (
          <TextField
            fullWidth
            label={filter.label}
            type="date"
            value={value}
            onChange={(e) => handleFilterChange(filter.value, e.target.value)}
            InputLabelProps={{ shrink: true }}
            size="small"
          />
        )

      case 'amount':
        return (
          <Grid container spacing={1} alignItems="center">
            <Grid item xs={6}>
              <TextField
                fullWidth
                label={`Min ${filter.label}`}
                type="number"
                value={value?.min || ''}
                onChange={(e) => handleFilterChange(filter.value, {
                  ...value,
                  min: parseFloat(e.target.value) || 0
                })}
                size="small"
                inputProps={{ step: 0.01 }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label={`Max ${filter.label}`}
                type="number"
                value={value?.max || ''}
                onChange={(e) => handleFilterChange(filter.value, {
                  ...value,
                  max: parseFloat(e.target.value) || 0
                })}
                size="small"
                inputProps={{ step: 0.01 }}
              />
            </Grid>
          </Grid>
        )

      case 'range':
        return (
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {filter.label}: ${(value?.min || filter.min || 0).toLocaleString()} - ${(value?.max || filter.max || 10000).toLocaleString()}
            </Typography>
            <Slider
              value={[value?.min || filter.min || 0, value?.max || filter.max || 10000]}
              onChange={(_, newValue) => handleFilterChange(filter.value, {
                min: (newValue as number[])[0],
                max: (newValue as number[])[1]
              })}
              min={filter.min || 0}
              max={filter.max || 10000}
              step={100}
              valueLabelDisplay="auto"
              valueLabelFormat={(value) => `$${value.toLocaleString()}`}
            />
          </Box>
        )

      case 'boolean':
        return (
          <FormControlLabel
            control={
              <Switch
                checked={value || false}
                onChange={(e) => handleFilterChange(filter.value, e.target.checked)}
              />
            }
            label={filter.label}
          />
        )

      default:
        return null
    }
  }

  const activeFilterCount = getActiveFilterCount()

  return (
    <Card sx={{ mb: 3, bgcolor: 'rgba(255,255,255,0.02)' }}>
      <CardContent sx={{ pb: expanded ? 2 : '16px !important' }}>
        {/* Filter Header */}
        <Box display="flex" justifyContent="between" alignItems="center">
          <Box display="flex" alignItems="center" gap={2}>
            <Button
              startIcon={<FilterIcon />}
              onClick={() => setExpanded(!expanded)}
              variant={activeFilterCount > 0 ? "contained" : "outlined"}
              size="small"
            >
              Filters
              {activeFilterCount > 0 && (
                <Chip 
                  label={activeFilterCount} 
                  size="small" 
                  sx={{ ml: 1, height: 20 }}
                />
              )}
            </Button>

            {savedFilters.length > 0 && (
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Saved Filters</InputLabel>
                <Select
                  value=""
                  onChange={(e) => {
                    const savedFilter = savedFilters.find(f => f.name === e.target.value)
                    if (savedFilter) handleLoadSavedFilter(savedFilter)
                  }}
                >
                  {savedFilters.map((savedFilter) => (
                    <MenuItem key={savedFilter.name} value={savedFilter.name}>
                      {savedFilter.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </Box>

          <Box display="flex" alignItems="center" gap={1}>
            {resultCount !== undefined && (
              <Typography variant="body2" color="text.secondary">
                {resultCount} result(s)
              </Typography>
            )}
            
            {activeFilterCount > 0 && (
              <Button
                startIcon={<ClearIcon />}
                onClick={handleClear}
                size="small"
                color="secondary"
              >
                Clear
              </Button>
            )}
          </Box>
        </Box>

        {/* Active Filters Summary */}
        {activeFilterCount > 0 && !expanded && (
          <Box mt={2}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Active filters:
            </Typography>
            <Box display="flex" gap={1} flexWrap="wrap">
              {Object.entries(values)
                .filter(([_, value]) => {
                  if (Array.isArray(value)) return value.length > 0
                  if (typeof value === 'string') return value.trim().length > 0
                  if (typeof value === 'number') return value !== 0
                  if (typeof value === 'boolean') return value
                  return false
                })
                .map(([key, value]) => {
                  const filter = filters.find(f => f.value === key)
                  if (!filter) return null

                  let displayValue = value
                  if (Array.isArray(value)) {
                    displayValue = `${value.length} selected`
                  } else if (typeof value === 'object' && value.min !== undefined) {
                    displayValue = `$${value.min.toLocaleString()} - $${value.max.toLocaleString()}`
                  }

                  return (
                    <Chip
                      key={key}
                      label={`${filter.label}: ${displayValue}`}
                      size="small"
                      variant="outlined"
                      onDelete={() => handleFilterChange(key, '')}
                    />
                  )
                })}
            </Box>
          </Box>
        )}

        {/* Expanded Filter Panel */}
        <Collapse in={expanded}>
          <Box mt={3}>
            <Grid container spacing={2}>
              {filters.map((filter) => (
                <Grid item xs={12} sm={6} md={4} key={filter.value}>
                  {renderFilter(filter)}
                </Grid>
              ))}
            </Grid>

            <Divider sx={{ my: 2 }} />

            {/* Filter Actions */}
            <Box display="flex" justifyContent="between" alignItems="center">
              <Box display="flex" gap={1}>
                <Button
                  variant="contained"
                  onClick={handleApply}
                  size="small"
                  startIcon={<FilterIcon />}
                >
                  Apply Filters
                </Button>
                
                <Button
                  variant="outlined"
                  onClick={handleClear}
                  size="small"
                  startIcon={<ClearIcon />}
                >
                  Clear All
                </Button>
              </Box>

              {onSaveFilter && (
                <Box display="flex" gap={1}>
                  {!showSaveDialog ? (
                    <Button
                      variant="outlined"
                      onClick={() => setShowSaveDialog(true)}
                      size="small"
                      startIcon={<SaveIcon />}
                      disabled={activeFilterCount === 0}
                    >
                      Save Filter
                    </Button>
                  ) : (
                    <Box display="flex" gap={1} alignItems="center">
                      <TextField
                        size="small"
                        placeholder="Filter name"
                        value={saveFilterName}
                        onChange={(e) => setSaveFilterName(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSaveFilter()}
                      />
                      <Button
                        onClick={handleSaveFilter}
                        size="small"
                        disabled={!saveFilterName.trim()}
                      >
                        Save
                      </Button>
                      <Button
                        onClick={() => {
                          setShowSaveDialog(false)
                          setSaveFilterName('')
                        }}
                        size="small"
                        color="secondary"
                      >
                        Cancel
                      </Button>
                    </Box>
                  )}
                </Box>
              )}
            </Box>

            {/* Help Text */}
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="caption">
                <strong>Pro tip:</strong> Use advanced filters to quickly find specific transactions, 
                contacts, or records. Save frequently used filter combinations for faster access.
              </Typography>
            </Alert>
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  )
}

// Common filter configurations for different pages
export const transactionFilters: FilterOption[] = [
  {
    label: 'Description',
    value: 'description',
    type: 'text',
    placeholder: 'Search transaction descriptions'
  },
  {
    label: 'Amount Range',
    value: 'amount',
    type: 'range',
    min: 0,
    max: 10000
  },
  {
    label: 'Date From',
    value: 'date_from',
    type: 'date'
  },
  {
    label: 'Date To',
    value: 'date_to',
    type: 'date'
  },
  {
    label: 'Status',
    value: 'status',
    type: 'select',
    options: [
      { label: 'Draft', value: 'draft' },
      { label: 'Posted', value: 'posted' },
      { label: 'Reviewed', value: 'reviewed' }
    ]
  },
  {
    label: 'AI Generated',
    value: 'ai_generated',
    type: 'boolean'
  },
  {
    label: 'Account Type',
    value: 'account_type',
    type: 'multiselect',
    options: [
      { label: 'Assets', value: 'assets' },
      { label: 'Liabilities', value: 'liabilities' },
      { label: 'Equity', value: 'equity' },
      { label: 'Revenue', value: 'revenue' },
      { label: 'Expenses', value: 'expenses' }
    ]
  }
]

export const contactFilters: FilterOption[] = [
  {
    label: 'Name or Email',
    value: 'search',
    type: 'text',
    placeholder: 'Search by name or email'
  },
  {
    label: 'Type',
    value: 'type',
    type: 'select',
    options: [
      { label: 'Customer', value: 'customer' },
      { label: 'Vendor', value: 'vendor' }
    ]
  },
  {
    label: 'Status',
    value: 'status',
    type: 'select',
    options: [
      { label: 'Active', value: 'active' },
      { label: 'Inactive', value: 'inactive' }
    ]
  },
  {
    label: 'Balance Range',
    value: 'balance',
    type: 'range',
    min: 0,
    max: 50000
  },
  {
    label: 'Location',
    value: 'location',
    type: 'multiselect',
    options: [
      { label: 'New York', value: 'NY' },
      { label: 'California', value: 'CA' },
      { label: 'Texas', value: 'TX' },
      { label: 'Illinois', value: 'IL' }
    ]
  }
]

export const invoiceFilters: FilterOption[] = [
  {
    label: 'Invoice Number',
    value: 'number',
    type: 'text',
    placeholder: 'Search by invoice number'
  },
  {
    label: 'Contact',
    value: 'contact',
    type: 'text',
    placeholder: 'Search by contact name'
  },
  {
    label: 'Type',
    value: 'type',
    type: 'select',
    options: [
      { label: 'Invoice', value: 'invoice' },
      { label: 'Bill', value: 'bill' }
    ]
  },
  {
    label: 'Status',
    value: 'status',
    type: 'multiselect',
    options: [
      { label: 'Draft', value: 'draft' },
      { label: 'Sent', value: 'sent' },
      { label: 'Paid', value: 'paid' },
      { label: 'Overdue', value: 'overdue' },
      { label: 'Cancelled', value: 'cancelled' }
    ]
  },
  {
    label: 'Amount Range',
    value: 'amount',
    type: 'range',
    min: 0,
    max: 25000
  },
  {
    label: 'Issue Date From',
    value: 'issue_date_from',
    type: 'date'
  },
  {
    label: 'Issue Date To',
    value: 'issue_date_to',
    type: 'date'
  },
  {
    label: 'Due Date From',
    value: 'due_date_from',
    type: 'date'
  },
  {
    label: 'Due Date To',
    value: 'due_date_to',
    type: 'date'
  }
]