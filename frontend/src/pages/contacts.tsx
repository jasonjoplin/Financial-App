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
  Avatar,
  Tabs,
  Tab,
  Alert,
  LinearProgress,
  Fab,
  Box as MuiBox,
  Divider
} from '@mui/material'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  AccountBalance as BankIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Receipt as InvoiceIcon,
  Payment as PaymentIcon
} from '@mui/icons-material'
import { toast } from 'react-hot-toast'

interface Contact {
  id: string
  type: 'customer' | 'vendor'
  company_name?: string
  first_name?: string
  last_name?: string
  email: string
  phone?: string
  address?: string
  city?: string
  state?: string
  zip_code?: string
  country?: string
  tax_id?: string
  payment_terms?: string
  credit_limit?: number
  account_balance: number
  total_invoiced: number
  total_paid: number
  is_active: boolean
  created_at: string
  notes?: string
}

export default function ContactsPage() {
  const { token } = useAuth()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(0)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  
  const [formData, setFormData] = useState({
    type: 'customer' as 'customer' | 'vendor',
    company_name: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    country: 'United States',
    tax_id: '',
    payment_terms: '30',
    credit_limit: 0,
    notes: ''
  })

  const [filter, setFilter] = useState({
    search: '',
    type: 'all',
    status: 'all'
  })

  useEffect(() => {
    if (token) {
      fetchContacts()
    }
  }, [token])

  const fetchContacts = async () => {
    try {
      // Fetch real contacts from API
      const response = await fetch('http://localhost:3001/api/v1/contacts', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        setContacts(data.contacts || [])
      } else {
        // Start with empty contacts for new users
        setContacts([])
      }
    } catch (error) {
      toast.error('Failed to load contacts')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDialog = (contact?: Contact) => {
    if (contact) {
      setEditingContact(contact)
      setFormData({
        type: contact.type,
        company_name: contact.company_name || '',
        first_name: contact.first_name || '',
        last_name: contact.last_name || '',
        email: contact.email,
        phone: contact.phone || '',
        address: contact.address || '',
        city: contact.city || '',
        state: contact.state || '',
        zip_code: contact.zip_code || '',
        country: contact.country || 'United States',
        tax_id: contact.tax_id || '',
        payment_terms: contact.payment_terms || '30',
        credit_limit: contact.credit_limit || 0,
        notes: contact.notes || ''
      })
    } else {
      setEditingContact(null)
      setFormData({
        type: activeTab === 0 ? 'customer' : 'vendor',
        company_name: '',
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        state: '',
        zip_code: '',
        country: 'United States',
        tax_id: '',
        payment_terms: '30',
        credit_limit: 0,
        notes: ''
      })
    }
    setDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setEditingContact(null)
  }

  const handleSaveContact = async () => {
    try {
      // In real app, this would save to backend
      const newContact: Contact = {
        id: editingContact?.id || String(Date.now()),
        ...formData,
        account_balance: editingContact?.account_balance || 0,
        total_invoiced: editingContact?.total_invoiced || 0,
        total_paid: editingContact?.total_paid || 0,
        is_active: editingContact?.is_active ?? true,
        created_at: editingContact?.created_at || new Date().toISOString()
      }

      if (editingContact) {
        setContacts(prev => prev.map(c => c.id === editingContact.id ? newContact : c))
        toast.success('Contact updated!')
      } else {
        setContacts(prev => [newContact, ...prev])
        toast.success('Contact created!')
      }

      handleCloseDialog()
    } catch (error) {
      toast.error('Failed to save contact')
    }
  }

  const handleDeleteContact = async (id: string) => {
    if (!confirm('Are you sure you want to delete this contact?')) return

    try {
      setContacts(prev => prev.filter(c => c.id !== id))
      toast.success('Contact deleted!')
    } catch (error) {
      toast.error('Failed to delete contact')
    }
  }

  const getContactName = (contact: Contact) => {
    if (contact.company_name) {
      return contact.company_name
    }
    return `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 'Unnamed Contact'
  }

  const getContactInitials = (contact: Contact) => {
    if (contact.company_name) {
      return contact.company_name.substring(0, 2).toUpperCase()
    }
    const first = contact.first_name?.[0] || ''
    const last = contact.last_name?.[0] || ''
    return (first + last).toUpperCase() || 'UC'
  }

  const filteredContacts = contacts.filter(contact => {
    if (activeTab === 0 && contact.type !== 'customer') return false
    if (activeTab === 1 && contact.type !== 'vendor') return false
    
    if (filter.search) {
      const searchLower = filter.search.toLowerCase()
      const name = getContactName(contact).toLowerCase()
      const email = contact.email.toLowerCase()
      if (!name.includes(searchLower) && !email.includes(searchLower)) return false
    }
    
    if (filter.status === 'active' && !contact.is_active) return false
    if (filter.status === 'inactive' && contact.is_active) return false
    
    return true
  })

  const customers = contacts.filter(c => c.type === 'customer')
  const vendors = contacts.filter(c => c.type === 'vendor')
  
  const customerStats = {
    total: customers.length,
    totalReceivables: customers.reduce((sum, c) => sum + c.account_balance, 0),
    totalInvoiced: customers.reduce((sum, c) => sum + c.total_invoiced, 0)
  }
  
  const vendorStats = {
    total: vendors.length,
    totalPayables: vendors.reduce((sum, c) => sum + Math.abs(c.account_balance), 0),
    totalInvoiced: vendors.reduce((sum, c) => sum + c.total_invoiced, 0)
  }

  const TabPanel = ({ children, value, index }: { children: React.ReactNode, value: number, index: number }) => (
    <div hidden={value !== index}>
      {value === index && children}
    </div>
  )

  if (loading) {
    return (
      <Layout title="Contacts">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <LinearProgress sx={{ width: '50%', color: '#00f5ff' }} />
        </Box>
      </Layout>
    )
  }

  return (
    <Layout title="Customer & Vendor Management">
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Header */}
        <Box display="flex" justifyContent="between" alignItems="center" mb={4}>
          <Box>
            <Typography variant="h4" className="gradient-text" gutterBottom>
              👥 Customer & Vendor Management
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Manage your business relationships and track account balances
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            size="large"
          >
            Add Contact
          </Button>
        </Box>

        {/* Summary Cards */}
        <Grid container spacing={3} mb={4}>
          <Grid item xs={12} sm={6} md={3}>
            <Card className="glass-card">
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="between">
                  <Box>
                    <Typography variant="h5" className="neon-text">
                      {customerStats.total}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Customers
                    </Typography>
                  </Box>
                  <PersonIcon sx={{ color: '#00e676', fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card className="glass-card">
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="between">
                  <Box>
                    <Typography variant="h5" sx={{ color: '#00e676' }}>
                      ${customerStats.totalReceivables.toLocaleString()}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Accounts Receivable
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
                    <Typography variant="h5" className="neon-text">
                      {vendorStats.total}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Vendors
                    </Typography>
                  </Box>
                  <BusinessIcon sx={{ color: '#7c4dff', fontSize: 40 }} />
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
                      ${vendorStats.totalPayables.toLocaleString()}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Accounts Payable
                    </Typography>
                  </Box>
                  <TrendingDownIcon sx={{ color: '#ff9800', fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Contact Tabs */}
        <Card className="glass-card">
          <Tabs 
            value={activeTab} 
            onChange={(_, newValue) => setActiveTab(newValue)}
            sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
          >
            <Tab 
              label={`Customers (${customers.length})`}
              icon={<PersonIcon />} 
              iconPosition="start"
            />
            <Tab 
              label={`Vendors (${vendors.length})`}
              icon={<BusinessIcon />} 
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
                  label="Search contacts"
                  value={filter.search}
                  onChange={(e) => setFilter({...filter, search: e.target.value})}
                  placeholder="Search by name or email..."
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
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="inactive">Inactive</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            {/* Contacts Table */}
            <TableContainer component={Paper} sx={{ bgcolor: 'rgba(20, 27, 45, 0.5)' }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Contact</TableCell>
                    <TableCell>Contact Info</TableCell>
                    <TableCell>Location</TableCell>
                    <TableCell align="right">Balance</TableCell>
                    <TableCell align="right">Total Invoiced</TableCell>
                    <TableCell align="center">Status</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredContacts.map((contact) => (
                    <TableRow key={contact.id} hover>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={2}>
                          <Avatar 
                            sx={{ 
                              bgcolor: contact.type === 'customer' ? '#00e676' : '#7c4dff',
                              width: 40,
                              height: 40 
                            }}
                          >
                            {getContactInitials(contact)}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight="bold">
                              {getContactName(contact)}
                            </Typography>
                            <Chip 
                              label={contact.type.toUpperCase()} 
                              size="small"
                              color={contact.type === 'customer' ? 'success' : 'secondary'}
                              variant="outlined"
                            />
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Box display="flex" alignItems="center" gap={1} mb={1}>
                            <EmailIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                            <Typography variant="body2">{contact.email}</Typography>
                          </Box>
                          {contact.phone && (
                            <Box display="flex" alignItems="center" gap={1}>
                              <PhoneIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                              <Typography variant="body2">{contact.phone}</Typography>
                            </Box>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box>
                          {contact.city && contact.state && (
                            <Typography variant="body2">
                              {contact.city}, {contact.state}
                            </Typography>
                          )}
                          <Typography variant="caption" color="text.secondary">
                            {contact.country}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        <Typography 
                          variant="body2" 
                          fontWeight="bold"
                          color={contact.account_balance >= 0 ? '#00e676' : '#f44336'}
                        >
                          ${Math.abs(contact.account_balance).toLocaleString()}
                          {contact.account_balance < 0 && ' (Owed)'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">
                          ${contact.total_invoiced.toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip 
                          label={contact.is_active ? 'Active' : 'Inactive'}
                          color={contact.is_active ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <IconButton 
                          size="small" 
                          onClick={() => handleOpenDialog(contact)}
                          sx={{ mr: 1 }}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          onClick={() => handleDeleteContact(contact.id)}
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
          aria-label="add contact"
          onClick={() => handleOpenDialog()}
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
        >
          <AddIcon />
        </Fab>

        {/* Contact Form Dialog */}
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
            {editingContact ? 'Edit Contact' : 'Add New Contact'}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Type</InputLabel>
                  <Select
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value as 'customer' | 'vendor'})}
                  >
                    <MenuItem value="customer">Customer</MenuItem>
                    <MenuItem value="vendor">Vendor</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Company Name"
                  value={formData.company_name}
                  onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                  placeholder="Optional for individuals"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="First Name"
                  value={formData.first_name}
                  onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Last Name"
                  value={formData.last_name}
                  onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Address"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="City"
                  value={formData.city}
                  onChange={(e) => setFormData({...formData, city: e.target.value})}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="State"
                  value={formData.state}
                  onChange={(e) => setFormData({...formData, state: e.target.value})}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="ZIP Code"
                  value={formData.zip_code}
                  onChange={(e) => setFormData({...formData, zip_code: e.target.value})}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Payment Terms (Days)"
                  type="number"
                  value={formData.payment_terms}
                  onChange={(e) => setFormData({...formData, payment_terms: e.target.value})}
                />
              </Grid>
              {formData.type === 'customer' && (
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Credit Limit"
                    type="number"
                    value={formData.credit_limit}
                    onChange={(e) => setFormData({...formData, credit_limit: parseFloat(e.target.value) || 0})}
                  />
                </Grid>
              )}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Notes"
                  multiline
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Internal notes about this contact..."
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button 
              onClick={handleSaveContact}
              variant="contained"
              disabled={!formData.email}
            >
              {editingContact ? 'Update' : 'Create'} Contact
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Layout>
  )
}