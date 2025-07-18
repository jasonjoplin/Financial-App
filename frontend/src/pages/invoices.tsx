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
  Avatar,
  Stepper,
  Step,
  StepLabel
} from '@mui/material'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Receipt as InvoiceIcon,
  Description as BillIcon,
  Send as SendIcon,
  Payment as PaymentIcon,
  Download as DownloadIcon,
  Print as PrintIcon,
  Email as EmailIcon,
  CheckCircle as PaidIcon,
  Schedule as PendingIcon,
  Warning as OverdueIcon,
  SmartToy as AIIcon,
  AttachFile as AttachIcon
} from '@mui/icons-material'
import { toast } from 'react-hot-toast'

interface InvoiceItem {
  id: string
  description: string
  quantity: number
  rate: number
  amount: number
  account_code?: string
}

interface Invoice {
  id: string
  type: 'invoice' | 'bill'
  number: string
  contact_id: string
  contact_name: string
  contact_email?: string
  issue_date: string
  due_date: string
  subtotal: number
  tax_amount: number
  discount_amount: number
  total_amount: number
  amount_paid: number
  amount_due: number
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
  items: InvoiceItem[]
  notes?: string
  terms?: string
  created_at: string
  ai_generated?: boolean
}

export default function InvoicesPage() {
  const { token, user } = useAuth()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [contacts, setContacts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(0)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null)
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null)
  const [currentStep, setCurrentStep] = useState(0)
  
  const [formData, setFormData] = useState({
    type: 'invoice' as 'invoice' | 'bill',
    contact_id: '',
    issue_date: new Date().toISOString().split('T')[0],
    due_date: '',
    notes: '',
    terms: 'Payment due within 30 days',
    tax_rate: 8.5,
    discount_amount: 0,
    items: [
      { id: '1', description: '', quantity: 1, rate: 0, amount: 0 }
    ] as InvoiceItem[]
  })

  const [filter, setFilter] = useState({
    search: '',
    status: 'all',
    dateFrom: '',
    dateTo: ''
  })

  const steps = ['Basic Info', 'Line Items', 'Review & Send']

  useEffect(() => {
    if (token) {
      fetchInvoices()
      fetchContacts()
    }
  }, [token])

  const fetchInvoices = async () => {
    try {
      // Fetch real invoices from API
      const response = await fetch('http://localhost:3001/api/v1/invoices', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        setInvoices(data.invoices || [])
      } else {
        // Start with empty invoices for new users
        setInvoices([])
      }
    } catch (error) {
      toast.error('Failed to load invoices')
    } finally {
      setLoading(false)
    }
  }

  const fetchContacts = async () => {
    try {
      // Mock contacts data
      const mockContacts = [
        { id: '1', name: 'Acme Corporation', email: 'billing@acme.com', type: 'customer' },
        { id: '2', name: 'Office Supplies Inc', email: 'billing@officesupplies.com', type: 'vendor' },
        { id: '3', name: 'Sarah Johnson', email: 'sarah.johnson@email.com', type: 'customer' }
      ]
      setContacts(mockContacts)
    } catch (error) {
      console.error('Failed to fetch contacts:', error)
    }
  }

  const handleOpenDialog = (invoice?: Invoice) => {
    if (invoice) {
      setEditingInvoice(invoice)
      setFormData({
        type: invoice.type,
        contact_id: invoice.contact_id,
        issue_date: invoice.issue_date,
        due_date: invoice.due_date,
        notes: invoice.notes || '',
        terms: invoice.terms || 'Payment due within 30 days',
        tax_rate: (invoice.tax_amount / invoice.subtotal) * 100,
        discount_amount: invoice.discount_amount,
        items: [...invoice.items]
      })
    } else {
      setEditingInvoice(null)
      setFormData({
        type: activeTab === 0 ? 'invoice' : 'bill',
        contact_id: '',
        issue_date: new Date().toISOString().split('T')[0],
        due_date: '',
        notes: '',
        terms: 'Payment due within 30 days',
        tax_rate: 8.5,
        discount_amount: 0,
        items: [{ id: '1', description: '', quantity: 1, rate: 0, amount: 0 }]
      })
    }
    setCurrentStep(0)
    setDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setEditingInvoice(null)
    setCurrentStep(0)
  }

  const handleNextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const addItem = () => {
    const newItem: InvoiceItem = {
      id: String(Date.now()),
      description: '',
      quantity: 1,
      rate: 0,
      amount: 0
    }
    setFormData({
      ...formData,
      items: [...formData.items, newItem]
    })
  }

  const removeItem = (index: number) => {
    if (formData.items.length > 1) {
      const newItems = formData.items.filter((_, i) => i !== index)
      setFormData({ ...formData, items: newItems })
    }
  }

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...formData.items]
    newItems[index] = { ...newItems[index], [field]: value }
    
    // Recalculate amount when quantity or rate changes
    if (field === 'quantity' || field === 'rate') {
      newItems[index].amount = newItems[index].quantity * newItems[index].rate
    }
    
    setFormData({ ...formData, items: newItems })
  }

  const calculateTotals = () => {
    const subtotal = formData.items.reduce((sum, item) => sum + item.amount, 0)
    const taxAmount = (subtotal * formData.tax_rate) / 100
    const total = subtotal + taxAmount - formData.discount_amount
    
    return { subtotal, taxAmount, total }
  }

  const handleSaveInvoice = async () => {
    try {
      const { subtotal, taxAmount, total } = calculateTotals()
      const selectedContact = contacts.find(c => c.id === formData.contact_id)
      
      const newInvoice: Invoice = {
        id: editingInvoice?.id || String(Date.now()),
        type: formData.type,
        number: editingInvoice?.number || `${formData.type.toUpperCase()}-${String(invoices.length + 1).padStart(3, '0')}`,
        contact_id: formData.contact_id,
        contact_name: selectedContact?.name || 'Unknown Contact',
        contact_email: selectedContact?.email,
        issue_date: formData.issue_date,
        due_date: formData.due_date,
        subtotal,
        tax_amount: taxAmount,
        discount_amount: formData.discount_amount,
        total_amount: total,
        amount_paid: editingInvoice?.amount_paid || 0,
        amount_due: total - (editingInvoice?.amount_paid || 0),
        status: editingInvoice?.status || 'draft',
        items: formData.items,
        notes: formData.notes,
        terms: formData.terms,
        created_at: editingInvoice?.created_at || new Date().toISOString()
      }

      if (editingInvoice) {
        setInvoices(prev => prev.map(i => i.id === editingInvoice.id ? newInvoice : i))
        toast.success('Invoice updated!')
      } else {
        setInvoices(prev => [newInvoice, ...prev])
        toast.success('Invoice created!')
      }

      handleCloseDialog()
    } catch (error) {
      toast.error('Failed to save invoice')
    }
  }

  const handleSendInvoice = (invoice: Invoice) => {
    // In real app, this would send email
    setInvoices(prev => prev.map(i => 
      i.id === invoice.id ? { ...i, status: 'sent' as const } : i
    ))
    toast.success('Invoice sent!')
  }

  const handleMarkPaid = (invoice: Invoice) => {
    setInvoices(prev => prev.map(i => 
      i.id === invoice.id ? { 
        ...i, 
        status: 'paid' as const,
        amount_paid: i.total_amount,
        amount_due: 0
      } : i
    ))
    toast.success('Marked as paid!')
  }

  const getStatusChip = (status: string) => {
    const statusConfig = {
      draft: { color: 'default' as const, icon: <EditIcon /> },
      sent: { color: 'info' as const, icon: <SendIcon /> },
      paid: { color: 'success' as const, icon: <PaidIcon /> },
      overdue: { color: 'error' as const, icon: <OverdueIcon /> },
      cancelled: { color: 'error' as const, icon: <DeleteIcon /> }
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

  const filteredInvoices = invoices.filter(invoice => {
    if (activeTab === 0 && invoice.type !== 'invoice') return false
    if (activeTab === 1 && invoice.type !== 'bill') return false
    
    if (filter.search) {
      const searchLower = filter.search.toLowerCase()
      if (!invoice.number.toLowerCase().includes(searchLower) && 
          !invoice.contact_name.toLowerCase().includes(searchLower)) return false
    }
    
    if (filter.status !== 'all' && invoice.status !== filter.status) return false
    
    return true
  })

  const invoiceStats = {
    total: invoices.filter(i => i.type === 'invoice').length,
    totalAmount: invoices.filter(i => i.type === 'invoice').reduce((sum, i) => sum + i.total_amount, 0),
    totalDue: invoices.filter(i => i.type === 'invoice').reduce((sum, i) => sum + i.amount_due, 0),
    overdue: invoices.filter(i => i.type === 'invoice' && i.status === 'overdue').length
  }

  const billStats = {
    total: invoices.filter(i => i.type === 'bill').length,
    totalAmount: invoices.filter(i => i.type === 'bill').reduce((sum, i) => sum + i.total_amount, 0),
    totalDue: invoices.filter(i => i.type === 'bill').reduce((sum, i) => sum + i.amount_due, 0)
  }

  const TabPanel = ({ children, value, index }: { children: React.ReactNode, value: number, index: number }) => (
    <div hidden={value !== index}>
      {value === index && children}
    </div>
  )

  if (loading) {
    return (
      <Layout title="Invoices & Bills">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <LinearProgress sx={{ width: '50%', color: '#00f5ff' }} />
        </Box>
      </Layout>
    )
  }

  const { subtotal, taxAmount, total } = calculateTotals()

  return (
    <Layout title="Invoice & Bill Management">
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Header */}
        <Box display="flex" justifyContent="between" alignItems="center" mb={4}>
          <Box>
            <Typography variant="h4" className="gradient-text" gutterBottom>
              📄 Invoice & Bill Management
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Create, manage, and track invoices and bills with AI assistance
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            size="large"
          >
            Create New
          </Button>
        </Box>

        {/* Summary Cards */}
        <Grid container spacing={3} mb={4}>
          <Grid item xs={12} sm={6} md={3}>
            <Card className="glass-card">
              <CardContent>
                <Typography variant="h5" className="neon-text">
                  {invoiceStats.total}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Invoices
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card className="glass-card">
              <CardContent>
                <Typography variant="h5" sx={{ color: '#00e676' }}>
                  ${invoiceStats.totalDue.toLocaleString()}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Outstanding Invoices
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card className="glass-card">
              <CardContent>
                <Typography variant="h5" className="neon-text">
                  {billStats.total}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Bills
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card className="glass-card">
              <CardContent>
                <Typography variant="h5" sx={{ color: '#ff9800' }}>
                  ${billStats.totalDue.toLocaleString()}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Outstanding Bills
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Invoice/Bill Tabs */}
        <Card className="glass-card">
          <Tabs 
            value={activeTab} 
            onChange={(_, newValue) => setActiveTab(newValue)}
            sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
          >
            <Tab 
              label={`Invoices (${invoices.filter(i => i.type === 'invoice').length})`}
              icon={<InvoiceIcon />} 
              iconPosition="start"
            />
            <Tab 
              label={`Bills (${invoices.filter(i => i.type === 'bill').length})`}
              icon={<BillIcon />} 
              iconPosition="start"
            />
          </Tabs>

          <CardContent>
            {/* Filters */}
            <Grid container spacing={2} alignItems="center" mb={3}>
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  fullWidth
                  size="small"
                  label="Search invoices"
                  value={filter.search}
                  onChange={(e) => setFilter({...filter, search: e.target.value})}
                  placeholder="Search by number or contact..."
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
                    <MenuItem value="draft">Draft</MenuItem>
                    <MenuItem value="sent">Sent</MenuItem>
                    <MenuItem value="paid">Paid</MenuItem>
                    <MenuItem value="overdue">Overdue</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            {/* Invoices/Bills Table */}
            <TableContainer component={Paper} sx={{ bgcolor: 'rgba(20, 27, 45, 0.5)' }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Number</TableCell>
                    <TableCell>Contact</TableCell>
                    <TableCell>Issue Date</TableCell>
                    <TableCell>Due Date</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell align="right">Amount Due</TableCell>
                    <TableCell align="center">Status</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredInvoices.map((invoice) => (
                    <TableRow key={invoice.id} hover>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="body2" fontWeight="bold">
                            {invoice.number}
                          </Typography>
                          {invoice.ai_generated && (
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
                        <Box>
                          <Typography variant="body2" fontWeight="bold">
                            {invoice.contact_name}
                          </Typography>
                          {invoice.contact_email && (
                            <Typography variant="caption" color="text.secondary">
                              {invoice.contact_email}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(invoice.issue_date).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(invoice.due_date).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="bold">
                          ${invoice.total_amount.toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography 
                          variant="body2" 
                          fontWeight="bold"
                          color={invoice.amount_due > 0 ? '#ff9800' : '#00e676'}
                        >
                          ${invoice.amount_due.toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        {getStatusChip(invoice.status)}
                      </TableCell>
                      <TableCell align="center">
                        <IconButton 
                          size="small" 
                          onClick={() => setViewingInvoice(invoice)}
                          sx={{ mr: 1 }}
                        >
                          <ViewIcon />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          onClick={() => handleOpenDialog(invoice)}
                          sx={{ mr: 1 }}
                        >
                          <EditIcon />
                        </IconButton>
                        {invoice.status === 'draft' && (
                          <IconButton 
                            size="small" 
                            onClick={() => handleSendInvoice(invoice)}
                            sx={{ mr: 1 }}
                            color="primary"
                          >
                            <SendIcon />
                          </IconButton>
                        )}
                        {invoice.status === 'sent' && invoice.amount_due > 0 && (
                          <IconButton 
                            size="small" 
                            onClick={() => handleMarkPaid(invoice)}
                            sx={{ mr: 1 }}
                            color="success"
                          >
                            <PaymentIcon />
                          </IconButton>
                        )}
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
          aria-label="create invoice"
          onClick={() => handleOpenDialog()}
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
        >
          <AddIcon />
        </Fab>

        {/* Create/Edit Invoice Dialog */}
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
            <Box display="flex" justifyContent="between" alignItems="center">
              <Typography variant="h6">
                {editingInvoice ? 'Edit' : 'Create'} {formData.type === 'invoice' ? 'Invoice' : 'Bill'}
              </Typography>
              <Stepper activeStep={currentStep} alternativeLabel>
                {steps.map((label) => (
                  <Step key={label}>
                    <StepLabel>{label}</StepLabel>
                  </Step>
                ))}
              </Stepper>
            </Box>
          </DialogTitle>
          <DialogContent>
            {/* Step 1: Basic Info */}
            {currentStep === 0 && (
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Type</InputLabel>
                    <Select
                      value={formData.type}
                      onChange={(e) => setFormData({...formData, type: e.target.value as 'invoice' | 'bill'})}
                    >
                      <MenuItem value="invoice">Invoice (Customer)</MenuItem>
                      <MenuItem value="bill">Bill (Vendor)</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Autocomplete
                    options={contacts.filter(c => 
                      formData.type === 'invoice' ? c.type === 'customer' : c.type === 'vendor'
                    )}
                    getOptionLabel={(option) => option.name}
                    value={contacts.find(c => c.id === formData.contact_id) || null}
                    onChange={(_, value) => setFormData({...formData, contact_id: value?.id || ''})}
                    renderInput={(params) => (
                      <TextField {...params} label="Contact" fullWidth required />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Issue Date"
                    type="date"
                    value={formData.issue_date}
                    onChange={(e) => setFormData({...formData, issue_date: e.target.value})}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Due Date"
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                    InputLabelProps={{ shrink: true }}
                    required
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Terms & Conditions"
                    multiline
                    rows={2}
                    value={formData.terms}
                    onChange={(e) => setFormData({...formData, terms: e.target.value})}
                  />
                </Grid>
              </Grid>
            )}

            {/* Step 2: Line Items */}
            {currentStep === 1 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Line Items
                </Typography>
                
                {formData.items.map((item, index) => (
                  <Card key={item.id} sx={{ mb: 2, bgcolor: 'rgba(255,255,255,0.05)' }}>
                    <CardContent>
                      <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={4}>
                          <TextField
                            fullWidth
                            label="Description"
                            value={item.description}
                            onChange={(e) => updateItem(index, 'description', e.target.value)}
                            placeholder="Item description"
                          />
                        </Grid>
                        <Grid item xs={12} sm={2}>
                          <TextField
                            fullWidth
                            label="Quantity"
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                          />
                        </Grid>
                        <Grid item xs={12} sm={2}>
                          <TextField
                            fullWidth
                            label="Rate"
                            type="number"
                            value={item.rate}
                            onChange={(e) => updateItem(index, 'rate', parseFloat(e.target.value) || 0)}
                            inputProps={{ step: 0.01 }}
                          />
                        </Grid>
                        <Grid item xs={12} sm={2}>
                          <TextField
                            fullWidth
                            label="Amount"
                            value={item.amount.toFixed(2)}
                            disabled
                          />
                        </Grid>
                        <Grid item xs={12} sm={2}>
                          <IconButton 
                            onClick={() => removeItem(index)}
                            disabled={formData.items.length <= 1}
                            color="error"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                ))}

                <Button onClick={addItem} startIcon={<AddIcon />} sx={{ mb: 3 }}>
                  Add Item
                </Button>

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Tax Rate (%)"
                      type="number"
                      value={formData.tax_rate}
                      onChange={(e) => setFormData({...formData, tax_rate: parseFloat(e.target.value) || 0})}
                      inputProps={{ step: 0.1 }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Discount Amount"
                      type="number"
                      value={formData.discount_amount}
                      onChange={(e) => setFormData({...formData, discount_amount: parseFloat(e.target.value) || 0})}
                      inputProps={{ step: 0.01 }}
                    />
                  </Grid>
                </Grid>
              </Box>
            )}

            {/* Step 3: Review */}
            {currentStep === 2 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Review & Summary
                </Typography>
                
                <Grid container spacing={3}>
                  <Grid item xs={12} md={8}>
                    <Card sx={{ bgcolor: 'rgba(255,255,255,0.05)' }}>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          Items
                        </Typography>
                        {formData.items.map((item, index) => (
                          <Box key={item.id} display="flex" justifyContent="between" py={1}>
                            <Box>
                              <Typography variant="body2">{item.description}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {item.quantity} × ${item.rate}
                              </Typography>
                            </Box>
                            <Typography variant="body2" fontWeight="bold">
                              ${item.amount.toFixed(2)}
                            </Typography>
                          </Box>
                        ))}
                      </CardContent>
                    </Card>
                  </Grid>
                  
                  <Grid item xs={12} md={4}>
                    <Card sx={{ bgcolor: 'rgba(0, 245, 255, 0.05)' }}>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          Total Summary
                        </Typography>
                        <Box display="flex" justifyContent="between" py={1}>
                          <Typography>Subtotal:</Typography>
                          <Typography>${subtotal.toFixed(2)}</Typography>
                        </Box>
                        <Box display="flex" justifyContent="between" py={1}>
                          <Typography>Tax ({formData.tax_rate}%):</Typography>
                          <Typography>${taxAmount.toFixed(2)}</Typography>
                        </Box>
                        {formData.discount_amount > 0 && (
                          <Box display="flex" justifyContent="between" py={1}>
                            <Typography>Discount:</Typography>
                            <Typography>-${formData.discount_amount.toFixed(2)}</Typography>
                          </Box>
                        )}
                        <Divider sx={{ my: 1 }} />
                        <Box display="flex" justifyContent="between" py={1}>
                          <Typography variant="h6">Total:</Typography>
                          <Typography variant="h6" className="neon-text">
                            ${total.toFixed(2)}
                          </Typography>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>

                <TextField
                  fullWidth
                  label="Notes"
                  multiline
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Additional notes for this invoice..."
                  sx={{ mt: 2 }}
                />
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            {currentStep > 0 && (
              <Button onClick={handlePrevStep}>Previous</Button>
            )}
            {currentStep < steps.length - 1 ? (
              <Button 
                onClick={handleNextStep}
                variant="contained"
                disabled={currentStep === 0 && (!formData.contact_id || !formData.due_date)}
              >
                Next
              </Button>
            ) : (
              <Button 
                onClick={handleSaveInvoice}
                variant="contained"
              >
                {editingInvoice ? 'Update' : 'Create'} {formData.type === 'invoice' ? 'Invoice' : 'Bill'}
              </Button>
            )}
          </DialogActions>
        </Dialog>

        {/* View Invoice Dialog */}
        <Dialog 
          open={!!viewingInvoice} 
          onClose={() => setViewingInvoice(null)}
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
          {viewingInvoice && (
            <>
              <DialogTitle>
                <Box display="flex" justifyContent="between" alignItems="center">
                  <Typography variant="h6">
                    {viewingInvoice.type === 'invoice' ? 'Invoice' : 'Bill'}: {viewingInvoice.number}
                  </Typography>
                  <Box display="flex" gap={1}>
                    {getStatusChip(viewingInvoice.status)}
                  </Box>
                </Box>
              </DialogTitle>
              <DialogContent>
                {/* Invoice Preview Content */}
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      {viewingInvoice.type === 'invoice' ? 'Bill To:' : 'From:'}
                    </Typography>
                    <Typography variant="body1" fontWeight="bold">
                      {viewingInvoice.contact_name}
                    </Typography>
                    {viewingInvoice.contact_email && (
                      <Typography variant="body2">
                        {viewingInvoice.contact_email}
                      </Typography>
                    )}
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">Issue Date:</Typography>
                    <Typography variant="body1">{new Date(viewingInvoice.issue_date).toLocaleDateString()}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Due Date:</Typography>
                    <Typography variant="body1">{new Date(viewingInvoice.due_date).toLocaleDateString()}</Typography>
                  </Grid>
                </Grid>

                <Divider sx={{ my: 3 }} />

                <TableContainer component={Paper} sx={{ bgcolor: 'rgba(255,255,255,0.05)', mb: 3 }}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Description</TableCell>
                        <TableCell align="right">Qty</TableCell>
                        <TableCell align="right">Rate</TableCell>
                        <TableCell align="right">Amount</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {viewingInvoice.items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.description}</TableCell>
                          <TableCell align="right">{item.quantity}</TableCell>
                          <TableCell align="right">${item.rate.toFixed(2)}</TableCell>
                          <TableCell align="right">${item.amount.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                <Grid container justifyContent="flex-end">
                  <Grid item xs={12} sm={6} md={4}>
                    <Box display="flex" justifyContent="between" py={1}>
                      <Typography>Subtotal:</Typography>
                      <Typography>${viewingInvoice.subtotal.toFixed(2)}</Typography>
                    </Box>
                    <Box display="flex" justifyContent="between" py={1}>
                      <Typography>Tax:</Typography>
                      <Typography>${viewingInvoice.tax_amount.toFixed(2)}</Typography>
                    </Box>
                    {viewingInvoice.discount_amount > 0 && (
                      <Box display="flex" justifyContent="between" py={1}>
                        <Typography>Discount:</Typography>
                        <Typography>-${viewingInvoice.discount_amount.toFixed(2)}</Typography>
                      </Box>
                    )}
                    <Divider sx={{ my: 1 }} />
                    <Box display="flex" justifyContent="between" py={1}>
                      <Typography variant="h6">Total:</Typography>
                      <Typography variant="h6" className="neon-text">
                        ${viewingInvoice.total_amount.toFixed(2)}
                      </Typography>
                    </Box>
                    <Box display="flex" justifyContent="between" py={1}>
                      <Typography fontWeight="bold">Amount Due:</Typography>
                      <Typography fontWeight="bold" color={viewingInvoice.amount_due > 0 ? '#ff9800' : '#00e676'}>
                        ${viewingInvoice.amount_due.toFixed(2)}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>

                {viewingInvoice.notes && (
                  <Box mt={3}>
                    <Typography variant="body2" color="text.secondary">Notes:</Typography>
                    <Typography variant="body1">{viewingInvoice.notes}</Typography>
                  </Box>
                )}
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setViewingInvoice(null)}>Close</Button>
                <Button startIcon={<PrintIcon />} variant="outlined">
                  Print
                </Button>
                <Button startIcon={<DownloadIcon />} variant="outlined">
                  Download PDF
                </Button>
                {viewingInvoice.status === 'draft' && (
                  <Button 
                    startIcon={<SendIcon />} 
                    variant="contained"
                    onClick={() => {
                      handleSendInvoice(viewingInvoice)
                      setViewingInvoice(null)
                    }}
                  >
                    Send
                  </Button>
                )}
              </DialogActions>
            </>
          )}
        </Dialog>
      </Container>
    </Layout>
  )
}