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
  Tabs,
  Tab,
  Alert,
  LinearProgress,
  Fab,
  Divider,
  Autocomplete,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Stepper,
  Step,
  StepLabel,
  Badge
} from '@mui/material'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Payment as PaymentIcon,
  AccountBalance as BankIcon,
  CreditCard as CardIcon,
  Money as CashIcon,
  CheckCircle as CheckIcon,
  Schedule as PendingIcon,
  Error as ErrorIcon,
  Sync as ReconcileIcon,
  Upload as ImportIcon,
  Download as ExportIcon,
  Receipt as ReceiptIcon,
  AttachMoney as MoneyIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Compare as CompareIcon,
  AutoAwesome as AutoIcon
} from '@mui/icons-material'
import { toast } from 'react-hot-toast'

interface Payment {
  id: string
  type: 'payment' | 'receipt'
  reference: string
  date: string
  contact_id?: string
  contact_name?: string
  invoice_id?: string
  invoice_number?: string
  amount: number
  payment_method: 'cash' | 'check' | 'bank_transfer' | 'credit_card' | 'other'
  account_code: string
  account_name: string
  description: string
  status: 'completed' | 'pending' | 'failed' | 'cancelled'
  bank_reference?: string
  reconciled: boolean
  reconciled_date?: string
  created_at: string
  ai_matched?: boolean
}

interface BankTransaction {
  id: string
  date: string
  description: string
  amount: number
  type: 'credit' | 'debit'
  reference: string
  balance: number
  matched_payment_id?: string
  reconciled: boolean
}

interface ReconciliationSuggestion {
  bank_transaction: BankTransaction
  suggested_payments: Payment[]
  confidence_score: number
  auto_match: boolean
}

export default function PaymentsPage() {
  const { token } = useAuth()
  const [payments, setPayments] = useState<Payment[]>([])
  const [bankTransactions, setBankTransactions] = useState<BankTransaction[]>([])
  const [reconciliationSuggestions, setReconciliationSuggestions] = useState<ReconciliationSuggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(0)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [reconcileDialogOpen, setReconcileDialogOpen] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null)
  
  const [formData, setFormData] = useState({
    type: 'payment' as 'payment' | 'receipt',
    reference: '',
    date: new Date().toISOString().split('T')[0],
    contact_id: '',
    invoice_id: '',
    amount: 0,
    payment_method: 'bank_transfer' as const,
    account_code: '1001',
    description: '',
    bank_reference: ''
  })

  const [filter, setFilter] = useState({
    search: '',
    type: 'all',
    status: 'all',
    reconciled: 'all',
    dateFrom: '',
    dateTo: ''
  })

  const [selectedBankFile, setSelectedBankFile] = useState<File | null>(null)

  const paymentMethods = [
    { value: 'cash', label: 'Cash', icon: <CashIcon /> },
    { value: 'check', label: 'Check', icon: <ReceiptIcon /> },
    { value: 'bank_transfer', label: 'Bank Transfer', icon: <BankIcon /> },
    { value: 'credit_card', label: 'Credit Card', icon: <CardIcon /> },
    { value: 'other', label: 'Other', icon: <MoneyIcon /> }
  ]

  useEffect(() => {
    if (token) {
      fetchPayments()
      fetchBankTransactions()
      generateReconciliationSuggestions()
    }
  }, [token])

  const fetchPayments = async () => {
    try {
      // Mock payment data
      const mockPayments: Payment[] = [
        {
          id: '1',
          type: 'receipt',
          reference: 'PMT-001',
          date: '2024-01-15',
          contact_id: '1',
          contact_name: 'Acme Corporation',
          invoice_id: '1',
          invoice_number: 'INV-001',
          amount: 2712.50,
          payment_method: 'bank_transfer',
          account_code: '1001',
          account_name: 'Cash',
          description: 'Payment for Invoice INV-001',
          status: 'completed',
          bank_reference: 'TXN-20240115-001',
          reconciled: true,
          reconciled_date: '2024-01-16T10:00:00Z',
          created_at: '2024-01-15T14:30:00Z'
        },
        {
          id: '2',
          type: 'payment',
          reference: 'PMT-002',
          date: '2024-01-10',
          contact_id: '2',
          contact_name: 'Office Supplies Inc',
          invoice_id: '2',
          invoice_number: 'BILL-001',
          amount: 879.61,
          payment_method: 'bank_transfer',
          account_code: '1001',
          account_name: 'Cash',
          description: 'Payment for Bill BILL-001',
          status: 'completed',
          bank_reference: 'TXN-20240110-002',
          reconciled: true,
          reconciled_date: '2024-01-11T09:00:00Z',
          created_at: '2024-01-10T16:45:00Z'
        },
        {
          id: '3',
          type: 'receipt',
          reference: 'PMT-003',
          date: '2024-01-18',
          contact_id: '3',
          contact_name: 'Sarah Johnson',
          amount: 1200.00,
          payment_method: 'check',
          account_code: '1001',
          account_name: 'Cash',
          description: 'Payment for consulting services',
          status: 'pending',
          reconciled: false,
          created_at: '2024-01-18T11:20:00Z'
        }
      ]
      setPayments(mockPayments)
    } catch (error) {
      toast.error('Failed to load payments')
    } finally {
      setLoading(false)
    }
  }

  const fetchBankTransactions = async () => {
    try {
      // Mock bank transaction data
      const mockBankTransactions: BankTransaction[] = [
        {
          id: 'bt-1',
          date: '2024-01-15',
          description: 'ACME CORP PAYMENT REF:INV001',
          amount: 2712.50,
          type: 'credit',
          reference: 'TXN-20240115-001',
          balance: 15000.00,
          matched_payment_id: '1',
          reconciled: true
        },
        {
          id: 'bt-2',
          date: '2024-01-10',
          description: 'OFFICE SUPPLIES INC',
          amount: -879.61,
          type: 'debit',
          reference: 'TXN-20240110-002',
          balance: 12287.50,
          matched_payment_id: '2',
          reconciled: true
        },
        {
          id: 'bt-3',
          date: '2024-01-18',
          description: 'UNKNOWN DEPOSIT',
          amount: 1200.00,
          type: 'credit',
          reference: 'TXN-20240118-003',
          balance: 16200.00,
          reconciled: false
        },
        {
          id: 'bt-4',
          date: '2024-01-20',
          description: 'MONTHLY SERVICE FEE',
          amount: -25.00,
          type: 'debit',
          reference: 'TXN-20240120-004',
          balance: 16175.00,
          reconciled: false
        }
      ]
      setBankTransactions(mockBankTransactions)
    } catch (error) {
      console.error('Failed to fetch bank transactions:', error)
    }
  }

  const generateReconciliationSuggestions = async () => {
    try {
      // AI-powered reconciliation suggestions
      const mockSuggestions: ReconciliationSuggestion[] = [
        {
          bank_transaction: {
            id: 'bt-3',
            date: '2024-01-18',
            description: 'UNKNOWN DEPOSIT',
            amount: 1200.00,
            type: 'credit',
            reference: 'TXN-20240118-003',
            balance: 16200.00,
            reconciled: false
          },
          suggested_payments: [
            {
              id: '3',
              type: 'receipt',
              reference: 'PMT-003',
              date: '2024-01-18',
              contact_id: '3',
              contact_name: 'Sarah Johnson',
              amount: 1200.00,
              payment_method: 'check',
              account_code: '1001',
              account_name: 'Cash',
              description: 'Payment for consulting services',
              status: 'pending',
              reconciled: false,
              created_at: '2024-01-18T11:20:00Z'
            }
          ],
          confidence_score: 0.95,
          auto_match: true
        }
      ]
      setReconciliationSuggestions(mockSuggestions)
    } catch (error) {
      console.error('Failed to generate suggestions:', error)
    }
  }

  const handleOpenDialog = (payment?: Payment) => {
    if (payment) {
      setEditingPayment(payment)
      setFormData({
        type: payment.type,
        reference: payment.reference,
        date: payment.date,
        contact_id: payment.contact_id || '',
        invoice_id: payment.invoice_id || '',
        amount: payment.amount,
        payment_method: payment.payment_method,
        account_code: payment.account_code,
        description: payment.description,
        bank_reference: payment.bank_reference || ''
      })
    } else {
      setEditingPayment(null)
      setFormData({
        type: activeTab === 0 ? 'receipt' : 'payment',
        reference: `PMT-${String(payments.length + 1).padStart(3, '0')}`,
        date: new Date().toISOString().split('T')[0],
        contact_id: '',
        invoice_id: '',
        amount: 0,
        payment_method: 'bank_transfer',
        account_code: '1001',
        description: '',
        bank_reference: ''
      })
    }
    setDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setEditingPayment(null)
  }

  const handleSavePayment = async () => {
    try {
      const newPayment: Payment = {
        id: editingPayment?.id || String(Date.now()),
        ...formData,
        account_name: 'Cash', // In real app, lookup from account_code
        status: 'completed',
        reconciled: false,
        created_at: editingPayment?.created_at || new Date().toISOString()
      }

      if (editingPayment) {
        setPayments(prev => prev.map(p => p.id === editingPayment.id ? newPayment : p))
        toast.success('Payment updated!')
      } else {
        setPayments(prev => [newPayment, ...prev])
        toast.success('Payment recorded!')
      }

      handleCloseDialog()
    } catch (error) {
      toast.error('Failed to save payment')
    }
  }

  const handleReconcilePayment = (paymentId: string, bankTransactionId: string) => {
    setPayments(prev => prev.map(p => 
      p.id === paymentId ? { 
        ...p, 
        reconciled: true, 
        reconciled_date: new Date().toISOString(),
        ai_matched: true
      } : p
    ))
    
    setBankTransactions(prev => prev.map(bt => 
      bt.id === bankTransactionId ? { 
        ...bt, 
        reconciled: true, 
        matched_payment_id: paymentId 
      } : bt
    ))
    
    toast.success('Payment reconciled!')
  }

  const handleBulkReconcile = () => {
    reconciliationSuggestions.forEach(suggestion => {
      if (suggestion.auto_match && suggestion.confidence_score > 0.9) {
        handleReconcilePayment(
          suggestion.suggested_payments[0].id,
          suggestion.bank_transaction.id
        )
      }
    })
    toast.success('Bulk reconciliation completed!')
  }

  const handleImportBankData = () => {
    if (!selectedBankFile) {
      toast.error('Please select a file')
      return
    }
    
    // In real app, this would parse CSV/OFX file and create bank transactions
    toast.success('Bank data imported successfully!')
    setImportDialogOpen(false)
    setSelectedBankFile(null)
  }

  const getStatusChip = (status: string) => {
    const statusConfig = {
      completed: { color: 'success' as const, icon: <CheckIcon /> },
      pending: { color: 'warning' as const, icon: <PendingIcon /> },
      failed: { color: 'error' as const, icon: <ErrorIcon /> },
      cancelled: { color: 'default' as const, icon: <ErrorIcon /> }
    }
    
    const config = statusConfig[status as keyof typeof statusConfig]
    return (
      <Chip 
        label={status.toUpperCase()} 
        color={config.color}
        size="small"
        icon={config.icon}
      />
    )
  }

  const getPaymentMethodIcon = (method: string) => {
    const methodConfig = paymentMethods.find(m => m.value === method)
    return methodConfig?.icon || <MoneyIcon />
  }

  const filteredPayments = payments.filter(payment => {
    if (activeTab === 0 && payment.type !== 'receipt') return false
    if (activeTab === 1 && payment.type !== 'payment') return false
    
    if (filter.search) {
      const searchLower = filter.search.toLowerCase()
      if (!payment.reference.toLowerCase().includes(searchLower) && 
          !payment.description.toLowerCase().includes(searchLower) &&
          !(payment.contact_name?.toLowerCase().includes(searchLower))) return false
    }
    
    if (filter.status !== 'all' && payment.status !== filter.status) return false
    if (filter.reconciled === 'yes' && !payment.reconciled) return false
    if (filter.reconciled === 'no' && payment.reconciled) return false
    
    return true
  })

  const paymentStats = {
    totalReceipts: payments.filter(p => p.type === 'receipt').reduce((sum, p) => sum + p.amount, 0),
    totalPayments: payments.filter(p => p.type === 'payment').reduce((sum, p) => sum + p.amount, 0),
    unreconciled: payments.filter(p => !p.reconciled).length,
    pendingAmount: payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0)
  }

  const TabPanel = ({ children, value, index }: { children: React.ReactNode, value: number, index: number }) => (
    <div hidden={value !== index}>
      {value === index && children}
    </div>
  )

  if (loading) {
    return (
      <Layout title="Payments">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <LinearProgress sx={{ width: '50%', color: '#00f5ff' }} />
        </Box>
      </Layout>
    )
  }

  return (
    <Layout title="Payment Tracking & Reconciliation">
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Header */}
        <Box display="flex" justifyContent="between" alignItems="center" mb={4}>
          <Box>
            <Typography variant="h4" className="gradient-text" gutterBottom>
              💳 Payment Tracking & Reconciliation
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Track payments, receipts, and reconcile with bank transactions using AI
            </Typography>
          </Box>
          <Box display="flex" gap={2}>
            <Button
              variant="outlined"
              startIcon={<ImportIcon />}
              onClick={() => setImportDialogOpen(true)}
            >
              Import Bank Data
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
              size="large"
            >
              Record Payment
            </Button>
          </Box>
        </Box>

        {/* Summary Cards */}
        <Grid container spacing={3} mb={4}>
          <Grid item xs={12} sm={6} md={3}>
            <Card className="glass-card">
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="between">
                  <Box>
                    <Typography variant="h5" sx={{ color: '#00e676' }}>
                      ${paymentStats.totalReceipts.toLocaleString()}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Receipts
                    </Typography>
                  </Box>
                  <TrendingUpIcon sx={{ color: '#00e676', fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card className="glass-card">
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="between">
                  <Box>
                    <Typography variant="h5" sx={{ color: '#f44336' }}>
                      ${paymentStats.totalPayments.toLocaleString()}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Payments
                    </Typography>
                  </Box>
                  <TrendingDownIcon sx={{ color: '#f44336', fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card className="glass-card">
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="between">
                  <Box>
                    <Badge badgeContent={paymentStats.unreconciled} color="warning">
                      <ReconcileIcon sx={{ color: '#ff9800', fontSize: 40 }} />
                    </Badge>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Unreconciled
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card className="glass-card">
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="between">
                  <Box>
                    <Typography variant="h5" sx={{ color: '#ff9800' }}>
                      ${paymentStats.pendingAmount.toLocaleString()}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Pending Amount
                    </Typography>
                  </Box>
                  <PendingIcon sx={{ color: '#ff9800', fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* AI Reconciliation Suggestions */}
        {reconciliationSuggestions.length > 0 && (
          <Alert 
            severity="info" 
            sx={{ mb: 3 }}
            action={
              <Button 
                size="small" 
                startIcon={<AutoIcon />}
                onClick={handleBulkReconcile}
              >
                Auto-Reconcile
              </Button>
            }
          >
            <Typography variant="body2">
              <strong>AI Found {reconciliationSuggestions.length} Reconciliation Matches!</strong> 
              Review and approve automatic matching suggestions.
            </Typography>
          </Alert>
        )}

        {/* Payment Tabs */}
        <Card className="glass-card">
          <Tabs 
            value={activeTab} 
            onChange={(_, newValue) => setActiveTab(newValue)}
            sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
          >
            <Tab 
              label={`Receipts (${payments.filter(p => p.type === 'receipt').length})`}
              icon={<TrendingUpIcon />} 
              iconPosition="start"
            />
            <Tab 
              label={`Payments (${payments.filter(p => p.type === 'payment').length})`}
              icon={<TrendingDownIcon />} 
              iconPosition="start"
            />
            <Tab 
              label={`Bank Reconciliation`}
              icon={<ReconcileIcon />} 
              iconPosition="start"
            />
          </Tabs>

          <CardContent>
            {/* Receipts & Payments Tables */}
            <TabPanel value={activeTab} index={0}>
              {/* Filters */}
              <Grid container spacing={2} alignItems="center" mb={3}>
                <Grid item xs={12} sm={6} md={4}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Search payments"
                    value={filter.search}
                    onChange={(e) => setFilter({...filter, search: e.target.value})}
                    placeholder="Search by reference, description..."
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={filter.status}
                      onChange={(e) => setFilter({...filter, status: e.target.value})}
                    >
                      <MenuItem value="all">All Status</MenuItem>
                      <MenuItem value="completed">Completed</MenuItem>
                      <MenuItem value="pending">Pending</MenuItem>
                      <MenuItem value="failed">Failed</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Reconciled</InputLabel>
                    <Select
                      value={filter.reconciled}
                      onChange={(e) => setFilter({...filter, reconciled: e.target.value})}
                    >
                      <MenuItem value="all">All</MenuItem>
                      <MenuItem value="yes">Reconciled</MenuItem>
                      <MenuItem value="no">Unreconciled</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              <TableContainer component={Paper} sx={{ bgcolor: 'rgba(20, 27, 45, 0.5)' }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Reference</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell>Contact</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell align="right">Amount</TableCell>
                      <TableCell align="center">Method</TableCell>
                      <TableCell align="center">Status</TableCell>
                      <TableCell align="center">Reconciled</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredPayments.map((payment) => (
                      <TableRow key={payment.id} hover>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="body2" fontWeight="bold">
                              {payment.reference}
                            </Typography>
                            {payment.ai_matched && (
                              <Chip 
                                icon={<AutoIcon />} 
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
                            {new Date(payment.date).toLocaleDateString()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {payment.contact_name || 'N/A'}
                          </Typography>
                          {payment.invoice_number && (
                            <Typography variant="caption" color="text.secondary">
                              {payment.invoice_number}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {payment.description}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography 
                            variant="body2" 
                            fontWeight="bold"
                            color={payment.type === 'receipt' ? '#00e676' : '#f44336'}
                          >
                            {payment.type === 'receipt' ? '+' : '-'}${payment.amount.toLocaleString()}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
                            {getPaymentMethodIcon(payment.payment_method)}
                            <Typography variant="caption">
                              {paymentMethods.find(m => m.value === payment.payment_method)?.label}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          {getStatusChip(payment.status)}
                        </TableCell>
                        <TableCell align="center">
                          <Chip 
                            label={payment.reconciled ? 'Yes' : 'No'}
                            color={payment.reconciled ? 'success' : 'warning'}
                            size="small"
                            icon={payment.reconciled ? <CheckIcon /> : <PendingIcon />}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <IconButton 
                            size="small" 
                            onClick={() => handleOpenDialog(payment)}
                          >
                            <EditIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </TabPanel>

            <TabPanel value={activeTab} index={1}>
              {/* Same table as receipts but filtered for payments */}
              <TableContainer component={Paper} sx={{ bgcolor: 'rgba(20, 27, 45, 0.5)' }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Reference</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell>Contact</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell align="right">Amount</TableCell>
                      <TableCell align="center">Method</TableCell>
                      <TableCell align="center">Status</TableCell>
                      <TableCell align="center">Reconciled</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredPayments.map((payment) => (
                      <TableRow key={payment.id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight="bold">
                            {payment.reference}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {new Date(payment.date).toLocaleDateString()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {payment.contact_name || 'N/A'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {payment.description}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography 
                            variant="body2" 
                            fontWeight="bold"
                            color="#f44336"
                          >
                            -${payment.amount.toLocaleString()}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
                            {getPaymentMethodIcon(payment.payment_method)}
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          {getStatusChip(payment.status)}
                        </TableCell>
                        <TableCell align="center">
                          <Chip 
                            label={payment.reconciled ? 'Yes' : 'No'}
                            color={payment.reconciled ? 'success' : 'warning'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="center">
                          <IconButton 
                            size="small" 
                            onClick={() => handleOpenDialog(payment)}
                          >
                            <EditIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </TabPanel>

            {/* Bank Reconciliation Tab */}
            <TabPanel value={activeTab} index={2}>
              <Grid container spacing={3}>
                {/* AI Suggestions */}
                <Grid item xs={12} lg={6}>
                  <Typography variant="h6" className="gradient-text" gutterBottom>
                    🤖 AI Reconciliation Suggestions
                  </Typography>
                  
                  {reconciliationSuggestions.map((suggestion, index) => (
                    <Card key={index} sx={{ mb: 2, bgcolor: 'rgba(0, 245, 255, 0.05)' }}>
                      <CardContent>
                        <Box display="flex" justifyContent="between" alignItems="center" mb={2}>
                          <Typography variant="subtitle1">
                            AI Match Found
                          </Typography>
                          <Chip 
                            label={`${Math.round(suggestion.confidence_score * 100)}% Confidence`}
                            color="primary"
                            size="small"
                          />
                        </Box>
                        
                        <Box mb={2}>
                          <Typography variant="body2" color="text.secondary">Bank Transaction:</Typography>
                          <Typography variant="body2">
                            {suggestion.bank_transaction.description} - ${Math.abs(suggestion.bank_transaction.amount).toLocaleString()}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(suggestion.bank_transaction.date).toLocaleDateString()} • {suggestion.bank_transaction.reference}
                          </Typography>
                        </Box>
                        
                        <Box mb={2}>
                          <Typography variant="body2" color="text.secondary">Matched Payment:</Typography>
                          <Typography variant="body2">
                            {suggestion.suggested_payments[0].description} - ${suggestion.suggested_payments[0].amount.toLocaleString()}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {suggestion.suggested_payments[0].reference} • {suggestion.suggested_payments[0].contact_name}
                          </Typography>
                        </Box>
                        
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={<CheckIcon />}
                          onClick={() => handleReconcilePayment(
                            suggestion.suggested_payments[0].id,
                            suggestion.bank_transaction.id
                          )}
                        >
                          Approve Match
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                  
                  {reconciliationSuggestions.length === 0 && (
                    <Alert severity="info">
                      No reconciliation suggestions available. All transactions may already be reconciled.
                    </Alert>
                  )}
                </Grid>

                {/* Bank Transactions */}
                <Grid item xs={12} lg={6}>
                  <Typography variant="h6" className="gradient-text" gutterBottom>
                    🏦 Bank Transactions
                  </Typography>
                  
                  <TableContainer component={Paper} sx={{ bgcolor: 'rgba(20, 27, 45, 0.5)' }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Date</TableCell>
                          <TableCell>Description</TableCell>
                          <TableCell align="right">Amount</TableCell>
                          <TableCell align="center">Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {bankTransactions.map((transaction) => (
                          <TableRow key={transaction.id}>
                            <TableCell>
                              <Typography variant="body2">
                                {new Date(transaction.date).toLocaleDateString()}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {transaction.description}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {transaction.reference}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography 
                                variant="body2" 
                                fontWeight="bold"
                                color={transaction.amount > 0 ? '#00e676' : '#f44336'}
                              >
                                {transaction.amount > 0 ? '+' : ''}${Math.abs(transaction.amount).toLocaleString()}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Chip 
                                label={transaction.reconciled ? 'Matched' : 'Unmatched'}
                                color={transaction.reconciled ? 'success' : 'warning'}
                                size="small"
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Grid>
              </Grid>
            </TabPanel>
          </CardContent>
        </Card>

        {/* Floating Action Buttons */}
        <Fab
          color="primary"
          aria-label="record payment"
          onClick={() => handleOpenDialog()}
          sx={{ position: 'fixed', bottom: 80, right: 16 }}
        >
          <AddIcon />
        </Fab>
        
        <Fab
          color="secondary"
          aria-label="reconcile"
          onClick={() => setReconcileDialogOpen(true)}
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
        >
          <ReconcileIcon />
        </Fab>

        {/* Payment Form Dialog */}
        <Dialog 
          open={dialogOpen} 
          onClose={handleCloseDialog}
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
          <DialogTitle>
            {editingPayment ? 'Edit Payment' : 'Record New Payment'}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Type</InputLabel>
                  <Select
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value as 'payment' | 'receipt'})}
                  >
                    <MenuItem value="receipt">Receipt (Money In)</MenuItem>
                    <MenuItem value="payment">Payment (Money Out)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Reference"
                  value={formData.reference}
                  onChange={(e) => setFormData({...formData, reference: e.target.value})}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Amount"
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: parseFloat(e.target.value) || 0})}
                  inputProps={{ step: 0.01 }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Payment Method</InputLabel>
                  <Select
                    value={formData.payment_method}
                    onChange={(e) => setFormData({...formData, payment_method: e.target.value as any})}
                  >
                    {paymentMethods.map((method) => (
                      <MenuItem key={method.value} value={method.value}>
                        <Box display="flex" alignItems="center" gap={1}>
                          {method.icon}
                          {method.label}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Bank Reference"
                  value={formData.bank_reference}
                  onChange={(e) => setFormData({...formData, bank_reference: e.target.value})}
                  placeholder="Optional bank transaction reference"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Payment description"
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button 
              onClick={handleSavePayment}
              variant="contained"
              disabled={!formData.amount || !formData.description}
            >
              {editingPayment ? 'Update' : 'Record'} Payment
            </Button>
          </DialogActions>
        </Dialog>

        {/* Bank Import Dialog */}
        <Dialog 
          open={importDialogOpen} 
          onClose={() => setImportDialogOpen(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              bgcolor: 'rgba(20, 27, 45, 0.95)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.1)'
            }
          }}
        >
          <DialogTitle>Import Bank Data</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" paragraph>
              Upload your bank statement file (CSV, OFX, QIF formats supported) to automatically import transactions for reconciliation.
            </Typography>
            
            <TextField
              fullWidth
              type="file"
              onChange={(e) => {
                const file = (e.target as HTMLInputElement).files?.[0]
                setSelectedBankFile(file || null)
              }}
              inputProps={{
                accept: '.csv,.ofx,.qif'
              }}
              sx={{ mt: 2 }}
            />
            
            {selectedBankFile && (
              <Alert severity="info" sx={{ mt: 2 }}>
                Selected: {selectedBankFile.name} ({(selectedBankFile.size / 1024).toFixed(1)} KB)
              </Alert>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setImportDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleImportBankData}
              variant="contained"
              disabled={!selectedBankFile}
              startIcon={<ImportIcon />}
            >
              Import Data
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Layout>
  )
}