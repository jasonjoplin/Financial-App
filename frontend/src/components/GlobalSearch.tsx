import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import {
  Box,
  TextField,
  Dialog,
  DialogContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemButton,
  Chip,
  Divider,
  InputAdornment,
  CircularProgress,
  Paper,
  Alert
} from '@mui/material'
import {
  Search as SearchIcon,
  Receipt as TransactionIcon,
  AccountBalance as AccountIcon,
  People as ContactIcon,
  Description as InvoiceIcon,
  Payment as PaymentIcon,
  SmartToy as AIIcon,
  TrendingUp as TrendingUpIcon,
  Assessment as ReportIcon,
  Close as CloseIcon
} from '@mui/icons-material'

interface SearchResult {
  id: string
  type: 'transaction' | 'account' | 'contact' | 'invoice' | 'payment' | 'report'
  title: string
  subtitle?: string
  description?: string
  path: string
  relevance: number
  metadata?: {
    amount?: number
    date?: string
    status?: string
    tags?: string[]
  }
}

interface GlobalSearchProps {
  open: boolean
  onClose: () => void
}

export default function GlobalSearch({ open, onClose }: GlobalSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const router = useRouter()
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Mock search data - in real app this would come from API/database
  const searchData: SearchResult[] = [
    {
      id: '1',
      type: 'transaction',
      title: 'Office supplies purchase',
      subtitle: 'JE-001',
      description: 'Transaction from Office Depot',
      path: '/transactions',
      relevance: 0.95,
      metadata: {
        amount: 156.78,
        date: '2024-01-15',
        status: 'posted',
        tags: ['expense', 'office', 'supplies']
      }
    },
    {
      id: '2',
      type: 'account',
      title: 'Cash Account',
      subtitle: '1001',
      description: 'Primary operating cash account',
      path: '/accounts',
      relevance: 0.88,
      metadata: {
        amount: 15000.00,
        status: 'active'
      }
    },
    {
      id: '3',
      type: 'contact',
      title: 'Acme Corporation',
      subtitle: 'Customer',
      description: 'john.smith@acme.com • (555) 123-4567',
      path: '/contacts',
      relevance: 0.82,
      metadata: {
        amount: 2500.00,
        status: 'active',
        tags: ['customer', 'enterprise']
      }
    },
    {
      id: '4',
      type: 'invoice',
      title: 'Invoice INV-001',
      subtitle: 'Acme Corporation',
      description: 'Consulting services - January 2024',
      path: '/invoices',
      relevance: 0.90,
      metadata: {
        amount: 2712.50,
        date: '2024-01-15',
        status: 'sent',
        tags: ['consulting', 'monthly']
      }
    },
    {
      id: '5',
      type: 'payment',
      title: 'Payment PMT-001',
      subtitle: 'Bank Transfer',
      description: 'Payment for Invoice INV-001',
      path: '/payments',
      relevance: 0.75,
      metadata: {
        amount: 2712.50,
        date: '2024-01-15',
        status: 'completed'
      }
    },
    {
      id: '6',
      type: 'report',
      title: 'Profit & Loss Statement',
      subtitle: 'Financial Report',
      description: 'Monthly P&L report for January 2024',
      path: '/reports',
      relevance: 0.70,
      metadata: {
        date: '2024-01-31',
        tags: ['monthly', 'pnl']
      }
    }
  ]

  useEffect(() => {
    if (open && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 100)
    }
  }, [open])

  useEffect(() => {
    if (query.length > 0) {
      performSearch(query)
    } else {
      setResults([])
    }
  }, [query])

  const performSearch = async (searchQuery: string) => {
    setLoading(true)
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300))
    
    const filtered = searchData.filter(item => {
      const searchTerm = searchQuery.toLowerCase()
      
      // Search in title, subtitle, description
      const titleMatch = item.title.toLowerCase().includes(searchTerm)
      const subtitleMatch = item.subtitle?.toLowerCase().includes(searchTerm)
      const descriptionMatch = item.description?.toLowerCase().includes(searchTerm)
      
      // Search in metadata tags
      const tagMatch = item.metadata?.tags?.some(tag => 
        tag.toLowerCase().includes(searchTerm)
      )
      
      // Search by amount (if query is numeric)
      const numericQuery = parseFloat(searchQuery)
      const amountMatch = !isNaN(numericQuery) && item.metadata?.amount === numericQuery
      
      return titleMatch || subtitleMatch || descriptionMatch || tagMatch || amountMatch
    })
    
    // Sort by relevance and query match quality
    const sorted = filtered.sort((a, b) => {
      const aRelevance = calculateRelevance(a, searchQuery)
      const bRelevance = calculateRelevance(b, searchQuery)
      return bRelevance - aRelevance
    })
    
    setResults(sorted.slice(0, 10)) // Limit to top 10 results
    setSelectedIndex(0)
    setLoading(false)
  }

  const calculateRelevance = (item: SearchResult, query: string): number => {
    const searchTerm = query.toLowerCase()
    let score = item.relevance
    
    // Boost score for exact title matches
    if (item.title.toLowerCase().includes(searchTerm)) {
      score += 0.3
    }
    
    // Boost score for subtitle matches
    if (item.subtitle?.toLowerCase().includes(searchTerm)) {
      score += 0.2
    }
    
    // Boost score for tag matches
    if (item.metadata?.tags?.some(tag => tag.toLowerCase().includes(searchTerm))) {
      score += 0.15
    }
    
    return score
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setSelectedIndex(prev => Math.min(prev + 1, results.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setSelectedIndex(prev => Math.max(prev - 1, 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      if (results[selectedIndex]) {
        navigateToResult(results[selectedIndex])
      }
    } else if (event.key === 'Escape') {
      handleClose()
    }
  }

  const navigateToResult = (result: SearchResult) => {
    router.push(result.path)
    handleClose()
  }

  const handleClose = () => {
    setQuery('')
    setResults([])
    setSelectedIndex(0)
    onClose()
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'transaction': return <TransactionIcon />
      case 'account': return <AccountIcon />
      case 'contact': return <ContactIcon />
      case 'invoice': return <InvoiceIcon />
      case 'payment': return <PaymentIcon />
      case 'report': return <ReportIcon />
      default: return <SearchIcon />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'transaction': return '#00e676'
      case 'account': return '#2196f3'
      case 'contact': return '#ff9800'
      case 'invoice': return '#9c27b0'
      case 'payment': return '#4caf50'
      case 'report': return '#f44336'
      default: return '#757575'
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'transaction': return 'Transaction'
      case 'account': return 'Account'
      case 'contact': return 'Contact'
      case 'invoice': return 'Invoice'
      case 'payment': return 'Payment'
      case 'report': return 'Report'
      default: return type
    }
  }

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: 'rgba(20, 27, 45, 0.98)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(0, 245, 255, 0.3)',
          borderRadius: 3,
          mt: 5
        }
      }}
    >
      <DialogContent sx={{ p: 0 }}>
        {/* Search Input */}
        <Box sx={{ p: 3, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <TextField
            ref={searchInputRef}
            fullWidth
            placeholder="Search transactions, accounts, contacts, invoices..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: '#00f5ff' }} />
                </InputAdornment>
              ),
              endAdornment: loading && (
                <InputAdornment position="end">
                  <CircularProgress size={20} sx={{ color: '#00f5ff' }} />
                </InputAdornment>
              ),
              sx: {
                '& .MuiOutlinedInput-root': {
                  '& fieldset': {
                    borderColor: 'rgba(0, 245, 255, 0.3)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'rgba(0, 245, 255, 0.5)',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#00f5ff',
                  },
                }
              }
            }}
          />
          
          {query.length > 0 && (
            <Box display="flex" alignItems="center" gap={1} mt={2}>
              <Typography variant="caption" color="text.secondary">
                {results.length} result(s) found
              </Typography>
              <Chip 
                icon={<AIIcon />} 
                label="AI Enhanced" 
                size="small" 
                color="primary"
                variant="outlined"
              />
            </Box>
          )}
        </Box>

        {/* Search Results */}
        <Box sx={{ maxHeight: '60vh', overflow: 'auto' }}>
          {query.length === 0 && (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <SearchIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Global Search
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Search across transactions, accounts, contacts, invoices, payments, and reports
              </Typography>
              
              <Box mt={3}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Quick tips:
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText 
                      primary="Search by amount: 156.78"
                      secondary="Find transactions with specific amounts"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Search by type: expense, revenue"
                      secondary="Filter by transaction categories"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Search by contact: Acme Corp"
                      secondary="Find related transactions and invoices"
                    />
                  </ListItem>
                </List>
              </Box>
            </Box>
          )}

          {query.length > 0 && results.length === 0 && !loading && (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Alert severity="info">
                <Typography variant="body2">
                  No results found for "{query}". Try different keywords or check spelling.
                </Typography>
              </Alert>
            </Box>
          )}

          {results.length > 0 && (
            <List sx={{ p: 0 }}>
              {results.map((result, index) => (
                <React.Fragment key={result.id}>
                  <ListItemButton
                    selected={selectedIndex === index}
                    onClick={() => navigateToResult(result)}
                    sx={{
                      py: 2,
                      px: 3,
                      backgroundColor: selectedIndex === index ? 'rgba(0, 245, 255, 0.1)' : 'transparent',
                      '&:hover': {
                        backgroundColor: 'rgba(0, 245, 255, 0.05)'
                      }
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      <Box sx={{ color: getTypeColor(result.type) }}>
                        {getIcon(result.type)}
                      </Box>
                    </ListItemIcon>
                    
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="body1" fontWeight="bold">
                            {result.title}
                          </Typography>
                          <Chip 
                            label={getTypeLabel(result.type)}
                            size="small"
                            sx={{ 
                              backgroundColor: `${getTypeColor(result.type)}20`,
                              color: getTypeColor(result.type),
                              fontSize: '0.75rem'
                            }}
                          />
                        </Box>
                      }
                      secondary={
                        <Box>
                          {result.subtitle && (
                            <Typography variant="body2" color="text.secondary">
                              {result.subtitle}
                            </Typography>
                          )}
                          {result.description && (
                            <Typography variant="caption" color="text.secondary">
                              {result.description}
                            </Typography>
                          )}
                          
                          {result.metadata && (
                            <Box display="flex" gap={1} mt={1} flexWrap="wrap">
                              {result.metadata.amount && (
                                <Chip 
                                  label={`$${result.metadata.amount.toLocaleString()}`}
                                  size="small"
                                  variant="outlined"
                                  sx={{ fontSize: '0.7rem', height: 20 }}
                                />
                              )}
                              {result.metadata.date && (
                                <Chip 
                                  label={new Date(result.metadata.date).toLocaleDateString()}
                                  size="small"
                                  variant="outlined"
                                  sx={{ fontSize: '0.7rem', height: 20 }}
                                />
                              )}
                              {result.metadata.status && (
                                <Chip 
                                  label={result.metadata.status}
                                  size="small"
                                  variant="outlined"
                                  color={result.metadata.status === 'active' || result.metadata.status === 'completed' ? 'success' : 'default'}
                                  sx={{ fontSize: '0.7rem', height: 20 }}
                                />
                              )}
                            </Box>
                          )}
                        </Box>
                      }
                    />
                    
                    <Box sx={{ ml: 2, textAlign: 'right' }}>
                      <Typography variant="caption" color="text.secondary">
                        {Math.round(result.relevance * 100)}% match
                      </Typography>
                    </Box>
                  </ListItemButton>
                  
                  {index < results.length - 1 && (
                    <Divider sx={{ borderColor: 'rgba(255,255,255,0.05)' }} />
                  )}
                </React.Fragment>
              ))}
            </List>
          )}
        </Box>

        {/* Keyboard Shortcuts */}
        {query.length > 0 && results.length > 0 && (
          <Box sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(0,0,0,0.2)' }}>
            <Typography variant="caption" color="text.secondary">
              Use ↑↓ to navigate • Enter to select • Esc to close
            </Typography>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  )
}