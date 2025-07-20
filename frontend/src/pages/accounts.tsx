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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress,
  Fab
} from '@mui/material'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  AccountBalance as AccountIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  MonetizationOn as MoneyIcon,
  Business as BusinessIcon,
  Receipt as ExpenseIcon
} from '@mui/icons-material'
import { toast } from 'react-hot-toast'

interface Account {
  code: string
  name: string
  type: string
  normal_balance: string
  balance: number
  parent_account?: string
  is_active: boolean
  description?: string
}

interface ChartOfAccounts {
  [key: string]: {
    type: string
    normal_balance: string
    accounts: Account[]
  }
}

const accountTypes = [
  { value: 'assets', label: 'Assets', icon: <AccountIcon />, color: '#00e676' },
  { value: 'liabilities', label: 'Liabilities', icon: <TrendingDownIcon />, color: '#ff9800' },
  { value: 'equity', label: 'Equity', icon: <MoneyIcon />, color: '#7c4dff' },
  { value: 'revenue', label: 'Revenue', icon: <TrendingUpIcon />, color: '#00e676' },
  { value: 'expenses', label: 'Expenses', icon: <ExpenseIcon />, color: '#f44336' }
]

export default function AccountsPage() {
  const { token, company } = useAuth()
  const [chartData, setChartData] = useState<ChartOfAccounts>({})
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    type: 'assets',
    normal_balance: 'debit',
    description: '',
    parent_account: ''
  })

  useEffect(() => {
    if (token && company) {
      fetchChartOfAccounts()
    }
  }, [token, company])

  const fetchChartOfAccounts = async () => {
    if (!token || !company) {
      setLoading(false)
      return
    }
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/accounts/${company.id}/chart`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setChartData(data.chart_of_accounts)
      } else {
        toast.error('Failed to load chart of accounts')
      }
    } catch (error) {
      toast.error('Connection error')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDialog = (account?: Account) => {
    if (account) {
      setEditingAccount(account)
      setFormData({
        code: account.code,
        name: account.name,
        type: account.type,
        normal_balance: account.normal_balance,
        description: account.description || '',
        parent_account: account.parent_account || ''
      })
    } else {
      setEditingAccount(null)
      setFormData({
        code: '',
        name: '',
        type: 'assets',
        normal_balance: 'debit',
        description: '',
        parent_account: ''
      })
    }
    setDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setEditingAccount(null)
  }

  const handleSaveAccount = async () => {
    try {
      const url = editingAccount 
        ? `http://localhost:3001/api/v1/accounts/${editingAccount.code}`
        : 'http://localhost:3001/api/v1/accounts'
      
      const response = await fetch(url, {
        method: editingAccount ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (response.ok) {
        toast.success(editingAccount ? 'Account updated!' : 'Account created!')
        fetchChartOfAccounts() // Refresh data
        handleCloseDialog()
      } else {
        toast.error(data.error || 'Failed to save account')
      }
    } catch (error) {
      toast.error('Connection error')
    }
  }

  const handleDeleteAccount = async (code: string) => {
    if (!confirm('Are you sure you want to delete this account?')) return

    try {
      const response = await fetch(`http://localhost:3001/api/v1/accounts/${code}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        toast.success('Account deleted!')
        fetchChartOfAccounts()
      } else {
        const data = await response.json()
        toast.error(data.error || 'Failed to delete account')
      }
    } catch (error) {
      toast.error('Connection error')
    }
  }

  const calculateTotals = () => {
    const totals: { [key: string]: number } = {}
    Object.entries(chartData).forEach(([key, accountType]) => {
      let typeTotal = 0
      if (accountType && accountType.categories) {
        Object.values(accountType.categories).forEach((category: any) => {
          if (category.accounts && Array.isArray(category.accounts)) {
            typeTotal += category.accounts.reduce((sum, account) => sum + (parseFloat(account.opening_balance) || 0), 0)
          }
        })
      }
      totals[key] = typeTotal
    })
    return totals
  }

  const getAccountTypeIcon = (type: string) => {
    const accountType = accountTypes.find(t => t.value === type)
    return accountType?.icon || <AccountIcon />
  }

  const getAccountTypeColor = (type: string) => {
    const accountType = accountTypes.find(t => t.value === type)
    return accountType?.color || '#666'
  }

  if (loading) {
    return (
      <Layout title="Chart of Accounts">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <LinearProgress sx={{ width: '50%', color: '#00f5ff' }} />
        </Box>
      </Layout>
    )
  }

  const totals = calculateTotals()

  return (
    <Layout title="Chart of Accounts">
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Header */}
        <Box display="flex" justifyContent="between" alignItems="center" mb={4}>
          <Box>
            <Typography variant="h4" className="gradient-text" gutterBottom>
              📊 Chart of Accounts
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Manage your complete chart of accounts with GAAP compliance
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            size="large"
          >
            Add Account
          </Button>
        </Box>

        {/* Summary Cards */}
        <Grid container spacing={3} mb={4}>
          {accountTypes.map((type) => (
            <Grid item xs={12} sm={6} md={2.4} key={type.value}>
              <Card className="glass-card">
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="between">
                    <Box>
                      <Typography variant="h5" sx={{ color: type.color }}>
                        ${(totals[type.value] || 0).toLocaleString()}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {type.label}
                      </Typography>
                    </Box>
                    <Box sx={{ color: type.color, fontSize: 32 }}>
                      {type.icon}
                    </Box>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {Object.values(chartData[type.value]?.categories || {}).reduce((total, category: any) => total + (category.accounts?.length || 0), 0)} accounts
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Account Groups */}
        <div data-tutorial="chart-of-accounts">
        {Object.entries(chartData).map(([key, accountType]) => {
          // Count total accounts in this type
          let totalAccounts = 0
          if (accountType && accountType.categories) {
            Object.values(accountType.categories).forEach((category: any) => {
              if (category.accounts) totalAccounts += category.accounts.length
            })
          }
          
          return (
          <Accordion key={key} className="glass-card" sx={{ mb: 2 }} defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box display="flex" alignItems="center" gap={2} width="100%">
                <Box sx={{ color: getAccountTypeColor(key), fontSize: 32 }}>
                  {getAccountTypeIcon(key)}
                </Box>
                <Box flexGrow={1}>
                  <Typography variant="h6" className="gradient-text">
                    {accountType.type_name} Accounts
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Normal Balance: {accountType.normal_balance.toUpperCase()} • {totalAccounts} accounts
                  </Typography>
                </Box>
                <Chip 
                  label={`$${totals[key]?.toLocaleString() || '0'}`}
                  sx={{ 
                    backgroundColor: `${getAccountTypeColor(key)}20`,
                    color: getAccountTypeColor(key),
                    fontWeight: 'bold'
                  }}
                />
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              {Object.entries(accountType.categories || {}).map(([catKey, category]) => (
                <Box key={catKey} mb={3}>
                  <Typography variant="subtitle1" color="primary" gutterBottom sx={{ mb: 2 }}>
                    {category.category_name}
                  </Typography>
                  
                  <TableContainer component={Paper} sx={{ bgcolor: 'rgba(20, 27, 45, 0.5)', mb: 2 }}>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Code</TableCell>
                          <TableCell>Account Name</TableCell>
                          <TableCell align="right">Current Balance</TableCell>
                          <TableCell align="right">Health</TableCell>
                          <TableCell align="center">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {category.accounts.map((account) => (
                      <TableRow key={account.code} hover>
                        <TableCell>
                          <Chip 
                            label={account.code}
                            size="small"
                            variant="outlined"
                            color="primary"
                          />
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" fontWeight="bold">
                              {account.name}
                            </Typography>
                            {account.description && (
                              <Typography variant="caption" color="text.secondary">
                                {account.description}
                              </Typography>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          <Typography 
                            variant="body2"
                            fontWeight="bold"
                            color={(parseFloat(account.opening_balance) || 0) >= 0 ? 'inherit' : 'error'}
                          >
                            ${(parseFloat(account.opening_balance) || 0).toLocaleString()}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <LinearProgress
                            variant="determinate"
                            value={Math.min(100, (Math.abs(parseFloat(account.opening_balance) || 0) / 50000) * 100)}
                            sx={{
                              width: 60,
                              height: 8,
                              borderRadius: 4,
                              backgroundColor: 'rgba(255,255,255,0.1)',
                              '& .MuiLinearProgress-bar': {
                                backgroundColor: Math.abs(parseFloat(account.opening_balance) || 0) > 25000 ? '#00e676' : '#ff9800'
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <IconButton 
                            size="small" 
                            onClick={() => handleOpenDialog(account)}
                            sx={{ mr: 1 }}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton 
                            size="small" 
                            onClick={() => handleDeleteAccount(account.code)}
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
                  </Box>
                ))}
              </AccordionDetails>
            </Accordion>
          )
        })}
        </div>

        {/* GAAP Compliance Alert */}
        <Alert severity="info" sx={{ mt: 3 }}>
          <Typography variant="body2">
            <strong>GAAP Compliance:</strong> All accounts follow Generally Accepted Accounting Principles. 
            Assets and Expenses have normal debit balances, while Liabilities, Equity, and Revenue have normal credit balances.
          </Typography>
        </Alert>

        {/* Add Account FAB */}
        <Fab
          color="primary"
          aria-label="add account"
          onClick={() => handleOpenDialog()}
          data-tutorial="create-account-button"
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16
          }}
        >
          <AddIcon />
        </Fab>

        {/* Add/Edit Account Dialog */}
        <Dialog 
          open={dialogOpen} 
          onClose={handleCloseDialog}
          maxWidth="sm"
          fullWidth
          disableAutoFocus
          disableEnforceFocus
          PaperProps={{
            sx: {
              bgcolor: 'rgba(20, 27, 45, 0.95)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.1)'
            }
          }}
        >
          <DialogTitle>
            {editingAccount ? 'Edit Account' : 'Add New Account'}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Account Code"
                  value={formData.code}
                  onChange={(e) => setFormData({...formData, code: e.target.value})}
                  placeholder="e.g., 1001"
                  disabled={!!editingAccount}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Account Type</InputLabel>
                  <Select
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                  >
                    {accountTypes.map((type) => (
                      <MenuItem key={type.value} value={type.value}>
                        <Box display="flex" alignItems="center" gap={1}>
                          {type.icon}
                          {type.label}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Account Name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g., Cash in Bank"
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Normal Balance</InputLabel>
                  <Select
                    value={formData.normal_balance}
                    onChange={(e) => setFormData({...formData, normal_balance: e.target.value})}
                  >
                    <MenuItem value="debit">Debit</MenuItem>
                    <MenuItem value="credit">Credit</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Optional description"
                  multiline
                  rows={2}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button 
              onClick={handleSaveAccount}
              variant="contained"
              disabled={!formData.code || !formData.name}
            >
              {editingAccount ? 'Update' : 'Create'} Account
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Layout>
  )
}