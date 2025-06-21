import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import Layout from '../components/Layout'
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Grid,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Alert,
  Divider,
  LinearProgress,
  Fab,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Badge,
  Autocomplete
} from '@mui/material'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Receipt as TransactionIcon,
  SmartToy as AIIcon,
  Check as CheckIcon,
  Warning as WarningIcon,
  AccountBalance as AccountIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Visibility as ViewIcon,
  FilterList as FilterIcon
} from '@mui/icons-material'
import { toast } from 'react-hot-toast'

interface JournalEntry {
  account_code: string
  account_name: string
  debit_amount: number
  credit_amount: number
  description: string
}

interface Transaction {
  id: string
  reference: string
  date: string
  description: string
  entries: JournalEntry[]
  total_amount: number
  is_balanced: boolean
  status: 'draft' | 'posted' | 'reviewed'
  created_by: string
  created_at: string
  ai_generated?: boolean
  confidence_score?: number
}

interface Account {
  code: string
  name: string
  type: string
  balance: number
}

export default function TransactionsPage() {
  const { token, user } = useAuth()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [viewTransaction, setViewTransaction] = useState<Transaction | null>(null)
  const [aiDialogOpen, setAiDialogOpen] = useState(false)
  
  const [formData, setFormData] = useState({
    reference: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    entries: [
      { account_code: '', account_name: '', debit_amount: 0, credit_amount: 0, description: '' },
      { account_code: '', account_name: '', debit_amount: 0, credit_amount: 0, description: '' }
    ]
  })

  const [aiFormData, setAiFormData] = useState({
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0]
  })

  const [filter, setFilter] = useState({
    status: 'all',
    dateFrom: '',
    dateTo: '',
    search: ''
  })

  useEffect(() => {
    if (token) {
      fetchTransactions()
      fetchAccounts()
    }
  }, [token])

  const fetchTransactions = async () => {
    try {
      // Mock transaction data for now - in real app this would come from API
      const mockTransactions: Transaction[] = [
        {
          id: '1',
          reference: 'JE-001',
          date: '2024-01-15',
          description: 'Office supplies purchase',
          entries: [
            {
              account_code: '6700',
              account_name: 'Office Expense',
              debit_amount: 156.78,
              credit_amount: 0,
              description: 'Office supplies from Staples'
            },
            {
              account_code: '1001',
              account_name: 'Cash',
              debit_amount: 0,
              credit_amount: 156.78,
              description: 'Payment for office supplies'
            }
          ],
          total_amount: 156.78,
          is_balanced: true,
          status: 'posted',
          created_by: user?.first_name || 'User',
          created_at: '2024-01-15T10:30:00Z',
          ai_generated: true,
          confidence_score: 0.95
        },
        {
          id: '2',
          reference: 'JE-002',
          date: '2024-01-16',
          description: 'Customer payment received',
          entries: [
            {
              account_code: '1001',
              account_name: 'Cash',
              debit_amount: 2500.00,
              credit_amount: 0,
              description: 'Customer payment'
            },
            {
              account_code: '4000',
              account_name: 'Revenue',
              debit_amount: 0,
              credit_amount: 2500.00,
              description: 'Consulting services revenue'
            }
          ],
          total_amount: 2500.00,
          is_balanced: true,
          status: 'posted',
          created_by: user?.first_name || 'User',
          created_at: '2024-01-16T14:15:00Z'
        }
      ]
      setTransactions(mockTransactions)
    } catch (error) {
      toast.error('Failed to load transactions')
    } finally {
      setLoading(false)
    }
  }

  const fetchAccounts = async () => {
    if (!token) {
      return
    }
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/accounts/chart`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      const data = await response.json()
      
      if (response.ok) {
        const allAccounts: Account[] = []
        Object.values(data.chart_of_accounts).forEach((group: any) => {
          allAccounts.push(...group.accounts)
        })
        setAccounts(allAccounts)
      }
    } catch (error) {
      console.error('Failed to fetch accounts:', error)
    }
  }

  const handleOpenDialog = (transaction?: Transaction) => {
    if (transaction) {
      setEditingTransaction(transaction)
      setFormData({
        reference: transaction.reference,
        date: transaction.date,
        description: transaction.description,
        entries: [...transaction.entries]
      })
    } else {
      setEditingTransaction(null)
      setFormData({
        reference: `JE-${String(transactions.length + 1).padStart(3, '0')}`,
        date: new Date().toISOString().split('T')[0],
        description: '',
        entries: [
          { account_code: '', account_name: '', debit_amount: 0, credit_amount: 0, description: '' },
          { account_code: '', account_name: '', debit_amount: 0, credit_amount: 0, description: '' }
        ]
      })
    }
    setDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setEditingTransaction(null)
  }

  const addEntry = () => {
    setFormData({
      ...formData,
      entries: [
        ...formData.entries,
        { account_code: '', account_name: '', debit_amount: 0, credit_amount: 0, description: '' }
      ]
    })
  }

  const removeEntry = (index: number) => {
    if (formData.entries.length > 2) {
      const newEntries = formData.entries.filter((_, i) => i !== index)
      setFormData({ ...formData, entries: newEntries })
    }
  }

  const updateEntry = (index: number, field: string, value: any) => {
    const newEntries = [...formData.entries]
    if (field === 'account') {
      newEntries[index].account_code = value.code
      newEntries[index].account_name = value.name
    } else {
      newEntries[index] = { ...newEntries[index], [field]: value }
    }
    setFormData({ ...formData, entries: newEntries })
  }

  const calculateTotals = () => {
    const totalDebits = formData.entries.reduce((sum, entry) => sum + (entry.debit_amount || 0), 0)
    const totalCredits = formData.entries.reduce((sum, entry) => sum + (entry.credit_amount || 0), 0)
    return { totalDebits, totalCredits, isBalanced: Math.abs(totalDebits - totalCredits) < 0.01 }
  }

  const handleSaveTransaction = async () => {
    const { isBalanced } = calculateTotals()
    
    if (!isBalanced) {
      toast.error('Transaction must be balanced (debits = credits)')
      return
    }

    try {
      // In real app, this would save to backend
      const newTransaction: Transaction = {
        id: String(Date.now()),
        reference: formData.reference,
        date: formData.date,
        description: formData.description,
        entries: formData.entries,
        total_amount: formData.entries.reduce((sum, entry) => sum + (entry.debit_amount || entry.credit_amount), 0) / 2,
        is_balanced: true,
        status: 'draft',
        created_by: user?.first_name || 'User',
        created_at: new Date().toISOString()
      }

      if (editingTransaction) {
        setTransactions(prev => prev.map(t => t.id === editingTransaction.id ? newTransaction : t))
        toast.success('Transaction updated!')
      } else {
        setTransactions(prev => [newTransaction, ...prev])
        toast.success('Transaction created!')
      }

      handleCloseDialog()
    } catch (error) {
      toast.error('Failed to save transaction')
    }
  }

  const handleAIAnalysis = async () => {
    if (!token) {
      toast.error('Authentication required')
      return
    }
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/ai/test/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(aiFormData)
      })

      const data = await response.json()
      
      if (response.ok) {
        // Convert AI suggestion to transaction form
        setFormData({
          reference: `JE-${String(transactions.length + 1).padStart(3, '0')}`,
          date: aiFormData.date,
          description: aiFormData.description,
          entries: data.analysis.suggested_entries
        })
        setAiDialogOpen(false)
        setDialogOpen(true)
        toast.success('AI analysis complete! Review and save transaction.')
      } else {
        toast.error(data.error || 'AI analysis failed')
      }
    } catch (error) {
      toast.error('Connection error')
    }
  }

  const getStatusChip = (status: string) => {
    const colors = {
      draft: 'warning',
      posted: 'success',
      reviewed: 'info'
    } as const
    
    return (
      <Chip 
        label={status.toUpperCase()} 
        color={colors[status as keyof typeof colors]} 
        size="small" 
      />
    )
  }

  const filteredTransactions = transactions.filter(transaction => {
    if (filter.status !== 'all' && transaction.status !== filter.status) return false
    if (filter.search && !transaction.description.toLowerCase().includes(filter.search.toLowerCase())) return false
    return true
  })

  if (loading) {
    return (
      <Layout title="Transactions">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <LinearProgress sx={{ width: '50%', color: '#00f5ff' }} />
        </Box>
      </Layout>
    )
  }

  const { totalDebits, totalCredits, isBalanced } = calculateTotals()

  return (
    <Layout title="Transactions & Journal Entries">
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Header */}
        <Box display="flex" justifyContent="between" alignItems="center" mb={4}>
          <Box>
            <Typography variant="h4" className="gradient-text" gutterBottom>
              📝 Transaction Management
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Create, manage, and review all journal entries and transactions
            </Typography>
          </Box>
          <Box display="flex" gap={2}>
            <Button
              variant="outlined"
              startIcon={<AIIcon />}
              onClick={() => setAiDialogOpen(true)}
            >
              AI Assistant
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
              size="large"
            >
              New Transaction
            </Button>
          </Box>
        </Box>

        {/* Summary Cards */}
        <Grid container spacing={3} mb={4}>
          <Grid item xs={12} sm={6} md={3}>
            <Card className="glass-card">
              <CardContent>
                <Typography variant="h5" className="neon-text">
                  {transactions.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Transactions
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card className="glass-card">
              <CardContent>
                <Typography variant="h5" sx={{ color: '#00e676' }}>
                  {transactions.filter(t => t.status === 'posted').length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Posted
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card className="glass-card">
              <CardContent>
                <Typography variant="h5" sx={{ color: '#ff9800' }}>
                  {transactions.filter(t => t.status === 'draft').length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Drafts
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card className="glass-card">
              <CardContent>
                <Badge badgeContent={transactions.filter(t => t.ai_generated).length} color="primary">
                  <AIIcon sx={{ color: '#00f5ff', fontSize: 32 }} />
                </Badge>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  AI Generated
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Filters */}
        <Card className="glass-card" sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={filter.status}
                    onChange={(e) => setFilter({...filter, status: e.target.value})}
                  >
                    <MenuItem value="all">All Status</MenuItem>
                    <MenuItem value="draft">Draft</MenuItem>
                    <MenuItem value="posted">Posted</MenuItem>
                    <MenuItem value="reviewed">Reviewed</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Search descriptions"
                  value={filter.search}
                  onChange={(e) => setFilter({...filter, search: e.target.value})}
                  placeholder="Search transaction descriptions..."
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<FilterIcon />}
                  onClick={() => setFilter({ status: 'all', dateFrom: '', dateTo: '', search: '' })}
                >
                  Reset Filters
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Transactions Table */}
        <Card className="glass-card">
          <CardContent>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Reference</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell align="center">Status</TableCell>
                    <TableCell align="center">Balance</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredTransactions.map((transaction) => (
                    <TableRow key={transaction.id} hover>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="body2" fontWeight="bold">
                            {transaction.reference}
                          </Typography>
                          {transaction.ai_generated && (
                            <Chip 
                              icon={<AIIcon />} 
                              label="AI" 
                              size="small" 
                              color="primary"
                              variant="outlined"
                            />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(transaction.date).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {transaction.description}
                        </Typography>
                        {transaction.confidence_score && (
                          <Typography variant="caption" color="text.secondary">
                            AI Confidence: {Math.round(transaction.confidence_score * 100)}%
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="bold">
                          ${transaction.total_amount.toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        {getStatusChip(transaction.status)}
                      </TableCell>
                      <TableCell align="center">
                        {transaction.is_balanced ? (
                          <CheckIcon sx={{ color: '#00e676' }} />
                        ) : (
                          <WarningIcon sx={{ color: '#f44336' }} />
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <IconButton 
                          size="small" 
                          onClick={() => setViewTransaction(transaction)}
                          sx={{ mr: 1 }}
                        >
                          <ViewIcon />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          onClick={() => handleOpenDialog(transaction)}
                          sx={{ mr: 1 }}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>

        {/* Floating Action Button */}
        <Fab
          color="primary"
          aria-label="add transaction"
          onClick={() => handleOpenDialog()}
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
        >
          <AddIcon />
        </Fab>

        {/* AI Analysis Dialog */}
        <Dialog 
          open={aiDialogOpen} 
          onClose={() => setAiDialogOpen(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              bgcolor: 'rgba(20, 27, 45, 0.95)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(0, 245, 255, 0.3)'
            }
          }}
        >
          <DialogTitle className="gradient-text">
            🤖 AI Transaction Assistant
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Transaction Description"
                  value={aiFormData.description}
                  onChange={(e) => setAiFormData({...aiFormData, description: e.target.value})}
                  placeholder="e.g., Office supplies from Staples"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Amount"
                  type="number"
                  value={aiFormData.amount}
                  onChange={(e) => setAiFormData({...aiFormData, amount: e.target.value})}
                  placeholder="156.78"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Date"
                  type="date"
                  value={aiFormData.date}
                  onChange={(e) => setAiFormData({...aiFormData, date: e.target.value})}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAiDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleAIAnalysis}
              variant="contained"
              startIcon={<AIIcon />}
              disabled={!aiFormData.description || !aiFormData.amount}
            >
              Generate Journal Entry
            </Button>
          </DialogActions>
        </Dialog>

        {/* Transaction Form Dialog */}
        <Dialog 
          open={dialogOpen} 
          onClose={handleCloseDialog}
          maxWidth="lg"
          fullWidth
          PaperProps={{
            sx: {
              bgcolor: 'rgba(20, 27, 45, 0.95)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.1)'
            }
          }}
        >
          <DialogTitle>
            {editingTransaction ? 'Edit Transaction' : 'New Transaction'}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Reference"
                  value={formData.reference}
                  onChange={(e) => setFormData({...formData, reference: e.target.value})}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
              </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" gutterBottom>
              Journal Entries
            </Typography>

            {formData.entries.map((entry, index) => (
              <Card key={index} sx={{ mb: 2, bgcolor: 'rgba(255,255,255,0.05)' }}>
                <CardContent>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={4}>
                      <Autocomplete
                        options={accounts}
                        getOptionLabel={(option) => `${option.code} - ${option.name}`}
                        value={accounts.find(a => a.code === entry.account_code) || null}
                        onChange={(_, value) => value && updateEntry(index, 'account', value)}
                        renderInput={(params) => (
                          <TextField {...params} label="Account" fullWidth />
                        )}
                      />
                    </Grid>
                    <Grid item xs={12} sm={2}>
                      <TextField
                        fullWidth
                        label="Debit"
                        type="number"
                        value={entry.debit_amount || ''}
                        onChange={(e) => updateEntry(index, 'debit_amount', parseFloat(e.target.value) || 0)}
                      />
                    </Grid>
                    <Grid item xs={12} sm={2}>
                      <TextField
                        fullWidth
                        label="Credit"
                        type="number"
                        value={entry.credit_amount || ''}
                        onChange={(e) => updateEntry(index, 'credit_amount', parseFloat(e.target.value) || 0)}
                      />
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <TextField
                        fullWidth
                        label="Description"
                        value={entry.description}
                        onChange={(e) => updateEntry(index, 'description', e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={12} sm={1}>
                      <IconButton 
                        onClick={() => removeEntry(index)}
                        disabled={formData.entries.length <= 2}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            ))}

            <Button onClick={addEntry} startIcon={<AddIcon />} sx={{ mb: 2 }}>
              Add Entry
            </Button>

            {/* Balance Check */}
            <Alert 
              severity={isBalanced ? 'success' : 'error'} 
              sx={{ mb: 2 }}
            >
              <Typography variant="body2">
                <strong>Debits:</strong> ${totalDebits.toFixed(2)} | 
                <strong> Credits:</strong> ${totalCredits.toFixed(2)} | 
                <strong> Difference:</strong> ${(totalDebits - totalCredits).toFixed(2)}
                {isBalanced ? ' ✓ Balanced' : ' ⚠ Not Balanced'}
              </Typography>
            </Alert>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button 
              onClick={handleSaveTransaction}
              variant="contained"
              disabled={!isBalanced || !formData.description}
            >
              {editingTransaction ? 'Update' : 'Create'} Transaction
            </Button>
          </DialogActions>
        </Dialog>

        {/* View Transaction Dialog */}
        <Dialog 
          open={!!viewTransaction} 
          onClose={() => setViewTransaction(null)}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              bgcolor: 'rgba(20, 27, 45, 0.95)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.1)'
            }
          }}
        >
          {viewTransaction && (
            <>
              <DialogTitle>
                Transaction Details: {viewTransaction.reference}
              </DialogTitle>
              <DialogContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">Date</Typography>
                    <Typography variant="body1">{viewTransaction.date}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">Status</Typography>
                    {getStatusChip(viewTransaction.status)}
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">Description</Typography>
                    <Typography variant="body1">{viewTransaction.description}</Typography>
                  </Grid>
                </Grid>

                <Divider sx={{ my: 2 }} />

                <Typography variant="h6" gutterBottom>Journal Entries</Typography>
                <TableContainer component={Paper} sx={{ bgcolor: 'rgba(255,255,255,0.05)' }}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Account</TableCell>
                        <TableCell align="right">Debit</TableCell>
                        <TableCell align="right">Credit</TableCell>
                        <TableCell>Description</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {viewTransaction.entries.map((entry, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Typography variant="body2">
                              {entry.account_code} - {entry.account_name}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            {entry.debit_amount > 0 && `$${entry.debit_amount.toFixed(2)}`}
                          </TableCell>
                          <TableCell align="right">
                            {entry.credit_amount > 0 && `$${entry.credit_amount.toFixed(2)}`}
                          </TableCell>
                          <TableCell>{entry.description}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setViewTransaction(null)}>Close</Button>
                <Button 
                  onClick={() => {
                    setViewTransaction(null)
                    handleOpenDialog(viewTransaction)
                  }}
                  variant="outlined"
                >
                  Edit
                </Button>
              </DialogActions>
            </>
          )}
        </Dialog>
      </Container>
    </Layout>
  )
}